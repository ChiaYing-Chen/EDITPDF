import React, { useState, useEffect } from 'react';
import { XIcon } from './App'; // Assuming XIcon is exported or I need to redefine/import it. 
// Actually App.tsx exports App default. Icons are likely not exported.
// I will redefine simple icons or pass them? 
// To avoid circular dependency or import issues, I'll define simple icons here or use text labels for now.
// Or better, I'll just use text labels "X", "Confirm" etc. or simple SVGs.

const TextEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (text: string, color: string, fontSize: number, fontFamily: string) => void;
    initialText?: string;
    initialColor?: string;
    initialFontSize?: number;
    initialFontFamily?: string;
}> = ({ isOpen, onClose, onConfirm, initialText = '', initialColor = '#000000', initialFontSize = 16, initialFontFamily = 'sans-serif' }) => {
    const [text, setText] = useState(initialText);
    const [color, setColor] = useState(initialColor);
    const [fontSize, setFontSize] = useState(initialFontSize);
    const [fontFamily, setFontFamily] = useState(initialFontFamily);

    useEffect(() => {
        if (isOpen) {
            setText(initialText);
            setColor(initialColor);
            setFontSize(initialFontSize);
            setFontFamily(initialFontFamily);
        }
    }, [isOpen, initialText, initialColor, initialFontSize, initialFontFamily]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white text-lg">編輯文字</h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Text Input */}
                    <div>
                        <label className="block text-slate-400 text-sm font-medium mb-2">內容</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32"
                            placeholder="輸入文字..."
                        />
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-sm font-medium mb-2">顏色</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                />
                                <span className="text-slate-300 text-sm font-mono">{color}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-medium mb-2">大小</label>
                            <input
                                type="number"
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                min={8}
                                max={72}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div>
                        <label className="block text-slate-400 text-sm font-medium mb-2">預覽</label>
                        <div className="w-full h-24 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden p-4">
                            <div
                                style={{
                                    color: color,
                                    fontSize: `${fontSize}px`,
                                    fontFamily: fontFamily,
                                    textAlign: 'center',
                                    wordBreak: 'break-word',
                                    maxWidth: '100%'
                                }}
                            >
                                {text || "預覽文字"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                        取消
                    </button>
                    <button
                        onClick={() => onConfirm(text, color, fontSize, fontFamily)}
                        disabled={!text}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        確認並放置
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TextEditorModal;
