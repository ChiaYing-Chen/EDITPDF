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

                // We always render at scale 1.0 * provided scale, but rotation is handled by viewport
                const viewport = page.getViewport({ scale: scale, rotation: rotation });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };
                    await page.render(renderContext).promise;

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
        </div>
    );
};

export default PDFPageView;
