import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface PDFPageViewProps {
    pdfBlob: Blob;
    pageIndex: number; // 1-based index
    scale?: number;
    targetHeight?: number; // New prop for fixed height scaling
    rotation: number;
    className?: string;
    onLoadSuccess?: (width: number, height: number) => void;
}

const PDFPageView: React.FC<PDFPageViewProps> = ({ pdfBlob, pageIndex, scale = 1, targetHeight, rotation, className, onLoadSuccess }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null); // Store render task for cancellation
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const renderPage = async () => {
            if (!canvasRef.current || !pdfBlob) return;

            // Cancel any existing render task
            if (renderTaskRef.current) {
                try {
                    await renderTaskRef.current.cancel();
                } catch (ignore) {
                    // Cancellation might throw, which is expected
                }
                renderTaskRef.current = null;
            }

            setLoading(true);
            setError(null);

            try {
                const arrayBuffer = await pdfBlob.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(pageIndex);

                if (!isMounted) return;

                // Handle High DPI
                const pixelRatio = window.devicePixelRatio || 1;

                // Calculate scale if targetHeight is provided
                let finalScale = scale;
                if (targetHeight) {
                    // Get unscaled viewport first to determine ratio
                    const unscaledViewport = page.getViewport({ scale: 1, rotation: rotation });
                    finalScale = targetHeight / unscaledViewport.height;
                }

                const viewport = page.getViewport({ scale: finalScale, rotation: rotation });

                const canvas = canvasRef.current;
                if (!canvas) return;
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

                    // Store the render task
                    const renderTask = page.render(renderContext);
                    renderTaskRef.current = renderTask;

                    await renderTask.promise;
                    renderTaskRef.current = null; // Clear task after completion

                    if (!isMounted) return;

                    // Render Text Layer
                    if (textLayerRef.current) {
                        const textContent = await page.getTextContent();
                        if (!isMounted) return;

                        if (textContent.items.length === 0) {
                            console.log("No text content found for page", pageIndex);
                        } else {
                            textLayerRef.current.innerHTML = '';
                            textLayerRef.current.style.width = `${viewport.width}px`;
                            textLayerRef.current.style.height = `${viewport.height}px`;
                            textLayerRef.current.style.setProperty('--scale-factor', `${scale}`);

                            try {
                                // Use new TextLayer API for pdfjs-dist v4+
                                const TextLayer = (pdfjsLib as any).TextLayer;
                                if (TextLayer) {
                                    const textLayer = new TextLayer({
                                        textContentSource: textContent,
                                        container: textLayerRef.current,
                                        viewport: viewport,
                                    });
                                    await textLayer.render();
                                    console.log("Text layer rendered using TextLayer API for page", pageIndex);
                                } else {
                                    // Fallback for older versions or if TextLayer is not found on main export
                                    await (pdfjsLib as any).renderTextLayer({
                                        textContentSource: textContent,
                                        container: textLayerRef.current,
                                        viewport: viewport,
                                        textDivs: []
                                    }).promise;
                                    console.log("Text layer rendered using renderTextLayer (fallback) for page", pageIndex);
                                }
                            } catch (textLayerErr) {
                                console.warn("Text layer rendering warning:", textLayerErr);
                            }
                        }
                    }

                    if (isMounted && onLoadSuccess) {
                        onLoadSuccess(viewport.width, viewport.height);
                    }
                }
            } catch (err: any) {
                if (err?.name === 'RenderingCancelledException') {
                    // Expected error when cancelled, do nothing
                    console.log('Rendering cancelled');
                } else {
                    console.error("Error rendering PDF page:", err);
                    if (isMounted) setError("無法載入頁面");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        renderPage();

        return () => {
            isMounted = false;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
        };
    }, [pdfBlob, pageIndex, scale, targetHeight, rotation]);

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
                    line-height: 1.0;
                    pointer-events: none; /* Allow clicks to pass through to canvas/editor */
                    z-index: 50;
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
