import React, { useRef } from 'react';

const TriangleSizeSlider = ({ value, onChange, min, max, color = "white", vertical = false }: { value: number, onChange: (val: number) => void, min: number, max: number, color?: string, vertical?: boolean }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleInteraction = (clientPos: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        let percentage;
        if (vertical) {
            // Vertical: Bottom is Min, Top is Max
            // clientPos is Y. 
            // Distance from bottom = rect.bottom - clientPos
            percentage = Math.max(0, Math.min(1, (rect.bottom - clientPos) / rect.height));
        } else {
            // Horizontal: Left is Min, Right is Max
            // clientPos is X.
            percentage = Math.max(0, Math.min(1, (clientPos - rect.left) / rect.width));
        }

        const newValue = min + percentage * (max - min);
        onChange(newValue);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        handleInteraction(vertical ? e.clientY : e.clientX);
        const moveHandler = (moveE: MouseEvent) => handleInteraction(vertical ? moveE.clientY : moveE.clientX);
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        handleInteraction(vertical ? e.touches[0].clientY : e.touches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        handleInteraction(vertical ? e.touches[0].clientY : e.touches[0].clientX);
    };

    return (
        <div
            ref={containerRef}
            className={`relative cursor-pointer touch-none flex items-center justify-center ${vertical ? 'w-10 h-32 flex-col' : 'h-10 w-32 flex-row'}`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            {/* Triangle Shape Background */}
            <div
                className={`absolute bg-slate-500/90 border-2 border-slate-300 shadow-md ${vertical ? 'inset-y-0' : 'inset-x-0 bottom-0'}`}
                style={{
                    clipPath: vertical
                        ? 'polygon(0 0, 100% 0, 0 100%)' // Right Triangle: Top-Left (0,0), Top-Right (100,0), Bottom-Left (0,100)
                        : 'polygon(0 100%, 100% 100%, 100% 0)',
                    // Adjust dimensions for visual
                    width: vertical ? '100%' : '100%',
                    height: vertical ? '100%' : '20px'
                }}
            ></div>

            {/* Knob/Indicator */}
            <div
                className="absolute w-5 h-5 bg-white rounded-full shadow-lg border-2 border-blue-500 transform"
                style={{
                    left: vertical ? '50%' : `${((value - min) / (max - min)) * 100}%`,
                    top: vertical ? `${(1 - (value - min) / (max - min)) * 100}%` : '50%',
                    transform: 'translate(-50%, -50%)'
                }}
            ></div>
        </div>
    );
};

export default TriangleSizeSlider;
