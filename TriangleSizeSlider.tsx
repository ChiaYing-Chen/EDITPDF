import React, { useRef } from 'react';

const TriangleSizeSlider = ({ value, onChange, min, max, color = "white" }: { value: number, onChange: (val: number) => void, min: number, max: number, color?: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleInteraction = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newValue = min + percentage * (max - min);
        onChange(newValue);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        handleInteraction(e.clientX);
        const moveHandler = (moveE: MouseEvent) => handleInteraction(moveE.clientX);
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        handleInteraction(e.touches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        handleInteraction(e.touches[0].clientX);
    };

    return (
        <div
            ref={containerRef}
            className="relative h-8 w-32 cursor-pointer touch-none flex items-center"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            {/* Triangle Shape Background */}
            <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-700/50" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }}></div>

            {/* Knob/Indicator */}
            <div
                className="absolute w-4 h-4 bg-white rounded-full shadow-md border border-slate-300 transform -translate-x-1/2"
                style={{
                    left: `${((value - min) / (max - min)) * 100}%`,
                    top: '50%',
                    marginTop: '-2px'
                }}
            ></div>
        </div>
    );
};

export default TriangleSizeSlider;
