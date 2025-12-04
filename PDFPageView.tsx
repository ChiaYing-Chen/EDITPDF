import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface PDFPageViewProps {
    pdfBlob: Blob;
    pageIndex: number; // 1-based index
    scale: number;
    rotation: number;
    className?: string;
    onLoadSuccess?: (width: number, height: number) => void;
}

const PDFPageView: React.FC<PDFPageViewProps> = ({ pdfBlob, pageIndex, scale, rotation, className, onLoadSuccess }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const renderPage = async () => {
            if (!canvasRef.current || !pdfBlob) return;
            setLoading(true);
            setError(null);

            try {
                const arrayBuffer = await pdfBlob.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(pageIndex);

                // Handle High DPI
                const pixelRatio = window.devicePixelRatio || 1;
                const viewport = page.getViewport({ scale: scale, rotation: rotation });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.width = Math.floor(viewport.width * pixelRatio);
                    canvas.height = Math.floor(viewport.height * pixelRatio);
                    canvas.style.width = `${viewport.width}px`;
                    canvas.style.height = `${viewport.height}px`;

                    context.scale(pixelRatio, pixelRatio);

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };
                    await page.render(renderContext).promise;

                    // Render Text Layer
                    if (textLayerRef.current) {
                        const textContent = await page.getTextContent();
                        textLayerRef.current.innerHTML = '';
                        textLayerRef.current.style.width = `${viewport.width}px`;
                        textLayerRef.current.style.height = `${viewport.height}px`;

                        // Assign the custom style property for --scale-factor if needed by newer pdf.js, 
                        // but usually viewport handles it.
                        textLayerRef.current.style.setProperty('--scale-factor', `${scale}`);

                        // Use any cast because renderTextLayer might not be in the types depending on version
                        await (pdfjsLib as any).renderTextLayer({
                            textContentSource: textContent,
                            container: textLayerRef.current,
                            viewport: viewport,
                            textDivs: []
                        }).promise;
                    }

                    if (isMounted && onLoadSuccess) {
                        onLoadSuccess(viewport.width, viewport.height);
                    }
                }
            } catch (err) {
                console.error("Error rendering PDF page:", err);
                if (isMounted) setError("無法載入頁面");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        renderPage();

        return () => {
            isMounted = false;
        };
    }, [pdfBlob, pageIndex, scale, rotation]);

    return (
        <div className={`relative ${className || ''}`} style={{ width: 'fit-content', height: 'fit-content' }}>
            <style>{`
                .textLayer {
                    position: absolute;
                    left: 0;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    overflow: hidden;
                    opacity: 0.2;
                    line-height: 1.0;
                    pointer-events: none; /* Allow clicks to pass through to canvas/editor */
                }
                .textLayer > span {
                    color: transparent;
                    position: absolute;
                    white-space: pre;
                    cursor: text;
                    transform-origin: 0% 0%;
                    pointer-events: auto; /* Re-enable pointer events for text selection */
                }
                .textLayer ::selection {
                    background: rgba(0, 0, 255, 0.3);
                }
            `}</style>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/10 backdrop-blur-[1px] z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 text-red-500 text-xs p-2 text-center">
                    {error}
                </div>
            )}
            <canvas ref={canvasRef} className="block" />
            <div ref={textLayerRef} className="textLayer" />
        </div>
    );
};

export default PDFPageView;
