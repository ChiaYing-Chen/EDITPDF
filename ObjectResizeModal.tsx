import React, { useRef, useEffect, useState } from 'react';
import { EditorObject } from './types';

interface ObjectResizeModalProps {
    isOpen: boolean;
    object: EditorObject | null;
    onClose: () => void;
    onConfirm: (scale: number) => void;
}

const ObjectResizeModal: React.FC<ObjectResizeModalProps> = ({ isOpen, object, onClose, onConfirm }) => {
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const touchState = useRef<{ startDist: number; startScale: number }>({ startDist: 0, startScale: 1 });

    useEffect(() => {
        if (isOpen) {
            setScale(1);
        }
    }, [isOpen]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !object) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw preview
        const drawPreview = () => {
            const width = containerRef.current?.clientWidth || 300;
            const height = containerRef.current?.clientHeight || 300;
            canvas.width = width;
            canvas.height = height;

            ctx.clearRect(0, 0, width, height);
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);

            // Draw object representation
            const objW = object.width || (object.ep.x - object.sp.x) || 100;
            const objH = object.height || (object.ep.y - object.sp.y) || 100;

            // Normalize size for preview to fit reasonably
            const baseSize = 150;
            const aspect = Math.abs(objW / objH);
            let drawW, drawH;

            if (aspect > 1) {
                drawW = baseSize;
                drawH = baseSize / aspect;
            } else {
                drawH = baseSize;
                drawW = baseSize * aspect;
            }

            const x = -drawW / 2;
            const y = -drawH / 2;

            if (object.type === 'text' && object.text) {
                ctx.fillStyle = object.color || 'black';
                ctx.font = `${20}px ${object.fontFamily || 'sans-serif'}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (object.backgroundColor) {
                    ctx.fillStyle = object.backgroundColor;
                    ctx.globalAlpha = object.backgroundOpacity ?? 1;
                    ctx.fillRect(x, y, drawW, drawH);
                    ctx.globalAlpha = 1;
                }
                ctx.fillStyle = object.color || 'black';
                ctx.fillText(object.text, 0, 0);
            } else if (object.imageData) {
                // Creating image every frame is bad, but for simple preview it might allow if we don't have the image ready?
                // Ideally we pass the loaded image. unique ID matching etc.
                // For now, let's just draw a placeholder box
                ctx.strokeStyle = object.color || 'blue';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, drawW, drawH);
                ctx.fillStyle = 'rgba(0,0,255,0.1)';
                ctx.fillRect(x, y, drawW, drawH);
                // If we could access the blob URL, we would draw it. 
            } else {
                ctx.strokeStyle = object.color || 'black';
                ctx.lineWidth = object.strokeWidth || 2;
                if (object.type === 'circle') {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, drawW / 2, drawH / 2, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(x, y, drawW, drawH);
                }
            }

            ctx.restore();

            // Draw scale text
            ctx.fillStyle = 'white';
            ctx.font = '14px sans-serif';
            ctx.fillText(`${Math.round(scale * 100)}%`, 10, 20);
        };

        drawPreview();
    }, [scale, object, isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            touchState.current = { startDist: dist, startScale: scale };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (touchState.current.startDist > 0) {
                const newScale = touchState.current.startScale * (dist / touchState.current.startDist);
                setScale(Math.max(0.1, Math.min(newScale, 5)));
            }
        }
    };

    if (!isOpen || !object) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4">
            <h3 className="text-white text-lg font-bold mb-4">兩指縮放調整大小</h3>
            <div
                ref={containerRef}
                className="w-full max-w-sm aspect-square bg-slate-800 rounded-xl overflow-hidden relative touch-none border border-slate-700"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
            >
                <canvas ref={canvasRef} className="w-full h-full block" />
            </div>
            <div className="flex gap-4 mt-6 w-full max-w-sm">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-medium"
                >
                    取消
                </button>
                <button
                    onClick={() => onConfirm(scale)}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30"
                >
                    確認調整
                </button>
            </div>
        </div>
    );
};

export default ObjectResizeModal;
