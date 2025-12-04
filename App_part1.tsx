import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import Dexie, { type Table } from 'dexie';
import { ProjectMetadata, StoredProject, EditorPageProps, EditorPageState, CompressionQuality, EditorObject, DrawingTool, PageData, StampConfig } from './types';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

// --- Helper Functions ---
const formatBytes = (bytes: number = 0, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};


// --- Icons ---
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);
const MinusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
);
const FolderOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    </svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);
const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);
const CheckSquareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
);
// Toolbar Icons
const UndoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
);
const RedoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
    </svg>
);
const FileIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);
const RotateIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 12a7.5 7.5 0 11-7.5-7.5M19.5 4.5v3h-3" />
    </svg>
);
const SplitIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
);
const PointerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
    </svg>
);
const HandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
    </svg>
);
const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
);
const LineIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18" transform="rotate(45 12 12)" />
    </svg>
);
const ArrowIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12l-7-7m7 7l-7 7m7-7H5" />
    </svg>
);
const RectIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z" />
    </svg>
);
const CircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth="2" />
    </svg>
);
const TextIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <text x="12" y="17" fontSize="18" textAnchor="middle" fontFamily="Arial, sans-serif" >文</text>
    </svg>
);
const ImageIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);
const StampIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.5 17.914a1 1 0 00-.293.707V19a1 1 0 01-1 1h-1a1 1 0 01-1-1v-3a1 1 0 00-.293-.707L7.5 14.5" opacity="0.5" />
    </svg>
);
const PenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const ResetZoomIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <text x="12" y="15" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">100</text>
    </svg>
);
const MergeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);
const DragHandleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
    </svg>
);
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const CompressIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
);


// --- Dexie DB Service ---
// Use functional instantiation to avoid class inheritance type issues in some environments
const db = new Dexie('PDFEditorDB') as Dexie & {
    projects: Table<StoredProject, string>;
};

db.version(1).stores({
    projects: 'id, name, timestamp', // Primary key and indexed properties
});

const dbService = {
    getProjectsMetadata: async (): Promise<ProjectMetadata[]> => {
        const projects = await db.projects.orderBy('timestamp').reverse().toArray();
        return projects.map(({ id, name, timestamp, pages, fileSize, pdfAssets }) => ({
            id,
            name,
            timestamp,
            pageCount: pages.length,
            // If fileSize is missing (old data), calculate it roughly from blobs
            fileSize: fileSize ?? (
                (pdfAssets ? Object.values(pdfAssets).reduce((acc, blob) => acc + blob.size, 0) : 0) +
                pages.reduce((acc, page) => acc + (page.source.type === 'image' ? page.source.data.size : 0), 0)
            )
        }));
    },
    getProjectData: (id: string): Promise<StoredProject | undefined> => {
        return db.projects.get(id);
    },
    saveProject: (project: StoredProject): Promise<string> => {
        // Calculate file size on save
        const pdfSize = project.pdfAssets ? Object.values(project.pdfAssets).reduce((acc, blob) => acc + blob.size, 0) : 0;
        const pageSize = project.pages.reduce((acc, page) => acc + (page.source.type === 'image' ? page.source.data.size : 0), 0);
        project.fileSize = pdfSize + pageSize;
        return db.projects.put(project);
    },
    deleteProject: (id: string): Promise<void> => {
        return db.projects.delete(id);
    }
};

// --- Generic Hook for Dropdowns ---
const useDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggle = () => setIsOpen(!isOpen);
    const close = () => setIsOpen(false);

    return { isOpen, ref, toggle, close };
};

// --- Components for Stamp Feature ---
const StampPickerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    stamps: StampConfig[];
    onSelect: (stamp: StampConfig) => void;
    onManage: () => void;
}> = ({ isOpen, onClose, stamps, onSelect, onManage }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[65] backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <StampIcon className="w-5 h-5 text-blue-400" />
                        選擇印章
                    </h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {stamps.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <div className="mb-3 opacity-50">
                                <StampIcon className="w-12 h-12 mx-auto" />
                            </div>
                            <p>尚未設定任何印章</p>
                            <button
                                onClick={onManage}
                                className="mt-4 text-blue-400 hover:text-blue-300 underline text-sm"
                            >
                                立即新增印章
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {stamps.map(stamp => (
                                <button
                                    key={stamp.id}
                                    onClick={() => { onSelect(stamp); onClose(); }}
                                    className="flex flex-col items-center p-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 transition-all group h-full"
                                >
                                    <div
                                        className="px-3 py-1.5 rounded shadow-sm mb-2 flex items-center justify-center text-xs font-bold w-full overflow-hidden whitespace-nowrap"
                                        style={{
                                            color: stamp.textColor,
                                            backgroundColor: stamp.backgroundColor,
                                            minHeight: '30px'
                                        }}
                                    >
                                        {stamp.text}
                                    </div>
                                    <div className="text-xs text-slate-300 font-medium truncate w-full text-center">{stamp.name}</div>
                                    {stamp.shortcutKey && <div className="text-[10px] text-slate-500 mt-1 font-mono">{stamp.shortcutKey}</div>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                    <button
                        onClick={onManage}
                        className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        管理印章
                    </button>
                </div>
            </div>
        </div>
    );
};

const StampSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const [stamps, setStamps] = useState<StampConfig[]>([]);
    const [editingStamp, setEditingStamp] = useState<StampConfig | null>(null);
    const [isRecordingKey, setIsRecordingKey] = useState(false);

    useEffect(() => {
        const savedStamps = localStorage.getItem('pdf_editor_stamps');
        if (savedStamps) {
            setStamps(JSON.parse(savedStamps));
        }
    }, []);

    useEffect(() => {
        // When stamps change, save to local storage
        if (stamps.length > 0 || localStorage.getItem('pdf_editor_stamps')) {
            localStorage.setItem('pdf_editor_stamps', JSON.stringify(stamps));
        }
    }, [stamps]);

    const handleSave = () => {
        if (!editingStamp) return;

        // Basic validation
        if (!editingStamp.text) {
            alert("請輸入印章文字");
            return;
        }

        setStamps(prev => {
            const index = prev.findIndex(s => s.id === editingStamp.id);
            if (index >= 0) {
                const newStamps = [...prev];
                newStamps[index] = editingStamp;
                return newStamps;
            } else {
                if (prev.length >= 10) {
                    alert("最多只能設定 10 組印章");
                    return prev;
                }
                return [...prev, editingStamp];
            }
        });
        setEditingStamp(null);
    };

    const handleDelete = (id: string) => {
        setStamps(prev => prev.filter(s => s.id !== id));
        if (editingStamp?.id === id) setEditingStamp(null);
    };

    const handleAddNew = () => {
        if (stamps.length >= 10) {
            alert("最多只能設定 10 組印章");
            return;
        }
        setEditingStamp({
            id: `stamp_${Date.now()}`,
            name: `印章 ${stamps.length + 1}`,
            text: '核准',
            textColor: '#FFFFFF',
            backgroundColor: '#FF0000',
            fontSize: 24,
            shortcutKey: ''
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isRecordingKey && editingStamp) {
            e.preventDefault();
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key; // Normalize
            setEditingStamp({ ...editingStamp, shortcutKey: key });
            setIsRecordingKey(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]">

                {/* Left Sidebar: Stamp List - Compact on mobile */}
                <div className="w-full md:w-1/3 border-r border-slate-700 flex flex-col bg-slate-850 h-36 md:h-auto">
                    <div className="p-3 md:p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-850 z-10">
                        <h3 className="font-bold text-white text-sm md:text-base">印章列表 ({stamps.length}/10)</h3>
                        <button onClick={handleAddNew} disabled={stamps.length >= 10} className="p-1.5 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <PlusIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {stamps.map(stamp => (
                            <div
                                key={stamp.id}
                                onClick={() => setEditingStamp(stamp)}
                                className={`p-2 md:p-3 rounded-xl border cursor-pointer flex items-center justify-between group transition-all ${editingStamp?.id === stamp.id ? 'bg-slate-700 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded flex items-center justify-center text-[10px] overflow-hidden shadow-sm font-bold shrink-0" style={{ color: stamp.textColor, backgroundColor: stamp.backgroundColor }}>
                                        {stamp.text.substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-slate-200 truncate">{stamp.name}</div>
                                        {stamp.shortcutKey && <div className="text-xs text-slate-500 hidden md:block">快捷鍵: <span className="font-mono bg-slate-900 px-1 rounded text-slate-400">{stamp.shortcutKey}</span></div>}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(stamp.id); }} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded opacity-0 group-hover:opacity-100 transition-all">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {stamps.length === 0 && (
                            <div className="text-center text-slate-500 py-8 text-sm">尚未建立印章</div>
                        )}
                    </div>
                </div>

                {/* Right Content: Editor - Scrollable area with sticky footer */}
                <div className="w-full md:w-2/3 flex flex-col bg-slate-900 min-h-0">
                    {editingStamp ? (
                        <>
                            <div className="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar">
                                <h3 className="text-lg font-bold text-white mb-4 md:mb-6 hidden md:block">編輯印章</h3>

                                <div className="grid gap-4 md:gap-6">
                                    {/* Preview */}
                                    <div className="flex flex-col items-center justify-center p-4 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed shrink-0">
                                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">預覽</p>
                                        <div
                                            className="px-6 py-3 rounded-lg shadow-lg flex items-center justify-center"
                                            style={{
                                                color: editingStamp.textColor,
                                                backgroundColor: editingStamp.backgroundColor,
                                                fontSize: `${editingStamp.fontSize}px`,
                                                minWidth: '100px',
                                                fontFamily: 'sans-serif',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {editingStamp.text || "預覽"}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">名稱</label>
                                            <input
                                                type="text"
                                                value={editingStamp.name}
                                                onChange={e => setEditingStamp({ ...editingStamp, name: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">文字</label>
                                            <input
                                                type="text"
                                                value={editingStamp.text}
                                                onChange={e => setEditingStamp({ ...editingStamp, text: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">文字顏色</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={editingStamp.textColor}
                                                    onChange={e => setEditingStamp({ ...editingStamp, textColor: e.target.value })}
                                                    className="h-9 w-full bg-slate-800 border border-slate-700 rounded cursor-pointer p-1"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">背景顏色</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={editingStamp.backgroundColor}
                                                    onChange={e => setEditingStamp({ ...editingStamp, backgroundColor: e.target.value })}
                                                    className="h-9 w-full bg-slate-800 border border-slate-700 rounded cursor-pointer p-1"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">大小 ({editingStamp.fontSize}px)</label>
                                            <input
                                                type="range"
                                                min="12"
                                                max="72"
                                                value={editingStamp.fontSize}
                                                onChange={e => setEditingStamp({ ...editingStamp, fontSize: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">快捷鍵</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsRecordingKey(true)}
                                                    onKeyDown={handleKeyDown}
                                                    className={`flex-1 bg-slate-800 border ${isRecordingKey ? 'border-blue-500 ring-1 ring-blue-500 text-blue-400' : 'border-slate-700 text-slate-300'} rounded-lg px-2 py-2 text-xs text-center focus:outline-none truncate`}
                                                >
                                                    {isRecordingKey ? "按下按鍵" : (editingStamp.shortcutKey ? `${editingStamp.shortcutKey}` : "設定")}
                                                </button>
                                                {editingStamp.shortcutKey && (
                                                    <button onClick={() => setEditingStamp({ ...editingStamp, shortcutKey: '' })} className="p-2 text-slate-500 hover:text-red-400 bg-slate-800 border border-slate-700 rounded-lg">
                                                        <XIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-850 shrink-0 z-20">
                                <button onClick={() => setEditingStamp(null)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-sm">放棄</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">儲存</button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-10">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <StampIcon className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="text-sm">請從左側選擇印章編輯，或建立新印章。</p>
                        </div>
                    )}

                    {!editingStamp && (
                        <div className="p-4 border-t border-slate-700 flex justify-end bg-slate-850 shrink-0 z-20">
                            <button onClick={onClose} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-all">完成</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Types for Merge Feature ---
interface MergeFileData {
    id: string;
    file: File;
    color: string;
    name: string;
}

interface MergePageData {
    id: string;
    data: Blob; // JPEG blob
    originalFileId: string;
    originalPageNum: number;
    color: string; // Cached color for rendering
    rotation: 0 | 90 | 180 | 270;
}

const FILE_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
];

// --- Components for Merge Feature ---
// (Merge feature components remain unchanged)

// ... (FileSortModal and MergeSortPage components are kept as is) ...

const FileSortModal: React.FC<{
    files: File[];
    onCancel: () => void;
    onConfirm: (sortedFiles: MergeFileData[]) => void;
}> = ({ files, onCancel, onConfirm }) => {
    // ... (No changes here)
    const [fileList, setFileList] = useState<MergeFileData[]>([]);

    useEffect(() => {
        // Initialize with default colors
        const initialList = files.map((f, idx) => ({
            id: `file_${Date.now()}_${idx}`,
            file: f,
            name: f.name,
            color: FILE_COLORS[idx % FILE_COLORS.length]
        }));
        setFileList(initialList);
    }, [files]);

    const moveFile = (index: number, direction: -1 | 1) => {
        const newList = [...fileList];
        const [movedItem] = newList.splice(index, 1);
        newList.splice(index + direction, 0, movedItem);
        setFileList(newList);
    };

    const changeColor = (id: string, color: string) => {
        setFileList(prev => prev.map(f => f.id === id ? { ...f, color } : f));
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">合併設定：文件排序</h2>
                    <p className="text-sm text-slate-400 mt-1">請調整文件順序，並設定顏色以識別。</p>
                </div>

                <div className="overflow-y-auto flex-1 p-4 space-y-2 custom-scrollbar">
                    {fileList.map((item, index) => (
                        <div key={item.id} className="flex items-center bg-slate-700/50 p-3 rounded-xl border border-slate-600/50 hover:border-slate-500 transition-colors">
                            <div className="flex flex-col gap-1 mr-3">
                                <button
                                    onClick={() => moveFile(index, -1)}
                                    disabled={index === 0}
                                    className="text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                                >
                                    ▲
                                </button>
                                <button
                                    onClick={() => moveFile(index, 1)}
                                    disabled={index === fileList.length - 1}
                                    className="text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                                >
                                    ▼
                                </button>
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className="truncate font-medium text-slate-200">{item.name}</p>
                                <p className="text-xs text-slate-500">{formatBytes(item.file.size)}</p>
                            </div>
                            <div className="flex items-center ml-3">
                                <input
                                    type="color"
                                    value={item.color}
                                    onChange={(e) => changeColor(item.id, e.target.value)}
                                    className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-none overflow-hidden"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium">取消</button>
                    <button onClick={() => onConfirm(fileList)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 text-sm transition-all transform hover:-translate-y-0.5">開始合併</button>
                </div>
            </div>
        </div>
    );
};

const MergeSortPage: React.FC<{
    sortedFiles: MergeFileData[];
    onSave: (project: StoredProject) => void;
    onCancel: () => void;
}> = ({ sortedFiles, onSave, onCancel }) => {
    // ... (No changes here, kept for context)
    const [pages, setPages] = useState<MergePageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState("");
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [projectName, setProjectName] = useState(`合併專案-${new Date().toLocaleDateString()}`);
    const [urlCache, setUrlCache] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        const processFiles = async () => {
            setLoading(true);
            const allPages: MergePageData[] = [];

            try {
                for (let fIdx = 0; fIdx < sortedFiles.length; fIdx++) {
                    const fileData = sortedFiles[fIdx];
                    setLoadingProgress(`正在處理檔案 (${fIdx + 1}/${sortedFiles.length}): ${fileData.name}`);

                    const arrayBuffer = await fileData.file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 1.0 }); // Thumbnail scale
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (!context) continue;

                        canvas.width = viewport.width;
                        canvas.height = viewport.height;

                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport,
                            canvas: canvas, // Include canvas in renderContext for compatibility
                        };
                        await page.render(renderContext).promise;

                        const blob = await new Promise<Blob | null>(resolve =>
                            canvas.toBlob(resolve, 'image/jpeg', CompressionQuality.NORMAL)
                        );

                        if (blob) {
                            allPages.push({
                                id: `merge_p_${fIdx}_${i}_${Date.now()}`,
                                data: blob,
                                originalFileId: fileData.id,
                                originalPageNum: i,
                                color: fileData.color,
                                rotation: 0
                            });
                        }
                    }
                }
                setPages(allPages);
            } catch (e) {
                console.error("Merge processing error:", e);
                alert("處理 PDF 時發生錯誤，請重試。");
                onCancel();
            } finally {
                setLoading(false);
            }
        };

        processFiles();
    }, [sortedFiles, onCancel]);

    // Update URL cache when pages change
    useEffect(() => {
        const newCache = new Map<string, string>();
        pages.forEach(p => {
            newCache.set(p.id, URL.createObjectURL(p.data));
        });
        setUrlCache(newCache);
        return () => {
            newCache.forEach(url => URL.revokeObjectURL(url));
        };
    }, [pages]);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Transparent ghost image roughly
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedIndex(null);
        (e.currentTarget as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newPages = [...pages];
        const [draggedItem] = newPages.splice(draggedIndex, 1);
        newPages.splice(index, 0, draggedItem);

        setPages(newPages);
        setDraggedIndex(index);
    };

    const handleFinish = () => {
        const projectPages: PageData[] = pages.map((p, idx) => ({
            id: `page_${Date.now()}_${idx}`, // Re-generate IDs for the clean project
            source: { type: 'image', data: p.data },
            rotation: p.rotation,
            objects: []
        }));

        // Calculate initial size
        const totalSize = projectPages.reduce((acc, p) => acc + (p.source.type === 'image' ? p.source.data.size : 0), 0);

        const newProject: StoredProject = {
            id: `proj_merge_${Date.now()}`,
            name: projectName,
