import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import Dexie, { type Table } from 'dexie';
import PDFPageView from './PDFPageView';
import TextEditorModal from './TextEditorModal';
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
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <text x="12" y="17" fontSize="18" textAnchor="middle" fontWeight="bold" fontFamily="Arial, sans-serif">印</text>
    </svg>
);
const SidebarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
const CursorTextIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 16h10M12 8v8" />
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
                pages.reduce((acc, page: any) => acc + (page.source ? (page.source.type === 'image' ? page.source.data.size : 0) : (page.data ? page.data.size : 0)), 0)
            )
        }));
    },
    getProjectData: (id: string): Promise<StoredProject | undefined> => {
        return db.projects.get(id);
    },
    saveProject: (project: StoredProject): Promise<string> => {
        // Calculate file size on save
        const pdfSize = project.pdfAssets ? Object.values(project.pdfAssets).reduce((acc, blob) => acc + blob.size, 0) : 0;
        const pageSize = project.pages.reduce((acc, page: any) => acc + (page.source ? (page.source.type === 'image' ? page.source.data.size : 0) : (page.data ? page.data.size : 0)), 0);
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
            pages: projectPages,
            timestamp: Date.now(),
            fileSize: totalSize
        };
        onSave(newProject);
    };

    const removePage = (index: number) => {
        const newPages = [...pages];
        newPages.splice(index, 1);
        setPages(newPages);
    };

    const rotatePage = (index: number) => {
        const newPages = [...pages];
        newPages[index].rotation = (newPages[index].rotation + 90) % 360 as any;
        setPages(newPages);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-lg text-slate-300">{loadingProgress}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-md shadow-lg border-b border-slate-700 p-4 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-20 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <MergeIcon className="w-6 h-6 text-purple-400 shrink-0" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-bold text-lg truncate">頁面排序與合併</h1>
                        <p className="text-xs text-slate-400 line-clamp-2 md:whitespace-normal">拖曳頁面以調整順序，顏色框代表不同原始檔案。</p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full md:w-64 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        placeholder="專案名稱"
                    />
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-sm transition-colors">取消</button>
                        <button onClick={handleFinish} className="flex-1 md:flex-none px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg font-bold shadow-lg shadow-purple-500/30 text-sm whitespace-nowrap transition-all transform hover:-translate-y-0.5">完成合併</button>
                    </div>
                </div>
            </header>

            <main className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                {pages.length === 0 ? (
                    <div className="text-center text-slate-500 mt-20">
                        沒有頁面。
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {pages.map((page, index) => (
                            <div
                                key={page.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, index)}
                                className="relative group bg-slate-800 rounded-lg transition-transform shadow-sm hover:shadow-md"
                            >
                                {/* Color Border Container */}
                                <div className="p-2 rounded-t-lg border-4 border-b-0 bg-slate-750" style={{ borderColor: page.color }}>
                                    <div className="aspect-[3/4] bg-slate-700/50 flex items-center justify-center overflow-hidden relative rounded">
                                        <img
                                            src={urlCache.get(page.id)}
                                            alt={`Page ${index + 1}`}
                                            className="max-w-full max-h-full object-contain"
                                            style={{ transform: `rotate(${page.rotation}deg)` }}
                                        />
                                        {/* Hover Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                            <button onClick={() => rotatePage(index)} className="p-2 bg-slate-700 rounded-full hover:bg-blue-600 text-white transition-colors shadow-lg" title="旋轉">
                                                <RotateIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => removePage(index)} className="p-2 bg-slate-700 rounded-full hover:bg-red-500 text-white transition-colors shadow-lg" title="刪除">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Footer Info */}
                                <div className="bg-slate-800 p-2 rounded-b-lg border-4 border-t-0 text-center" style={{ borderColor: page.color }}>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: page.color }}></span>
                                        <span className="text-xs font-mono text-slate-300">原始: P.{page.originalPageNum}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 font-medium">新頁碼: {index + 1}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};


// --- Editor Page Component ---
type EditorTool = DrawingTool | 'move' | null;
type Point = { x: number; y: number };
type SelectionMode = 'view' | 'select';
type ActionState = {
    type: 'idle' | 'drawing' | 'moving' | 'resizing' | 'panning';
    startPoint?: Point; // canvas coords for drawing/moving/resizing
    panStartPoint?: Point; // screen coords for panning
    initialObject?: EditorObject;
    handle?: string;
};

type CompressionLevel = 'high' | 'standard' | 'low';

const EditorPage: React.FC<EditorPageProps> = ({ project, onSave, onClose }) => {
    // ... (Editor logic)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const objectImageInputRef = useRef<HTMLInputElement>(null);

    // History state for undo/redo
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
    const [history, setHistory] = useState<EditorPageState[]>([{ ...project, pdfAssets: project.pdfAssets || {}, pages: project.pages.map(p => ({ ...p, rotation: p.rotation ?? 0, objects: p.objects || [] })) }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const rawState = history[historyIndex];
    const state = rawState ? { ...rawState, pages: rawState.pages || [] } : { ...project, pages: [] };

    const [pageUrlCache, setPageUrlCache] = useState<Map<string, string>>(new Map());
    // Ref to store valid URLs to prevent reloading image on every state change (like drawing)
    const activeUrlMap = useRef(new Map<string, { url: string, blob: Blob }>());

    // Cache for object images (the overlaid images)
    const loadedObjectImages = useRef<Map<string, HTMLImageElement>>(new Map());
    const [targetObjectId, setTargetObjectId] = useState<string | null>(null);

    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set(project.pages.length > 0 ? [project.pages[0].id] : []));
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const [isDirty, setIsDirty] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('view');
    const [viewedPageId, setViewedPageId] = useState<string | null>(state?.pages?.[0]?.id || null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    // Compression State
    const [showCompressModal, setShowCompressModal] = useState(false);
    const [compressLevel, setCompressLevel] = useState<CompressionLevel>('standard');

    // Drawing state
    const [activeTool, setActiveTool] = useState<EditorTool>('move');
    const [actionState, setActionState] = useState<ActionState>({ type: 'idle' });
    const [previewObject, setPreviewObject] = useState<EditorObject | null>(null);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);


    // Force render triggering when image loads
    const [imageLoadedCount, setImageLoadedCount] = useState(0);

    // Drawing Style State
    const [drawingColor, setDrawingColor] = useState('#FF0000');
    const [textBackgroundColor, setTextBackgroundColor] = useState('transparent');
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [fontSize, setFontSize] = useState(16);
    const [fontFamily, setFontFamily] = useState('sans-serif');

    // Text Tool Refactor State
    const [showTextModal, setShowTextModal] = useState(false);
    const [pendingTextConfig, setPendingTextConfig] = useState<{ text: string; color: string; fontSize: number; fontFamily: string } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const backgroundRef = useRef<HTMLElement>(null);



    const thumbnailRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const desktopThumbnailRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const sidebarRef = useRef<HTMLDivElement>(null);
    const thumbnailContainerRef = useRef<HTMLDivElement>(null);
    const pinchState = useRef({ isPinching: false, initialDist: 0, initialZoom: 1 });
    const lastScrollTime = useRef(0);

    const fileMenu = useDropdown();
    const rotateMenu = useDropdown();
    const splitMenu = useDropdown();
    // Remove stampMenu as it is replaced by a modal
    // const stampMenu = useDropdown(); 
    const shapeMenu = useDropdown(); // Dropdown for shape tools on mobile

    const [showStampSettings, setShowStampSettings] = useState(false);
    const [showStampPicker, setShowStampPicker] = useState(false); // State for stamp picker modal
    const [stamps, setStamps] = useState<StampConfig[]>([]);
    const [activeStamp, setActiveStamp] = useState<StampConfig | null>(null);

    // Toolbar dragging state for mobile
    const [toolbarY, setToolbarY] = useState(50); // Percentage (50%)
    const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
    const toolbarDragStartY = useRef(0);
    const toolbarInitialY = useRef(50);

    const viewedPage = state?.pages?.find(p => p.id === viewedPageId) || state?.pages?.[0];
    const viewedPageIndex = state?.pages?.findIndex(p => p.id === viewedPageId) ?? -1;
    const selectedObject = viewedPage?.objects?.find(o => o.id === selectedObjectId) || null;
    const isDrawingToolActive = activeTool && activeTool !== 'move';

    // Calculate Current Project Size from pages
    const currentProjectSize = state?.pages?.reduce((acc, page) => acc + (page.source.type === 'image' ? page.source.data.size : 0), 0) + (state?.pdfAssets ? Object.values(state.pdfAssets).reduce((acc, blob) => acc + blob.size, 0) : 0);

    // Estimate compressed size based on heuristic
    const getEstimatedSize = () => {
        let ratio = 0.7;
        if (compressLevel === 'high') ratio = 0.9;
        if (compressLevel === 'low') ratio = 0.4;
        return currentProjectSize * ratio;
    };

    // --- Undo/Redo & State Updates ---
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const handleUndo = () => {
        if (canUndo) {
            setHistoryIndex(prev => prev - 1);
            setSelectedObjectId(null);
        }
    };

    const handleRedo = () => {
        if (canRedo) {
            setHistoryIndex(prev => prev + 1);
            setSelectedObjectId(null);
        }
    };

    const updateState = (newState: EditorPageState, options: { keepSelection?: boolean } = {}) => {
        const newHistory = history.slice(0, historyIndex + 1);
        if (newHistory.length > 20) {
            newHistory.shift();
        }
        newHistory.push(newState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setIsDirty(true);
        if (!options.keepSelection) {
            setSelectedObjectId(null);
        }
    };

    useEffect(() => {
        const loadStamps = () => {
            const savedStamps = localStorage.getItem('pdf_editor_stamps');
            if (savedStamps) {
                setStamps(JSON.parse(savedStamps));
            }
        };
        loadStamps();
        // Ref to listen to localStorage changes in other tabs or after modal close
        const handleStorage = () => loadStamps();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [showStampSettings]); // Refresh when settings closed

    // Optimized URL Cache Logic
    useEffect(() => {
        const currentMap = activeUrlMap.current; // Map<string, { url: string, blob: Blob }>
        const newMap = new Map<string, { url: string, blob: Blob }>();
        let hasChanges = false;

        state.pages.forEach(page => {
            if (page.source.type === 'image') {
                const existing = currentMap.get(page.id);
                if (existing && existing.blob === page.source.data) {
                    newMap.set(page.id, existing);
                } else {
                    const url = URL.createObjectURL(page.source.data);
                    newMap.set(page.id, { url, blob: page.source.data });
                    hasChanges = true;
                }
            }
        });

        // Revoke URLs for pages that are removed or changed
        currentMap.forEach((entry, id) => {
            if (!newMap.has(id) || newMap.get(id)!.url !== entry.url) {
                // Delay revocation to allow UI to update first
                setTimeout(() => URL.revokeObjectURL(entry.url), 1000);
                hasChanges = true;
            }
        });

        activeUrlMap.current = newMap;

        if (hasChanges) {
            const urlMap = new Map<string, string>();
            newMap.forEach((entry, id) => urlMap.set(id, entry.url));
            setPageUrlCache(urlMap);
        }
    }, [state.pages]);

    useEffect(() => {
        return () => {
            const map = activeUrlMap.current;
            setTimeout(() => {
                map.forEach(entry => URL.revokeObjectURL(entry.url));
            }, 1000);
        };
    }, []);

    useEffect(() => {
        if (!viewedPage) return;

        const currentLoadedImages = loadedObjectImages.current;
        const newLoadedImages = new Map<string, HTMLImageElement>();
        let hasNewImages = false;

        const loadImages = async () => {
            for (const obj of viewedPage.objects) {
                if (obj.type === 'image-placeholder' && obj.imageData) {
                    if (currentLoadedImages.has(obj.id)) {
                        newLoadedImages.set(obj.id, currentLoadedImages.get(obj.id)!);
                    } else {
                        const img = new Image();
                        const url = URL.createObjectURL(obj.imageData);
                        img.src = url;
                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                        }).then(() => {
                            newLoadedImages.set(obj.id, img);
                            hasNewImages = true;
                        }).catch(() => {
                            console.error(`Failed to load image for object ${obj.id}`);
                        });
                    }
                }
            }

            // Cleanup removed images
            currentLoadedImages.forEach((img, id) => {
                if (!newLoadedImages.has(id)) {
                    URL.revokeObjectURL(img.src);
                }
            });

            loadedObjectImages.current = newLoadedImages;

            if (hasNewImages) {
                setImageLoadedCount(c => c + 1);
            }
        };
        loadImages();

        // Cleanup on unmount or page change
        return () => {
            // We don't want to revoke everything here because we might switch back to this page
            // But for now, let's rely on the loop above to clean up removed objects.
            // Actually, if we switch pages, we might want to keep the cache? 
            // The current logic re-runs when viewedPage changes.
            // Ideally we should have a global cache for object images or manage it better.
            // For now, let's just ensure we don't leak.
        };
    }, [viewedPage]);

    // Canvas Resizing Logic for Image Pages
    useEffect(() => {
        if (!viewedPage || viewedPage.source.type !== 'image') return;

        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const background = backgroundRef.current;
            if (canvas && background) {
                const rect = background.getBoundingClientRect();
                // Match canvas size to the displayed image size
                if (canvas.width !== rect.width || canvas.height !== rect.height) {
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                    // Force re-render of objects
                    // We can trigger this by toggling a dummy state or relying on the next render cycle if state changed
                    // But since this is a resize, we might need to explicitly call render if it's not reactive
                    // However, the render loop is likely driven by state changes. 
                    // Let's check if we need to force update. 
                    // Actually, changing canvas width/height clears it, so we MUST redraw.
                    // The drawing logic is in a useEffect or similar?
                    // I need to find the drawing loop.
                    // Assuming there is a useEffect that draws when 'state' or 'viewedPage' changes.
                    // If not, I might need to trigger it.
                    // For now, let's assume the existing drawing logic will pick it up or I'll add a trigger.
                    setImageLoadedCount(c => c + 1); // This triggers re-renders
                }
            }
        };

        // ResizeObserver to handle responsive resizing
        const resizeObserver = new ResizeObserver(() => {
            resizeCanvas();
        });

        if (backgroundRef.current) {
            resizeObserver.observe(backgroundRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [viewedPage, zoom, imageLoadedCount]);

    // ... (State management, undo/redo, compression logic unchanged)
    const handleCompress = async () => {
        // ... (existing compress logic)
        setIsLoading(true);
        try {
            let scale = 1.0;
            let quality = 0.75;

            if (compressLevel === 'high') {
                scale = 1.0;
                quality = 0.85;
            } else if (compressLevel === 'standard') {
                scale = 1.0;
                quality = 0.6;
            } else if (compressLevel === 'low') {
                scale = 0.7;
                quality = 0.5;
            }

            const newPages = [...state.pages];

            for (let i = 0; i < newPages.length; i++) {
                const page = newPages[i];

                if (page.source.type === 'pdf') {
                    const pdfBlob = state.pdfAssets?.[page.source.pdfId];
                    if (pdfBlob) {
                        try {
                            const pdfData = await pdfBlob.arrayBuffer();
                            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                            const pdfPage = await pdf.getPage(page.source.pageIndex);
                            const viewport = pdfPage.getViewport({ scale: scale * 2 }); // Higher scale for quality

                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            if (context) {
                                canvas.height = viewport.height;
                                canvas.width = viewport.width;

                                await pdfPage.render({ canvasContext: context, viewport }).promise;

                                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
                                if (blob) {
                                    newPages[i] = { ...page, source: { type: 'image', data: blob } };
                                }
                            }
                        } catch (err) {
                            console.error("Error rasterizing PDF page:", err);
                        }
                    }
                } else if (page.source.type === 'image') {
                    const img = new Image();
                    const url = URL.createObjectURL(page.source.data);
                    img.src = url;
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });

                    const canvas = document.createElement('canvas');
                    const targetWidth = Math.floor(img.naturalWidth * scale);
                    const targetHeight = Math.floor(img.naturalHeight * scale);
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // High quality smoothing
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                        const blob = await new Promise<Blob | null>(resolve =>
                            canvas.toBlob(resolve, 'image/jpeg', quality)
                        );

                        if (blob) {
                            newPages[i] = { ...page, source: { type: 'image', data: blob } };
                        }
                    }
                    URL.revokeObjectURL(url);
                }
            }

            updateState({ ...state, pages: newPages });

            // Auto save after compression
            const projectToSave: StoredProject = { id: state.id, name: projectName, pages: newPages, pdfAssets: state.pdfAssets, timestamp: Date.now() };
            await onSave(projectToSave, projectName);
            setIsDirty(false);
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);

        } catch (e) {
            console.error("Compression failed:", e);
            alert('壓縮過程中發生錯誤。');
        } finally {
            setIsLoading(false);
            setShowCompressModal(false);
        }
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? rgb(parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255) : rgb(0, 0, 0);
    };

    const drawVectorObject = async (page: any, obj: EditorObject, pageHeight: number, scale: number, font: any) => {
        const transformY = (y: number) => pageHeight - (y / scale);
        const s = (val: number) => val / scale;
        const rgbColor = hexToRgb(obj.color || '#000000');
        const thickness = s(obj.strokeWidth || 2);

        if (obj.type === 'line') {
            page.drawLine({ start: { x: s(obj.sp.x), y: transformY(obj.sp.y) }, end: { x: s(obj.ep.x), y: transformY(obj.ep.y) }, color: rgbColor, thickness });
        } else if (obj.type === 'arrow') {
            const start = { x: s(obj.sp.x), y: transformY(obj.sp.y) };
            const end = { x: s(obj.ep.x), y: transformY(obj.ep.y) };
            page.drawLine({ start, end, color: rgbColor, thickness });

            const headLenScaled = s(Math.max(15, (obj.strokeWidth || 2) * 3));
            const angleCanvas = Math.atan2(obj.ep.y - obj.sp.y, obj.ep.x - obj.sp.x);

            const p1 = {
                x: obj.ep.x - headLenScaled * scale * Math.cos(angleCanvas - Math.PI / 6),
                y: obj.ep.y - headLenScaled * scale * Math.sin(angleCanvas - Math.PI / 6)
            };
            const p2 = {
                x: obj.ep.x - headLenScaled * scale * Math.cos(angleCanvas + Math.PI / 6),
                y: obj.ep.y - headLenScaled * scale * Math.sin(angleCanvas + Math.PI / 6)
            };

            page.drawPolygon({
                points: [
                    { x: s(obj.ep.x), y: transformY(obj.ep.y) },
                    { x: s(p1.x), y: transformY(p1.y) },
                    { x: s(p2.x), y: transformY(p2.y) }
                ],
                color: rgbColor,
                borderColor: rgbColor,
                borderWidth: 0,
            });
        } else if (obj.type === 'rect') {
            const x = Math.min(obj.sp.x, obj.ep.x);
            const y = Math.min(obj.sp.y, obj.ep.y);
            const w = Math.abs(obj.ep.x - obj.sp.x);
            const h = Math.abs(obj.ep.y - obj.sp.y);
            page.drawRectangle({
                x: s(x),
                y: transformY(y + h),
                width: s(w),
                height: s(h),
                borderColor: rgbColor,
                borderWidth: thickness,
            });
        } else if (obj.type === 'circle') {
            const radiusX = Math.abs(obj.ep.x - obj.sp.x) / 2;
            const radiusY = Math.abs(obj.ep.y - obj.sp.y) / 2;
            const centerX = Math.min(obj.sp.x, obj.ep.x) + radiusX;
            const centerY = Math.min(obj.sp.y, obj.ep.y) + radiusY;
            page.drawEllipse({
                x: s(centerX),
                y: transformY(centerY),
                xScale: s(radiusX),
                yScale: s(radiusY),
                borderColor: rgbColor,
                borderWidth: thickness,
            });
        } else if (obj.type === 'text' && obj.text) {
            const size = s(obj.fontSize || 16);
            const lines = obj.text.split('\n');
            const lineHeight = size * 1.2;

            if (obj.backgroundColor && obj.backgroundColor !== 'transparent') {
                let maxWidth = 0;
                lines.forEach((line: string) => {
                    const width = font.widthOfTextAtSize(line, size);
                    if (width > maxWidth) maxWidth = width;
                });
                const totalHeight = lines.length * lineHeight;
                const bgRgb = hexToRgb(obj.backgroundColor);
                page.drawRectangle({
                    x: s(obj.sp.x),
                    y: transformY(obj.sp.y) - totalHeight,
                    width: maxWidth,
                    height: totalHeight,
                    color: bgRgb,
                });
            }

            lines.forEach((line: string, i: number) => {
                page.drawText(line, {
                    x: s(obj.sp.x),
                    y: transformY(obj.sp.y) - size - (i * lineHeight) + (size * 0.2), // Adjust baseline
                    size: size,
                    font: font,
                    color: rgbColor,
                });
            });
        }
    };

    const createPdfBlob = async (pagesToExport: EditorPageState['pages']): Promise<Blob | null> => {
        try {
            const pdfDoc = await PDFDocument.create();
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

            for (const page of pagesToExport) {
                if (page.source.type === 'image') {
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    const img = new Image();

                    const flattenedDataUrl = await new Promise<string>((resolve, reject) => {
                        img.onload = async () => {
                            tempCanvas.width = img.naturalWidth;
                            tempCanvas.height = img.naturalHeight;
                            tempCtx!.drawImage(img, 0, 0);

                            const scaleX = 1;
                            const scaleY = 1;

                            for (const obj of (page.objects || [])) {
                                if (obj.type === 'image-placeholder' && obj.imageData) {
                                    try {
                                        const objImg = new Image();
                                        const objUrl = URL.createObjectURL(obj.imageData);
                                        objImg.src = objUrl;
                                        await new Promise((r, rej) => {
                                            objImg.onload = r;
                                            objImg.onerror = rej;
                                        });
                                        const sp = { x: obj.sp.x * scaleX, y: obj.sp.y * scaleY };
                                        const ep = { x: obj.ep.x * scaleX, y: obj.ep.y * scaleY };
                                        const x = Math.min(sp.x, ep.x);
                                        const y = Math.min(sp.y, ep.y);
                                        const w = Math.abs(sp.x - ep.x);
                                        const h = Math.abs(sp.y - ep.y);
                                        tempCtx!.drawImage(objImg, x, y, w, h);
                                        tempCtx!.strokeStyle = '#FF69B4';
                                        tempCtx!.lineWidth = (obj.strokeWidth || 2) * scaleX;
                                        tempCtx!.strokeRect(x, y, w, h);
                                        URL.revokeObjectURL(objUrl);
                                    } catch (e) {
                                        console.error("Failed to render object image in PDF", e);
                                    }
                                } else {
                                    drawObject(tempCtx!, obj, { scaleX, scaleY });
                                }
                            }
                            resolve(tempCanvas.toDataURL('image/jpeg', 0.92));
                        };
                        img.onerror = () => reject(new Error('Image failed to load for PDF generation'));

                        // Handle image source
                        if (page.source.type === 'image') {
                            const url = URL.createObjectURL(page.source.data);
                            img.src = url;
                            // Revoke url after load? handled in onload/onerror implicitly by GC or we should revoke
                        } else {
                            reject(new Error("Unexpected page source type in image block"));
                        }
                    });

                    const imageBytes = await fetch(flattenedDataUrl).then(res => res.arrayBuffer());
                    const image = await pdfDoc.embedJpg(imageBytes);
                    const { width, height } = image;
                    const isRotated = page.rotation === 90 || page.rotation === 270;
                    const pdfPage = pdfDoc.addPage(isRotated ? [height, width] : [width, height]);
                    const drawOptions: any = { width: image.width, height: image.height, rotate: degrees(-page.rotation) };

                    if (page.rotation === 90) { drawOptions.x = image.width; drawOptions.y = 0; }
                    else if (page.rotation === 180) { drawOptions.x = image.width; drawOptions.y = image.height; }
                    else if (page.rotation === 270) { drawOptions.x = 0; drawOptions.y = image.height; }

                    pdfPage.drawImage(image, drawOptions);
                } else if (page.source.type === 'pdf') {
                    const sourceBlob = state.pdfAssets?.[page.source.pdfId];
                    if (sourceBlob) {
                        const sourcePdfBytes = await sourceBlob.arrayBuffer();
                        const sourcePdfDoc = await PDFDocument.load(sourcePdfBytes);
                        const [copiedPage] = await pdfDoc.copyPages(sourcePdfDoc, [page.source.pageIndex - 1]);
                        pdfDoc.addPage(copiedPage);

                        const currentRotation = copiedPage.getRotation().angle;
                        copiedPage.setRotation(degrees(currentRotation + page.rotation));

                        const { height } = copiedPage.getSize();
                        const scale = 1.5;

                        for (const obj of page.objects) {
                            await drawVectorObject(copiedPage, obj, height, scale, helveticaFont);
                        }
                    }
                }
            }
            const pdfBytes = await pdfDoc.save();
            return new Blob([pdfBytes], { type: 'application/pdf' });
        } catch (error) {
            console.error("Failed to generate PDF blob:", error);
            return null;
        }
    };

    const generatePdf = async (pagesToExport: EditorPageState['pages'], filename: string) => {
        // ... (existing generatePdf logic)
        setIsLoading(true);
        try {
            const blob = await createPdfBlob(pagesToExport);
            if (!blob) { alert("產生 PDF 失敗。"); return false; }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            return true;
        } catch (error) { console.error("Failed to generate PDF:", error); alert("產生 PDF 失敗。"); return false; } finally { setIsLoading(false); }
    };

    // ... (handlers: handleSaveAndDownload, handleShare, etc. unchanged)
    const handleSaveAndDownload = async () => {
        fileMenu.close();
        const projectToSave: StoredProject = { id: state.id, name: projectName, pages: state.pages, pdfAssets: state.pdfAssets, timestamp: Date.now() };
        await onSave(projectToSave, projectName);
        setIsDirty(false);
        const success = await generatePdf(state.pages, `${projectName.replace(/\.pdf$/i, '') || 'document'}.pdf`);
        if (success) { setShowSaveSuccess(true); setTimeout(() => setShowSaveSuccess(false), 2000); }
    };

    const handleShare = async () => {
        fileMenu.close();
        const projectToSave: StoredProject = { id: state.id, name: projectName, pages: state.pages, pdfAssets: state.pdfAssets, timestamp: Date.now() };
        await onSave(projectToSave, projectName);
        setIsDirty(false);
        setIsLoading(true);
        const blob = await createPdfBlob(state.pages);
        setIsLoading(false);
        if (!blob) { alert("產生分享檔案失敗。"); return; }
        const filename = `${projectName.replace(/\.pdf$/i, '') || 'document'}.pdf`;
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file], title: projectName, text: '這是使用 PDF 編輯工具製作的文件，請查收。' }); }
            catch (err) { if ((err as Error).name !== 'AbortError') { console.error('Share failed:', err); alert('分享失敗，將為您下載檔案。'); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } }
        } else { alert("您的瀏覽器不支援直接分享檔案，將為您下載檔案。"); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
    };
    const handleAddPages = () => { fileMenu.close(); fileInputRef.current?.click(); };

    // ... (onObjectImageChange, onAddFilesChange unchanged)
    const onObjectImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        // Use selectedObjectId if targetObjectId is not set (fallback for immediate selection)
        const targetId = targetObjectId || selectedObjectId;

        if (!files || files.length === 0 || !targetId || !viewedPageId) return;
        const file = files[0];
        const newPages = state.pages.map(p => {
            if (p.id === viewedPageId) {
                const newObjects = p.objects.map(obj => {
                    if (obj.id === targetId) { return { ...obj, imageData: file }; }
                    return obj;
                });
                return { ...p, objects: newObjects };
            }
            return p;
        });
        updateState({ ...state, pages: newPages });
        setTargetObjectId(null);
        event.target.value = '';
    };

    const onAddFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsLoading(true);
        try {
            const newPages: PageData[] = [];
            const newPdfAssets: Record<string, Blob> = { ...(state.pdfAssets || {}) };
            const sortedFiles = (Array.from(files) as File[]).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            for (let i = 0; i < sortedFiles.length; i++) {
                const file = sortedFiles[i];
                if (file.type === 'application/pdf') {
                    const pdfId = `pdf_added_${Date.now()}_${i}`;
                    newPdfAssets[pdfId] = file;

                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    for (let j = 1; j <= pdf.numPages; j++) {
                        newPages.push({
                            id: `page_added_${Date.now()}_${i}_${j}`,
                            source: { type: 'pdf', pdfId, pageIndex: j },
                            rotation: 0,
                            objects: []
                        });
                    }
                } else if (file.type.startsWith('image/')) {
                    newPages.push({
                        id: `page_added_${Date.now()}_${i}`,
                        source: { type: 'image', data: file },
                        rotation: 0,
                        objects: []
                    });
                }
            }
            if (newPages.length > 0) {
                const newState = {
                    ...state,
                    pages: [...state.pages, ...newPages],
                    pdfAssets: newPdfAssets
                };
                updateState(newState);
                setViewedPageId(newPages[0].id);
                scrollToThumbnail(newPages[0].id);
            }
        } catch (error) { console.error("Error adding pages:", error); alert("新增頁面失敗。"); } finally { setIsLoading(false); if (fileInputRef.current) { fileInputRef.current.value = ''; } }
    };

    // ... (Page manipulation handlers unchanged)
    const togglePageSelection = (pageId: string) => {
        setSelectedPages(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(pageId)) { newSelection.delete(pageId); } else { newSelection.add(pageId); }
            return newSelection;
        });
    };

    const scrollToThumbnail = (pageId: string) => {
        setTimeout(() => {
            const mobileEl = thumbnailRefs.current.get(pageId);
            if (mobileEl && thumbnailContainerRef.current && thumbnailContainerRef.current.offsetParent !== null) { mobileEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
            const desktopEl = desktopThumbnailRefs.current.get(pageId);
            if (desktopEl && sidebarRef.current && sidebarRef.current.offsetParent !== null) { desktopEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
        }, 0);
    };

    const handleThumbnailClick = (pageId: string) => {
        if (selectionMode === 'view') {
            setViewedPageId(pageId); setSelectedPages(new Set([pageId])); scrollToThumbnail(pageId);
        } else { togglePageSelection(pageId); }
    };

    const handleRotateSelectedPages = () => {
        rotateMenu.close();
        if (selectedPages.size === 0) return;
        const newState = { ...state, pages: state.pages.map(p => selectedPages.has(p.id) ? { ...p, rotation: ((p.rotation + 90) % 360) as any } : p), };
        updateState(newState);
    };

    const handleRotateAllPages = () => {
        rotateMenu.close();
        const newState = { ...state, pages: state.pages.map(p => ({ ...p, rotation: ((p.rotation + 90) % 360) as any })), };
        updateState(newState);
    };

    const deletePages = () => {
        splitMenu.close();
        if (selectedPages.size === 0) return;
        const newPages = state.pages.filter(p => !selectedPages.has(p.id));
        const newState = { ...state, pages: newPages, };
        if (!newPages.some(p => p.id === viewedPageId)) { setViewedPageId(newPages[0]?.id || null); }
        setSelectedPages(new Set());
        updateState(newState);
    };

    const handleDrop = (dropTargetId: string) => {
        if (!draggedId || draggedId === dropTargetId) return;
        const draggedIndex = state.pages.findIndex(p => p.id === draggedId);
        const dropTargetIndex = state.pages.findIndex(p => p.id === dropTargetId);
        if (draggedIndex === -1 || dropTargetIndex === -1) return;
        const _pages = [...state.pages];
        const [draggedItem] = _pages.splice(draggedIndex, 1);
        _pages.splice(dropTargetIndex, 0, draggedItem);
        const newState = { ...state, pages: _pages };
        updateState(newState);
    };

    const handleExportSelected = () => {
        splitMenu.close();
        if (selectedPages.size === 0) { alert("請先選取要匯出的頁面。"); return; }
        const pagesToExport = state.pages.filter(p => selectedPages.has(p.id));
        generatePdf(pagesToExport, `${projectName.replace(/\.pdf$/i, '') || 'document'}_selection.pdf`);
    };

    const handleClose = () => {
        fileMenu.close();
        if (isDirty) { if (window.confirm("您有未儲存的變更。確定要關閉嗎？")) { onClose(); } } else { onClose(); }
    };

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 5));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.2));
    const handleResetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    const handlersRef = useRef({ handleSaveAndDownload, handleUndo, canUndo, stamps });
    handlersRef.current = { handleSaveAndDownload, handleUndo, canUndo, stamps };

    const handleStampToolSelect = (stamp: StampConfig) => {
        setActiveTool('stamp');
        setActiveStamp(stamp);
        setShowStampPicker(false);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handlersRef.current.handleSaveAndDownload(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (handlersRef.current.canUndo) { handlersRef.current.handleUndo(); } }

            // Stamp shortcuts
            if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
                const matchingStamp = handlersRef.current.stamps.find(s => s.shortcutKey === e.key.toLowerCase());
                if (matchingStamp) {
                    setActiveTool('stamp');
                    setActiveStamp(matchingStamp);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleThumbnailWheel = (e: React.WheelEvent) => { if (thumbnailContainerRef.current) { thumbnailContainerRef.current.scrollLeft += e.deltaY; } };

    useEffect(() => {
        const handleMainViewWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (isDrawingToolActive) return;
            if (e.ctrlKey) {
                const scaleAmount = e.deltaY * -0.001;
                setZoom(z => Math.max(0.2, Math.min(z + scaleAmount, 5)));
                return;
            }
            const now = Date.now();
            if (now - lastScrollTime.current < 200) return;
            if (e.deltaY > 0) {
                const idx = state.pages.findIndex(p => p.id === viewedPageId);
                if (idx < state.pages.length - 1) { const nextId = state.pages[idx + 1].id; setViewedPageId(nextId); lastScrollTime.current = now; scrollToThumbnail(nextId); }
            } else if (e.deltaY < 0) {
                const idx = state.pages.findIndex(p => p.id === viewedPageId);
                if (idx > 0) { const prevId = state.pages[idx - 1].id; setViewedPageId(prevId); lastScrollTime.current = now; scrollToThumbnail(prevId); }
            }
        };

        const handleMainTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                touchState.current = {
                    mode: 'pinch',
                    startDist: dist,
                    startZoom: zoomRef.current,
                    startY: 0,
                    lastY: 0
                };
            } else if (e.touches.length === 1 && !isDrawingToolActive) {
                touchState.current = {
                    mode: 'swipe',
                    startDist: 0,
                    startZoom: 1,
                    startY: e.touches[0].clientY,
                    lastY: e.touches[0].clientY
                };
            }
        };

        const handleMainTouchMove = (e: TouchEvent) => {
            if (touchState.current.mode === 'pinch' && e.touches.length === 2) {
                e.preventDefault();
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const scale = (dist / touchState.current.startDist) * touchState.current.startZoom;
                setZoom(Math.max(0.2, Math.min(scale, 5)));
            } else if (touchState.current.mode === 'swipe' && e.touches.length === 1) {
                touchState.current.lastY = e.touches[0].clientY;
            }
        };

        const handleMainTouchEnd = (e: TouchEvent) => {
            if (touchState.current.mode === 'swipe') {
                const diffY = touchState.current.lastY - touchState.current.startY;
                const threshold = 50; // Reduced threshold for easier swipe
                const now = Date.now();
                if (Math.abs(diffY) > threshold && now - lastScrollTime.current > 300) {
                    if (diffY < 0) {
                        // Swiped up -> Next page
                        const idx = state.pages.findIndex(p => p.id === viewedPageId);
                        if (idx < state.pages.length - 1) {
                            const nextId = state.pages[idx + 1].id;
                            setViewedPageId(nextId);
                            lastScrollTime.current = now;
                            scrollToThumbnail(nextId);
                        }
                    } else {
                        // Swiped down -> Prev page
                        const idx = state.pages.findIndex(p => p.id === viewedPageId);
                        if (idx > 0) {
                            const prevId = state.pages[idx - 1].id;
                            setViewedPageId(prevId);
                            lastScrollTime.current = now;
                            scrollToThumbnail(prevId);
                        }
                    }
                }
            }
            touchState.current.mode = 'idle';
        };

        const mainElement = document.getElementById('main-editor-view');
        if (mainElement) {
            mainElement.addEventListener('wheel', handleMainViewWheel, { passive: false });
            mainElement.addEventListener('touchstart', handleMainTouchStart, { passive: false });
            mainElement.addEventListener('touchmove', handleMainTouchMove, { passive: false });
            mainElement.addEventListener('touchend', handleMainTouchEnd, { passive: false });
        }
        return () => {
            if (mainElement) {
                mainElement.removeEventListener('wheel', handleMainViewWheel);
                mainElement.removeEventListener('touchstart', handleMainTouchStart);
                mainElement.removeEventListener('touchmove', handleMainTouchMove);
                mainElement.removeEventListener('touchend', handleMainTouchEnd);
            }
        };
    }, [isDrawingToolActive, state.pages, viewedPageId]);

    // Touch Gesture Handlers for Main View
    const touchState = useRef<{
        mode: 'idle' | 'pinch' | 'swipe';
        startDist: number;
        startZoom: number;
        startY: number;
        lastY: number;
    }>({ mode: 'idle', startDist: 0, startZoom: 1, startY: 0, lastY: 0 });

    const handleMainTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            touchState.current = {
                mode: 'pinch',
                startDist: dist,
                startZoom: zoom, // Use current zoom from state (accessed via closure if possible, but useEffect dependency might be tricky. Better to use ref or rely on state update function if needed, but here we need initial value. Actually, since this is inside useEffect, 'zoom' might be stale if not in dependency. Wait, I am defining these INSIDE useEffect now? No, I should define them outside or use refs for zoom.)
                startY: 0,
                lastY: 0
            };
        } else if (e.touches.length === 1 && !isDrawingToolActive) {
            // Only enable swipe if not drawing/moving objects
            touchState.current = {
                mode: 'swipe',
                startDist: 0,
                startZoom: 1,
                startY: e.touches[0].clientY,
                lastY: e.touches[0].clientY
            };
        }
    };

    // Wait, I need access to 'zoom' state inside the event listener. 
    // If I define these inside useEffect, I need to add 'zoom' to dependency array, which causes re-binding listeners on every zoom change.
    // Better to use a ref for current zoom to avoid re-binding.
    const zoomRef = useRef(zoom);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);

    const handleMainTouchMove = (e: TouchEvent) => {
        if (touchState.current.mode === 'pinch' && e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const scale = (dist / touchState.current.startDist) * touchState.current.startZoom;
            setZoom(Math.max(0.2, Math.min(scale, 5)));
        } else if (touchState.current.mode === 'swipe' && e.touches.length === 1) {
            // Optional: Implement continuous scroll or just threshold-based page switch
            // For page switch, we usually wait for end or use a threshold.
            // Let's track movement for Swipe-to-Change-Page logic in TouchEnd
            touchState.current.lastY = e.touches[0].clientY;
        }
    };

    const handleMainTouchEnd = (e: TouchEvent) => {
        if (touchState.current.mode === 'swipe') {
            const diffY = touchState.current.lastY - touchState.current.startY;
            const threshold = 100; // px
            const now = Date.now();
            if (now - lastScrollTime.current > 300) { // Debounce
                if (diffY < -threshold) {
                    // Swiped up -> Next page
                    const idx = state.pages.findIndex(p => p.id === viewedPageId);
                    if (idx < state.pages.length - 1) {
                        const nextId = state.pages[idx + 1].id;
                        setViewedPageId(nextId);
                        lastScrollTime.current = now;
                        scrollToThumbnail(nextId);
                    }
                } else if (diffY > threshold) {
                    // Swiped down -> Prev page
                    const idx = state.pages.findIndex(p => p.id === viewedPageId);
                    if (idx > 0) {
                        const prevId = state.pages[idx - 1].id;
                        setViewedPageId(prevId);
                        lastScrollTime.current = now;
                        scrollToThumbnail(prevId);
                    }
                }
            }
        }
        touchState.current.mode = 'idle';
    };


    // Toolbar Drag Handlers for Mobile
    const handleToolbarDragStart = (e: React.TouchEvent) => {
        setIsDraggingToolbar(true);
        toolbarDragStartY.current = e.touches[0].clientY;
        toolbarInitialY.current = toolbarY;
    };

    const handleToolbarDragMove = (e: React.TouchEvent) => {
        if (!isDraggingToolbar) return;
        e.preventDefault(); // Prevent scrolling
        const deltaY = e.touches[0].clientY - toolbarDragStartY.current;
        const windowHeight = window.innerHeight;
        const percentageDelta = (deltaY / windowHeight) * 100;
        let newY = toolbarInitialY.current + percentageDelta;
        // Constrain to typical screen bounds (e.g., 10% to 90%)
        newY = Math.max(10, Math.min(90, newY));
        setToolbarY(newY);
    };

    const handleToolbarDragEnd = () => {
        setIsDraggingToolbar(false);
    };

    // --- Drawing Logic Wrappers (Reduced for brevity, but keeping all logic) ---
    const getObjectAtPoint = (point: Point, objects: EditorObject[]): EditorObject | null => {
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            const { sp, ep } = obj;
            const minX = Math.min(sp.x, ep.x); const maxX = Math.max(sp.x, ep.x); const minY = Math.min(sp.y, ep.y); const maxY = Math.max(sp.y, ep.y);
            if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) { return obj; }
        }
        return null;
    };

    const getHandlesForObject = (object: EditorObject) => {
        const { sp, ep } = object;
        const minX = Math.min(sp.x, ep.x); const maxX = Math.max(sp.x, ep.x); const minY = Math.min(sp.y, ep.y); const maxY = Math.max(sp.y, ep.y);
        return { 'top-left': { x: minX, y: minY }, 'top-right': { x: maxX, y: minY }, 'bottom-left': { x: minX, y: maxY }, 'bottom-right': { x: maxX, y: maxY }, };
    };

    const getHandleAtPoint = (point: Point, object: EditorObject | null): string | null => {
        if (!object) return null;
        if (object.type === 'image-placeholder' && object.imageData) { return null; }
        const handles = getHandlesForObject(object); const handleSize = 8;
        for (const [name, pos] of Object.entries(handles)) {
            if (point.x >= pos.x - handleSize / 2 && point.x <= pos.x + handleSize / 2 && point.y >= pos.y - handleSize / 2 && point.y <= pos.y + handleSize / 2) { return name; }
        }
        return null;
    };

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current; const background = backgroundRef.current;
        if (!canvas || !background) return { x: 0, y: 0 };
        const rect = background.getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in e) {
            if (e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
            else if (e.changedTouches.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }
            else { return { x: 0, y: 0 }; }
        } else { clientX = (e as React.MouseEvent).clientX; clientY = (e as React.MouseEvent).clientY; }
        const imageCenterX = rect.left + rect.width / 2; const imageCenterY = rect.top + rect.height / 2;
        let vecX = clientX - imageCenterX; let vecY = clientY - imageCenterY;
        const rotation = viewedPage.rotation; const angleRad = -rotation * (Math.PI / 180);
        const rotatedX = vecX * Math.cos(angleRad) - vecY * Math.sin(angleRad); const rotatedY = vecX * Math.sin(angleRad) + vecY * Math.cos(angleRad);
        const unscaledX = rotatedX / zoom; const unscaledY = rotatedY / zoom;

        // When rotated 90 or 270 degrees, the "width" of the unrotated page corresponds to the "height" of the rotated element
        const isSwapped = rotation % 180 !== 0;
        const unrotatedWidth = isSwapped ? background.clientHeight : background.clientWidth;
        const unrotatedHeight = isSwapped ? background.clientWidth : background.clientHeight;

        const finalX = (unrotatedWidth / 2) + unscaledX; const finalY = (unrotatedHeight / 2) + unscaledY;
        return { x: finalX, y: finalY };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const startPoint = getCanvasCoordinates(e);

        if (isDrawingToolActive) {
            if (activeTool === 'text') {
                // New logic: handled in MouseUp for click-to-place
                setActionState({ type: 'drawing', startPoint });
                setSelectedObjectId(null);
            }
            else { setActionState({ type: 'drawing', startPoint }); setSelectedObjectId(null); }
        } else {
            const handle = getHandleAtPoint(startPoint, selectedObject);
            if (handle) { setActionState({ type: 'resizing', startPoint, handle, initialObject: selectedObject! }); }
            else {
                const objectToSelect = getObjectAtPoint(startPoint, viewedPage.objects);
                if (objectToSelect && objectToSelect.type === 'image-placeholder' && !objectToSelect.imageData) { setTargetObjectId(objectToSelect.id); objectImageInputRef.current?.click(); return; }
                if (objectToSelect) { setSelectedObjectId(objectToSelect.id); setActionState({ type: 'moving', startPoint, initialObject: objectToSelect }); }
                else { setSelectedObjectId(null); setActionState({ type: 'panning', panStartPoint: { x: e.clientX, y: e.clientY } }); }
            }
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (actionState.type === 'panning' && actionState.panStartPoint) {
            const dx = e.clientX - actionState.panStartPoint.x; const dy = e.clientY - actionState.panStartPoint.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy })); setActionState(s => ({ ...s, panStartPoint: { x: e.clientX, y: e.clientY } })); return;
        }
        if (actionState.type === 'idle') return;
        const currentPoint = getCanvasCoordinates(e); const { type, startPoint } = actionState;
        if (type === 'drawing' && startPoint) { setPreviewObject({ id: 'preview', type: activeTool as DrawingTool, sp: startPoint, ep: currentPoint, color: drawingColor, strokeWidth: strokeWidth, }); }
        else if (type === 'moving' && actionState.initialObject) {
            const dx = currentPoint.x - startPoint!.x; const dy = currentPoint.y - startPoint!.y; const { sp, ep } = actionState.initialObject;
            const updatedObject = { ...actionState.initialObject, sp: { x: sp.x + dx, y: sp.y + dy }, ep: { x: ep.x + dx, y: ep.y + dy }, }; setPreviewObject(updatedObject);
        } else if (type === 'resizing' && actionState.initialObject && actionState.handle) {
            const { sp, ep } = actionState.initialObject; let newSp = { ...sp }; let newEp = { ...ep };
            if (actionState.handle.includes('left')) { newSp.x = currentPoint.x; } if (actionState.handle.includes('right')) { newEp.x = currentPoint.x; }
            if (actionState.handle.includes('top')) { newSp.y = currentPoint.y; } if (actionState.handle.includes('bottom')) { newEp.y = currentPoint.y; }
            const updatedObject = { ...actionState.initialObject, sp: newSp, ep: newEp }; setPreviewObject(updatedObject);
        }
    };

    const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (actionState.type === 'panning') { setActionState({ type: 'idle' }); return; }
        if (actionState.type === 'idle') return;
        const endPoint = getCanvasCoordinates(e); const { type, startPoint } = actionState;
        let newObjects = [...(viewedPage?.objects || [])]; let changesMade = false;
        if (type === 'drawing' && startPoint) {
            const isDrag = Math.abs(startPoint.x - endPoint.x) > 5 || Math.abs(startPoint.y - endPoint.y) > 5;

            if (activeTool === 'stamp' && activeStamp) {
                let finalEp = endPoint;
                if (!isDrag) {
                    const defaultWidth = Math.max(100, activeStamp.text.length * activeStamp.fontSize);
                    const defaultHeight = activeStamp.fontSize * 2.5;
                    finalEp = { x: startPoint.x + defaultWidth, y: startPoint.y + defaultHeight };
                }
                const newObject: EditorObject = {
                    id: `obj_${Date.now()}`,
                    type: 'stamp',
                    sp: startPoint,
                    ep: finalEp,
                    text: activeStamp.text,
                    color: activeStamp.textColor,
                    backgroundColor: activeStamp.backgroundColor,
                    fontSize: activeStamp.fontSize,
                    strokeWidth: 0,
                };
                newObjects.push(newObject);
                changesMade = true;
                setSelectedObjectId(newObject.id);
                setActiveTool('move');
                setActiveStamp(null);
            } else if (activeTool === 'text' && pendingTextConfig) {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                let width = 200;
                let height = 50;

                if (ctx) {
                    ctx.font = `${pendingTextConfig.fontSize}px ${pendingTextConfig.fontFamily}`;
                    const metrics = ctx.measureText(pendingTextConfig.text);
                    width = Math.min(metrics.width + 10, 400);
                    const lines = wrapText(ctx, pendingTextConfig.text, width);
                    height = lines.length * (pendingTextConfig.fontSize * 1.2);
                }

                const newObject: EditorObject = {
                    id: `obj_${Date.now()}`,
                    type: 'text',
                    sp: startPoint,
                    ep: { x: startPoint.x + width, y: startPoint.y + height },
                    text: pendingTextConfig.text,
                    color: pendingTextConfig.color,
                    fontSize: pendingTextConfig.fontSize,
                    fontFamily: pendingTextConfig.fontFamily,
                    backgroundColor: 'transparent'
                };
                newObjects.push(newObject);
                changesMade = true;
                setSelectedObjectId(newObject.id);
                setActiveTool('move');
                setPendingTextConfig(null);
            } else if (activeTool === 'image-placeholder') {
                const newObject: EditorObject = { id: `obj_${Date.now()}`, type: 'image-placeholder', sp: startPoint, ep: endPoint, color: '#FF69B4', strokeWidth: 2 };
                newObjects.push(newObject); changesMade = true;
                setTargetObjectId(newObject.id);
                setSelectedObjectId(newObject.id);
                setActiveTool('move');
                setTimeout(() => {
                    const input = objectImageInputRef.current;
                    if (input) {
                        input.value = '';
                        const handleFocus = () => {
                            setTimeout(() => {
                                setTargetObjectId(currentId => {
                                    if (currentId === newObject.id) {
                                        // Restore state to before placeholder was added (effectively removing it)
                                        updateState(state);
                                        setSelectedObjectId(null);
                                        return null;
                                    }
                                    return currentId;
                                });
                            }, 500);
                            window.removeEventListener('focus', handleFocus);
                        };
                        window.addEventListener('focus', handleFocus);
                        input.click();
                    }
                }, 0);
            } else if (isDrag) {
                const newObject: EditorObject = { id: `obj_${Date.now()}`, type: activeTool as DrawingTool, sp: startPoint, ep: endPoint, color: drawingColor, strokeWidth: strokeWidth, };
                newObjects.push(newObject); changesMade = true;
            }
        } else if ((type === 'moving' || type === 'resizing') && previewObject) { newObjects = newObjects.map(obj => obj.id === previewObject.id ? previewObject : obj); changesMade = true; }
        if (changesMade) { const newState = { ...state, pages: state.pages.map(p => p.id === viewedPageId ? { ...p, objects: newObjects } : p) }; updateState(newState, { keepSelection: true }); }
        setActionState({ type: 'idle' }); setPreviewObject(null);
    };

    const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (e.touches.length === 2) {
            if (isDrawingToolActive) { e.preventDefault(); return; }
            e.preventDefault(); const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            pinchState.current = { isPinching: true, initialDist: dist, initialZoom: zoom }; setActionState({ type: 'idle' });
        } else if (e.touches.length === 1) {
            const touch = e.touches[0]; const startPoint = getCanvasCoordinates(e);
            if (isDrawingToolActive) { e.preventDefault(); if (activeTool !== 'text') { setActionState({ type: 'drawing', startPoint }); setSelectedObjectId(null); } }
            else {
                const objectToSelect = getObjectAtPoint(startPoint, viewedPage.objects);
                if (objectToSelect && objectToSelect.type === 'image-placeholder' && !objectToSelect.imageData) { setTargetObjectId(objectToSelect.id); objectImageInputRef.current?.click(); return; }
                if (objectToSelect) { setSelectedObjectId(objectToSelect.id); setActionState({ type: 'moving', startPoint, initialObject: objectToSelect }); }
                else { setSelectedObjectId(null); setActionState({ type: 'panning', panStartPoint: { x: touch.clientX, y: touch.clientY } }); }
            }
        }
    };

    const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (pinchState.current.isPinching && e.touches.length === 2) {
            if (isDrawingToolActive) return;
            e.preventDefault(); const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const scale = (newDist / pinchState.current.initialDist) * pinchState.current.initialZoom; setZoom(Math.max(0.2, Math.min(scale, 5)));
        } else if (actionState.type === 'panning' && actionState.panStartPoint && e.touches.length === 1) {
            const touch = e.touches[0]; const dx = touch.clientX - actionState.panStartPoint.x; const dy = touch.clientY - actionState.panStartPoint.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy })); setActionState(s => ({ ...s, panStartPoint: { x: touch.clientX, y: touch.clientY } }));
        } else if ((actionState.type === 'drawing' || actionState.type === 'moving') && e.touches.length === 1) {
            e.preventDefault(); const currentPoint = getCanvasCoordinates(e); const { type, startPoint, initialObject } = actionState;
            if (type === 'drawing' && startPoint) { setPreviewObject({ id: 'preview', type: activeTool as DrawingTool, sp: startPoint, ep: currentPoint, color: drawingColor, strokeWidth }); }
            else if (type === 'moving' && initialObject) {
                const dx = currentPoint.x - startPoint!.x; const dy = currentPoint.y - startPoint!.y; const { sp, ep } = initialObject;
                setPreviewObject({ ...initialObject, sp: { x: sp.x + dx, y: sp.y + dy }, ep: { x: ep.x + dx, y: ep.y + dy } });
            }
        }
    };

    const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (pinchState.current.isPinching) { pinchState.current.isPinching = false; }
        else { handleCanvasMouseUp(e as unknown as React.MouseEvent<HTMLCanvasElement>); }
    };

    // Manual event listener attachment to fix passive event listener issues
    const canvasHandlersRef = useRef({
        handleCanvasTouchStart: (e: any) => { },
        handleCanvasTouchMove: (e: any) => { },
        handleCanvasTouchEnd: (e: any) => { }
    });

    useEffect(() => {
        canvasHandlersRef.current = {
            handleCanvasTouchStart: (e: any) => handleCanvasTouchStart(e as any),
            handleCanvasTouchMove: (e: any) => handleCanvasTouchMove(e as any),
            handleCanvasTouchEnd: (e: any) => handleCanvasTouchEnd(e as any)
        };
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onTouchStart = (e: TouchEvent) => canvasHandlersRef.current.handleCanvasTouchStart(e);
        const onTouchMove = (e: TouchEvent) => canvasHandlersRef.current.handleCanvasTouchMove(e);
        const onTouchEnd = (e: TouchEvent) => canvasHandlersRef.current.handleCanvasTouchEnd(e);

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });

        return () => {
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
        };
    }, []);



    const handleTextConfirm = (text: string, color: string, fontSize: number, fontFamily: string) => {
        setPendingTextConfig({ text, color, fontSize, fontFamily });
        setDrawingColor(color);
        setFontSize(fontSize);
        setFontFamily(fontFamily);
        setShowTextModal(false);
        setActiveTool('text');
    };

    // Helper to wrap text
    const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
        const words = text.split(''); // Split by char for CJK support? Or words for English?
        // For mixed content, character splitting is safer for wrapping, but English words shouldn't be split mid-word ideally.
        // Simple approach: split by words if space exists, else chars.
        // Given "Chinese" requirement, char splitting is better.
        // But let's try a hybrid approach or just char splitting for now as it's robust for CJK.
        // Actually, standard canvas text wrapping usually splits by words.
        // Let's stick to a simple char-based loop for now to ensure strict width compliance.

        let lines: string[] = [];
        let currentLine = '';

        // Preserve existing newlines
        const paragraphs = text.split('\n');

        paragraphs.forEach(paragraph => {
            const chars = paragraph.split('');
            let line = '';

            for (let n = 0; n < chars.length; n++) {
                const testLine = line + chars[n];
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;

                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = chars[n];
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
        });

        return lines;
    };

    function drawObject(ctx: CanvasRenderingContext2D, obj: EditorObject, options: { scaleX?: number, scaleY?: number } = {}) {
        const { scaleX = 1, scaleY = 1 } = options;
        const sp = { x: obj.sp.x * scaleX, y: obj.sp.y * scaleY };
        const ep = { x: obj.ep.x * scaleX, y: obj.ep.y * scaleY };
        const isImagePlaceholder = obj.type === 'image-placeholder';
        ctx.strokeStyle = isImagePlaceholder ? '#FF69B4' : (obj.color || 'red');
        ctx.fillStyle = isImagePlaceholder ? '#FF69B4' : (obj.color || 'red');
        ctx.lineWidth = (obj.strokeWidth || 2) * scaleX;

        // Handle rotation for vector objects
        ctx.save();
        if (viewedPage && viewedPage.rotation !== 0) {
            const rotation = viewedPage.rotation;
            const cx = ctx.canvas.width / 2;
            const cy = ctx.canvas.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate((rotation * Math.PI) / 180);

            // We need to translate back by the UNROTATED center
            // If rotation is 90 or 270, dimensions are swapped
            const isSwapped = rotation % 180 !== 0;
            const unrotatedWidth = isSwapped ? ctx.canvas.height : ctx.canvas.width;
            const unrotatedHeight = isSwapped ? ctx.canvas.width : ctx.canvas.height;
            ctx.translate(-unrotatedWidth / 2, -unrotatedHeight / 2);
        }

        switch (obj.type) {
            case 'line': ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(ep.x, ep.y); ctx.stroke(); break;
            case 'arrow':
                const headlen = Math.max(15, (obj.strokeWidth || 2) * 3) * scaleX; const angle = Math.atan2(ep.y - sp.y, ep.x - sp.x);
                const arrowBaseX = ep.x - headlen * Math.cos(Math.PI / 6) * Math.cos(angle); const arrowBaseY = ep.y - headlen * Math.cos(Math.PI / 6) * Math.sin(angle);
                ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(arrowBaseX, arrowBaseY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(ep.x, ep.y);
                ctx.lineTo(ep.x - headlen * Math.cos(angle - Math.PI / 6), ep.y - headlen * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(ep.x - headlen * Math.cos(angle + Math.PI / 6), ep.y - headlen * Math.sin(angle + Math.PI / 6));
                ctx.closePath(); ctx.fill(); break;
            case 'rect': ctx.strokeRect(Math.min(sp.x, ep.x), Math.min(sp.y, ep.y), Math.abs(ep.x - sp.x), Math.abs(ep.y - sp.y)); break;
            case 'image-placeholder':
                const x = Math.min(sp.x, ep.x); const y = Math.min(sp.y, ep.y); const w = Math.abs(sp.x - ep.x); const h = Math.abs(sp.y - ep.y);
                ctx.strokeRect(x, y, w, h);
                if (obj.imageData && loadedObjectImages.current.has(obj.id)) { const img = loadedObjectImages.current.get(obj.id); if (img) { ctx.drawImage(img, x, y, w, h); } }
                else if (!obj.imageData) {
                    const cx = x + w / 2; const cy = y + h / 2; const plusSize = Math.min(w, h) / 4;
                    ctx.beginPath(); ctx.moveTo(cx - plusSize, cy); ctx.lineTo(cx + plusSize, cy); ctx.moveTo(cx, cy - plusSize); ctx.lineTo(cx, cy + plusSize); ctx.stroke();
                } break;
            case 'circle':
                ctx.beginPath(); const radiusX = Math.abs(ep.x - sp.x) / 2; const radiusY = Math.abs(ep.y - sp.y) / 2;
                const centerX = Math.min(sp.x, ep.x) + radiusX; const centerY = Math.min(sp.y, ep.y) + radiusY;
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI); ctx.stroke(); break;
            case 'text':
                if (obj.text) {
                    const size = (obj.fontSize || 16) * scaleY; const family = obj.fontFamily || 'sans-serif';
                    ctx.font = `${size}px ${family}`; ctx.textBaseline = 'top';

                    // Use wrapText for auto-wrapping
                    // Width is determined by the object's bounds
                    const width = Math.abs(ep.x - sp.x);
                    // If width is too small (e.g. just created), default to no wrapping (infinity) or a safe min
                    const effectiveWidth = width < 20 ? 10000 : width;

                    const lines = wrapText(ctx, obj.text, effectiveWidth);
                    const lineHeight = (obj.fontSize || 16) * 1.2 * scaleY;

                    if (obj.backgroundColor && obj.backgroundColor !== 'transparent') {
                        ctx.fillStyle = obj.backgroundColor;
                        lines.forEach((line, index) => {
                            const metrics = ctx.measureText(line);
                            const textWidth = metrics.width;
                            ctx.fillRect(sp.x, sp.y + (index * lineHeight), textWidth, lineHeight);
                        });
                    }
                    ctx.fillStyle = obj.color || 'red';
                    lines.forEach((line, index) => {
                        ctx.fillText(line, sp.x, sp.y + (index * lineHeight));
                    });
                } break;
            case 'stamp':
                if (obj.text) {
                    const x = Math.min(sp.x, ep.x); const y = Math.min(sp.y, ep.y); const w = Math.abs(ep.x - sp.x); const h = Math.abs(ep.y - sp.y);
                    // Background
                    if (obj.backgroundColor) {
                        ctx.fillStyle = obj.backgroundColor;
                        // Draw rounded rect for stamp
                        const radius = 4 * scaleX;
                        ctx.beginPath();
                        ctx.moveTo(x + radius, y);
                        ctx.lineTo(x + w - radius, y);
                        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
                        ctx.lineTo(x + w, y + h - radius);
                        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
                        ctx.lineTo(x + radius, y + h);
                        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
                        ctx.lineTo(x, y + radius);
                        ctx.quadraticCurveTo(x, y, x + radius, y);
                        ctx.closePath();
                        ctx.fill();
                    }

                    // Text
                    ctx.fillStyle = obj.color || 'white';
                    const size = (obj.fontSize || 24) * scaleY;
                    ctx.font = `bold ${size}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(obj.text, x + w / 2, y + h / 2);
                    // Reset alignment
                    ctx.textAlign = 'start';
                    ctx.textBaseline = 'alphabetic';
                }
                break;
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current; const image = backgroundRef.current; const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || !image || !viewedPage) return;
        const { clientWidth, clientHeight } = image;
        if (canvas.width !== clientWidth || canvas.height !== clientHeight) { canvas.width = clientWidth; canvas.height = clientHeight; }
        else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
        const objectsToDraw = previewObject ? viewedPage.objects.filter(o => o.id !== previewObject.id) : viewedPage.objects;
        objectsToDraw.forEach(obj => drawObject(ctx, obj));
        if (previewObject) { drawObject(ctx, previewObject); }

        const currentSelectedObject = previewObject && previewObject.id === selectedObjectId ? previewObject : selectedObject;
        if (currentSelectedObject) {
            const { sp, ep } = currentSelectedObject; const x = Math.min(sp.x, ep.x); const y = Math.min(sp.y, ep.y); const w = Math.abs(sp.x - ep.x); const h = Math.abs(sp.y - ep.y);
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.7)'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
            const handles = getHandlesForObject(currentSelectedObject);
            const isLockedImage = currentSelectedObject.type === 'image-placeholder' && currentSelectedObject.imageData;
            if (!isLockedImage) { ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1; Object.values(handles).forEach(pos => { ctx.fillRect(pos.x - 4, pos.y - 4, 8, 8); ctx.strokeRect(pos.x - 4, pos.y - 4, 8, 8); }); }
        }
    }, [viewedPage, selectedObjectId, selectedObject, previewObject, zoom, pan, imageLoadedCount]);

    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        if (isDrawingToolActive) { canvas.style.cursor = 'crosshair'; } else if (actionState.type === 'moving') { canvas.style.cursor = 'grabbing'; } else if (actionState.type === 'resizing') { canvas.style.cursor = 'nwse-resize'; } else if (actionState.type === 'panning') { canvas.style.cursor = 'grabbing'; } else { canvas.style.cursor = 'grab'; }
    }, [activeTool, actionState.type, isDrawingToolActive]);

    return (
        <div className="flex flex-col h-screen bg-slate-900">
            {isLoading && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-[60]">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                    <p className="text-white mt-6 text-lg font-medium tracking-wide">處理中...</p>
                </div>
            )}

            <StampSettingsModal isOpen={showStampSettings} onClose={() => setShowStampSettings(false)} />

            <StampPickerModal
                isOpen={showStampPicker}
                onClose={() => setShowStampPicker(false)}
                stamps={stamps}
                onSelect={handleStampToolSelect}
                onManage={() => { setShowStampPicker(false); setShowStampSettings(true); }}
            />

            {/* Compression Modal */}
            {showCompressModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-700">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CompressIcon className="w-6 h-6 text-blue-400" />
                                壓縮 PDF
                            </h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600/50">
                                <p className="text-slate-400 text-sm mb-1">目前檔案大小</p>
                                <p className="text-2xl font-mono font-bold text-white">{formatBytes(currentProjectSize)}</p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300">選擇壓縮等級</label>
                                <div className="grid gap-3">
                                    <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${compressLevel === 'high' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>
                                        <input type="radio" name="compression" className="w-4 h-4 text-blue-500 focus:ring-offset-slate-800" checked={compressLevel === 'high'} onChange={() => setCompressLevel('high')} />
                                        <div className="ml-3">
                                            <span className="block text-sm font-bold text-white">輕微壓縮 (高品質)</span>
                                            <span className="block text-xs text-slate-400">保持原解析度，畫質最佳</span>
                                        </div>
                                    </label>
                                    <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${compressLevel === 'standard' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>
                                        <input type="radio" name="compression" className="w-4 h-4 text-blue-500 focus:ring-offset-slate-800" checked={compressLevel === 'standard'} onChange={() => setCompressLevel('standard')} />
                                        <div className="ml-3">
                                            <span className="block text-sm font-bold text-white">標準壓縮 (推薦)</span>
                                            <span className="block text-xs text-slate-400">保持原解析度，平衡畫質與大小</span>
                                        </div>
                                    </label>
                                    <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${compressLevel === 'low' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>
                                        <input type="radio" name="compression" className="w-4 h-4 text-blue-500 focus:ring-offset-slate-800" checked={compressLevel === 'low'} onChange={() => setCompressLevel('low')} />
                                        <div className="ml-3">
                                            <span className="block text-sm font-bold text-white">強力壓縮 (最小檔案)</span>
                                            <span className="block text-xs text-slate-400">降低解析度 (0.7x)，檔案最小</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/30">
                                <span className="text-sm text-indigo-200">預估壓縮後大小</span>
                                <span className="font-mono font-bold text-indigo-300">~{formatBytes(getEstimatedSize())}</span>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                <p className="text-yellow-200 text-xs flex items-start gap-2">
                                    <span className="mt-0.5">⚠️</span>
                                    注意：壓縮後 PDF 將轉換為圖片格式，文字將無法選取或搜尋。
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setShowCompressModal(false)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium">取消</button>
                            <button onClick={handleCompress} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 text-sm transition-all">開始壓縮</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header & Toolbar - Styled for Editor */}
            <header className="bg-slate-800 shadow-xl border-b border-slate-700 z-40 relative flex flex-col">
                {/* Top Row */}
                <div className="relative flex items-center h-14 px-3 bg-slate-800">
                    <div className="flex-1 flex items-center gap-2 overflow-hidden">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title={isSidebarOpen ? "收合側邊欄" : "展開側邊欄"}
                        >
                            <SidebarIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Center Menu */}
                    <div className="flex items-center justify-center gap-2">
                        <div className="relative" ref={fileMenu.ref}>
                            <button onClick={fileMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white transition-colors" aria-haspopup="true" aria-expanded={fileMenu.isOpen}>
                                <FileIcon className="w-4 h-4" /> <span className="hidden md:inline">檔案</span>
                            </button>
                            {fileMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-56 bg-slate-700 rounded-md shadow-lg py-1 z-50 border border-slate-600">
                                    <button onClick={handleAddPages} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 flex items-center gap-2">
                                        <PlusIcon className="w-4 h-4" /> 新增頁面/圖片
                                    </button>
                                    <div className="border-t border-slate-600 my-1"></div>
                                    <button onClick={() => { fileMenu.close(); setShowCompressModal(true); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 flex items-center gap-2">
                                        <CompressIcon className="w-4 h-4" /> 壓縮檔案
                                    </button>
                                    <div className="border-t border-slate-600 my-1"></div>
                                    <button onClick={() => { fileMenu.close(); setShowStampSettings(true); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 flex items-center gap-2">
                                        <StampIcon className="w-4 h-4" /> 設定印章
                                    </button>
                                    <div className="border-t border-slate-600 my-1"></div>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleSaveAndDownload(); }} className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-slate-600">
                                        <DownloadIcon className="w-4 h-4" /> 儲存並下載
                                    </a>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleShare(); }} className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-slate-600">
                                        <ShareIcon className="w-4 h-4" /> 儲存並分享
                                    </a>
                                    <div className="border-t border-slate-600 my-1"></div>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-slate-600">
                                        <XIcon className="w-4 h-4" /> 關閉
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={rotateMenu.ref}>
                            <button onClick={rotateMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white transition-colors" title="旋轉">
                                <RotateIcon className="w-4 h-4" /> <span className="hidden md:inline">旋轉</span>
                            </button>
                            {rotateMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-44 bg-slate-700 rounded-md shadow-lg py-1 z-50 border border-slate-600">
                                    <button onClick={handleRotateSelectedPages} disabled={selectedPages.size === 0} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50">
                                        旋轉選取 90° ({selectedPages.size})
                                    </button>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleRotateAllPages(); }} className="block px-4 py-2 text-sm text-white hover:bg-slate-600">全部旋轉 90°</a>
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={splitMenu.ref}>
                            <button onClick={splitMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white transition-colors" title="分割/刪除">
                                <SplitIcon className="w-4 h-4" /> <span className="hidden md:inline">分割/刪除</span>
                            </button>
                            {splitMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-44 bg-slate-700 rounded-md shadow-lg py-1 z-50 border border-slate-600">
                                    <button onClick={deletePages} disabled={selectedPages.size === 0} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50">
                                        刪除選取 ({selectedPages.size})
                                    </button>
                                    <button onClick={handleExportSelected} disabled={selectedPages.size === 0} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50">
                                        匯出選取 ({selectedPages.size})
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-end gap-2">
                        {showSaveSuccess && <span className="hidden md:inline text-green-400 text-sm animate-pulse ml-2 font-medium">已儲存!</span>}
                        <div className="font-bold text-slate-200 truncate max-w-[100px] md:max-w-xs bg-slate-900/50 px-2 py-1 rounded">
                            {projectName}
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div
                    style={{ top: `${toolbarY}%` }}
                    className={`
                    z-30 transition-all
                    fixed right-2 -translate-y-1/2 flex flex-col gap-4 bg-slate-800/90 p-2 rounded-2xl shadow-2xl backdrop-blur-md max-h-[70vh] overflow-y-auto no-scrollbar border border-slate-600/50
                    md:static md:flex-row md:translate-y-0 md:bg-slate-900/30 md:shadow-none md:p-2 md:h-auto md:w-full md:justify-center md:overflow-visible md:border-0
                `}>
                    {/* Mobile Drag Handle */}
                    <div
                        className="md:hidden flex justify-center cursor-ns-resize py-1 -mt-2 mb-1"
                        onTouchStart={handleToolbarDragStart}
                        onTouchMove={handleToolbarDragMove}
                        onTouchEnd={handleToolbarDragEnd}
                    >
                        <div className="w-8 h-1 bg-slate-600 rounded-full opacity-50"></div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
                        <div className="flex md:flex-row flex-col items-center gap-1 border-b md:border-b-0 md:border-r border-slate-600 pb-2 md:pb-0 md:pr-3 w-full md:w-auto justify-center">
                            <button onClick={handleUndo} disabled={!canUndo} className="p-2 hover:bg-slate-700 rounded-full disabled:opacity-30 transition-colors text-slate-300" title="上一步 (Ctrl+Z)">
                                <UndoIcon className="w-5 h-5" />
                            </button>
                            <button onClick={handleRedo} disabled={!canRedo} className="p-2 hover:bg-slate-700 rounded-full disabled:opacity-30 transition-colors text-slate-300" title="下一步">
                                <RedoIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex md:flex-row flex-col items-center gap-2">
                            <button onClick={() => setActiveTool('move')} title="移動" className={`p-2 rounded-full transition-all ${activeTool === 'move' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <HandIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('select-text' as any)} title="選取文字" className={`p-2 rounded-full transition-all ${activeTool === 'select-text' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <CursorTextIcon className="w-5 h-5" /> </button>

                            {/* Desktop Shape Tools */}
                            <div className="hidden md:flex items-center gap-2">
                                <button onClick={() => setActiveTool('line')} title="直線" className={`p-2 rounded-full transition-all ${activeTool === 'line' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <LineIcon className="w-5 h-5" /> </button>
                                <button onClick={() => setActiveTool('arrow')} title="箭頭" className={`p-2 rounded-full transition-all ${activeTool === 'arrow' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <ArrowIcon className="w-5 h-5" /> </button>
                                <button onClick={() => setActiveTool('rect')} title="方形" className={`p-2 rounded-full transition-all ${activeTool === 'rect' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <RectIcon className="w-5 h-5" /> </button>
                                <button onClick={() => setActiveTool('circle')} title="圓形" className={`p-2 rounded-full transition-all ${activeTool === 'circle' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <CircleIcon className="w-5 h-5" /> </button>
                            </div>

                            {/* Mobile Shape Menu (Accordion) */}
                            <div className="md:hidden flex flex-col items-center gap-2 w-full relative transition-all" ref={shapeMenu.ref}>
                                <button
                                    onClick={shapeMenu.toggle}
                                    title="繪圖工具"
                                    className={`p-2 rounded-full transition-all ${['line', 'arrow', 'rect', 'circle'].includes(activeTool || '') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                >
                                    <PenIcon className="w-5 h-5" />
                                </button>
                                {shapeMenu.isOpen && (
                                    <div className="flex flex-col gap-2 bg-slate-700/50 p-2 rounded-xl w-full items-center animate-fade-in border border-slate-600/30">
                                        <button onClick={() => { setActiveTool('line'); shapeMenu.close(); }} title="直線" className={`p-2 rounded-full transition-all ${activeTool === 'line' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-600'}`}> <LineIcon className="w-5 h-5" /> </button>
                                        <button onClick={() => { setActiveTool('arrow'); shapeMenu.close(); }} title="箭頭" className={`p-2 rounded-full transition-all ${activeTool === 'arrow' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-600'}`}> <ArrowIcon className="w-5 h-5" /> </button>
                                        <button onClick={() => { setActiveTool('rect'); shapeMenu.close(); }} title="方形" className={`p-2 rounded-full transition-all ${activeTool === 'rect' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-600'}`}> <RectIcon className="w-5 h-5" /> </button>
                                        <button onClick={() => { setActiveTool('circle'); shapeMenu.close(); }} title="圓形" className={`p-2 rounded-full transition-all ${activeTool === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-600'}`}> <CircleIcon className="w-5 h-5" /> </button>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setShowTextModal(true)} title="文字" className={`p-2 rounded-full transition-all ${activeTool === 'text' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <TextIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('image-placeholder')} title="疊加圖片" className={`p-2 rounded-full transition-all ${activeTool === 'image-placeholder' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <ImageIcon className="w-5 h-5" /> </button>

                            <button
                                onClick={() => setShowStampPicker(true)}
                                title="印章"
                                className={`p-2 rounded-full transition-all ${activeTool === 'stamp' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                                <StampIcon className="w-5 h-5" />
                            </button>
                        </div >

                        {isDrawingToolActive && (
                            <div className="flex md:flex-row flex-col items-center gap-3 pt-2 md:pt-0 md:pl-3 border-t md:border-t-0 md:border-l border-slate-600 w-full md:w-auto">
                                {activeTool !== 'image-placeholder' && activeTool !== 'stamp' && (
                                    <input type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} className="w-8 h-8 rounded-full bg-transparent cursor-pointer border-none p-0 overflow-hidden ring-2 ring-slate-600" />
                                )}
                                {activeTool !== 'text' && activeTool !== 'stamp' && (
                                    <div className="flex md:flex-row flex-col items-center gap-1">
                                        {[2, 5, 10].map(width => (
                                            <button key={width} onClick={() => setStrokeWidth(width)} className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${strokeWidth === width ? 'bg-slate-500' : 'hover:bg-slate-700'}`}>
                                                <div className="bg-white rounded-full" style={{ width: `${Math.min(width + 2, 14)}px`, height: `${Math.min(width + 2, 14)}px` }}></div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header >

            <div className="flex flex-1 overflow-hidden relative">
                {/* Desktop Sidebar */}
                <div
                    ref={sidebarRef}
                    className={`hidden md:flex flex-col bg-slate-800 border-r border-slate-700 overflow-y-auto custom-scrollbar flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-52 opacity-100' : 'w-0 opacity-0 border-r-0'}`}
                >
                    <div className="p-4 space-y-4">
                        {state?.pages?.map((page, index) => (
                            <div key={page.id}
                                draggable
                                onDragStart={() => setDraggedId(page.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(page.id)}
                                onDragEnd={() => setDraggedId(null)}
                                ref={el => {
                                    if (el) desktopThumbnailRefs.current.set(page.id, el);
                                    else desktopThumbnailRefs.current.delete(page.id);
                                }}
                                onClick={() => handleThumbnailClick(page.id)}
                                className={`
                                    relative w-full group cursor-pointer rounded-lg overflow-hidden border-2 transition-all bg-slate-900/50
                                    ${page.rotation % 180 !== 0 ? 'aspect-[4/3]' : 'aspect-[3/4]'}
                                    ${selectedPages.has(page.id) ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-transparent hover:border-slate-500'}
                                    ${viewedPageId === page.id && !selectedPages.has(page.id) ? 'border-slate-500' : ''}
                                    ${draggedId === page.id ? 'opacity-40 scale-95' : ''}
                                `}
                            >
                                {page.source.type === 'pdf' ? (
                                    <div className="w-full h-full p-1 flex items-center justify-center overflow-hidden bg-white">
                                        <div className="pointer-events-none origin-center w-full h-full flex items-center justify-center">
                                            <PDFPageView
                                                pdfBlob={state.pdfAssets?.[page.source.pdfId]}
                                                pageIndex={page.source.pageIndex}
                                                scale={0.3} // Small scale for thumbnail
                                                rotation={page.rotation}
                                                className="max-w-full max-h-full"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <img
                                        src={pageUrlCache.get(page.id)}
                                        className="w-full h-full object-contain p-1"
                                        style={{ transform: `rotate(${page.rotation}deg)` }}
                                        alt={`Page ${index + 1}`}
                                    />
                                )}
                                <div className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded-md shadow-sm">
                                    {index + 1}
                                </div>
                                {selectedPages.has(page.id) && (
                                    <div className="absolute bottom-1 left-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm">
                                        <CheckSquareIcon className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col flex-1 min-w-0 relative bg-slate-900">
                    {/* ... (Thumbnail container code remains same) */}
                    <div
                        ref={thumbnailContainerRef}
                        className={`md:hidden bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-3 overflow-x-auto no-scrollbar flex-shrink-0 relative z-30 shadow-md transition-all duration-300 ${isSidebarOpen ? 'h-24 opacity-100' : 'h-0 opacity-0 border-b-0 py-0'}`}
                        onWheel={handleThumbnailWheel}
                    >
                        {state.pages.map((page, index) => (
                            <div key={page.id}
                                ref={el => {
                                    if (el) thumbnailRefs.current.set(page.id, el);
                                    else thumbnailRefs.current.delete(page.id);
                                }}
                                draggable
                                onDragStart={() => setDraggedId(page.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(page.id)}
                                onDragEnd={() => setDraggedId(null)}
                                className={`
                                    relative h-20 min-w-[3.5rem] group cursor-pointer rounded-md overflow-hidden flex-shrink-0 border-2 transition-all
                                    ${selectedPages.has(page.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-transparent hover:border-slate-600'}
                                    ${viewedPageId === page.id && !selectedPages.has(page.id) ? 'border-slate-500' : ''}
                                    ${draggedId === page.id ? 'opacity-50' : ''}
                                `}
                                onClick={() => handleThumbnailClick(page.id)}
                            >
                                {page.source.type === 'pdf' ? (
                                    <div className="h-full w-auto p-0.5 flex items-center justify-center overflow-hidden bg-white">
                                        <div className="pointer-events-none origin-center w-full h-full flex items-center justify-center">
                                            <PDFPageView
                                                pdfBlob={state.pdfAssets?.[page.source.pdfId]}
                                                pageIndex={page.source.pageIndex}
                                                scale={0.2} // Smaller scale for mobile thumbnail
                                                rotation={page.rotation}
                                                className="max-w-full max-h-full"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <img
                                        src={pageUrlCache.get(page.id)}
                                        className="h-full w-auto object-contain bg-slate-900"
                                        style={{ transform: `rotate(${page.rotation}deg)` }}
                                        alt={`Page ${index + 1}`}
                                    />
                                )}
                                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-tl">
                                    {index + 1}
                                </div>
                                {selectedPages.has(page.id) && (
                                    <div className="absolute bottom-0 left-0 bg-blue-500 text-white rounded-tr p-0.5 shadow-sm">
                                        <CheckSquareIcon className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <main id="main-editor-view" className="flex-1 p-4 flex flex-col relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                        <div className="flex-grow overflow-hidden flex items-center justify-center">
                            {viewedPage ? (
                                <div className={`relative touch-none shadow-2xl ${activeTool === 'select-text' ? 'select-text' : 'select-none'}`} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: 'transform 0.2s ease-in-out', transformOrigin: 'center center' }}>
                                    {viewedPage.source.type === 'pdf' ? (
                                        <div
                                            ref={backgroundRef as React.RefObject<HTMLDivElement>}
                                            className={`${activeTool === 'select-text' ? 'pointer-events-auto' : 'pointer-events-none'} origin-center`}
                                            style={{ display: 'inline-block' }}
                                        >
                                            <PDFPageView
                                                pdfBlob={state.pdfAssets?.[viewedPage.source.pdfId]}
                                                pageIndex={viewedPage.source.pageIndex}
                                                scale={1.5}
                                                rotation={viewedPage.rotation}
                                                className="shadow-lg"
                                                onLoadSuccess={() => setImageLoadedCount(c => c + 1)}
                                            />
                                        </div>
                                    ) : (
                                        <img
                                            ref={backgroundRef as React.RefObject<HTMLImageElement>}
                                            src={pageUrlCache.get(viewedPage.id)}
                                            className="max-w-full max-h-full object-contain pointer-events-none"
                                            style={{ transform: `rotate(${viewedPage.rotation}deg)` }}
                                            onLoad={() => setImageLoadedCount(c => c + 1)}
                                        />
                                    )}
                                    <canvas
                                        ref={canvasRef}
                                        className={`absolute top-0 left-0 z-10 ${activeTool === 'select-text' ? 'pointer-events-none' : 'pointer-events-auto'}`}
                                        onMouseDown={handleCanvasMouseDown}
                                        onMouseMove={handleCanvasMouseMove}
                                        onMouseUp={handleCanvasMouseUp}
                                        onMouseLeave={handleCanvasMouseUp}
                                    />

                                </div>
                            ) : <p className="text-slate-500">沒有頁面可顯示</p>
                            }
                        </div>

                        {/* Page Indicator - Bottom Center */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-slate-800/30 backdrop-blur-md rounded-full px-4 py-2 text-white shadow-xl border border-slate-600/50 flex items-center gap-3">
                            <span className="text-sm font-medium tabular-nums">
                                {selectionMode === 'view'
                                    ? `頁面 (${viewedPageIndex > -1 ? viewedPageIndex + 1 : 0}/${state.pages.length})`
                                    : `已選取 ${selectedPages.size}`
                                }
                            </span>
                            <button
                                onClick={() => setSelectionMode(m => m === 'view' ? 'select' : 'view')}
                                className={`p-1.5 rounded-full hover:bg-slate-700 transition-colors ${selectionMode === 'select' ? 'text-blue-400 bg-slate-700/50' : 'text-white'}`}
                                title={selectionMode === 'view' ? '切換至多選模式' : '切換至檢視模式'}
                            >
                                {selectionMode === 'view' ? <CheckSquareIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                        </div>

                        {viewedPage && (
                            <div className="hidden md:flex flex-col absolute bottom-6 right-6 z-30 gap-2">
                                <div className="bg-slate-800/30 backdrop-blur-md rounded-full items-center text-white shadow-xl border border-slate-600/50 flex flex-col p-1.5 gap-1">
                                    <button onClick={handleZoomIn} className="p-2 hover:bg-slate-700 rounded-full transition-colors" title="放大">
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                    <div className="w-full h-px bg-slate-700/50"></div>
                                    <button onClick={handleResetZoom} className="p-2 hover:bg-slate-700 rounded-full transition-colors group" title="恢復 100%">
                                        <span className="text-[10px] font-mono font-bold group-hover:hidden">{Math.round(zoom * 100)}</span>
                                        <ResetZoomIcon className="w-5 h-5 hidden group-hover:block" />
                                    </button>
                                    <div className="w-full h-px bg-slate-700/50"></div>
                                    <button onClick={handleZoomOut} className="p-2 hover:bg-slate-700 rounded-full transition-colors" title="縮小">
                                        <MinusIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div >
            <input type="file" ref={fileInputRef} multiple accept="application/pdf,image/*" className="hidden" onChange={onAddFilesChange} />
            <input type="file" ref={objectImageInputRef} accept="image/*" className="hidden" onChange={onObjectImageChange} />
            <TextEditorModal
                isOpen={showTextModal}
                onClose={() => setShowTextModal(false)}
                onConfirm={handleTextConfirm}
                initialText={pendingTextConfig?.text || ''}
                initialColor={drawingColor}
                initialFontSize={fontSize}
                initialFontFamily={fontFamily}
            />
        </div>
    );
};

const ConfirmModal: React.FC<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={onCancel}>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-slate-300">{message}</p>
                </div>
                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium">取消</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-lg shadow-red-500/25 text-sm transition-all">確認刪除</button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [view, setView] = useState<'home' | 'editor' | 'merge-sort'>('home');
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    // ... (App component logic remains largely unchanged)
    const [currentProject, setCurrentProject] = useState<StoredProject | null>(null);
    const [isAppLoading, setIsAppLoading] = useState(false);

    // Merge State
    const [mergeFiles, setMergeFiles] = useState<File[]>([]);
    const [sortedMergeFiles, setSortedMergeFiles] = useState<MergeFileData[]>([]);
    const [showFileSortModal, setShowFileSortModal] = useState(false);

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; projectId: string | null }>({ isOpen: false, projectId: null });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mergeInputRef = useRef<HTMLInputElement>(null);

    const loadProjects = useCallback(async () => {
        try {
            const metas = await dbService.getProjectsMetadata();
            setProjects(metas);
        } catch (error) {
            console.error("Failed to load projects", error);
        }
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const handleCreateProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsAppLoading(true);
        try {
            const newPages: PageData[] = [];
            const pdfAssets: Record<string, Blob> = {};
            const sortedFiles = (Array.from(files) as File[]).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            for (let i = 0; i < sortedFiles.length; i++) {
                const file = sortedFiles[i];
                if (file.type === 'application/pdf') {
                    const pdfId = `pdf_${Date.now()}_${i}`;
                    pdfAssets[pdfId] = file;
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    for (let j = 1; j <= pdf.numPages; j++) {
                        newPages.push({ id: `page_${Date.now()}_${i}_${j}`, source: { type: 'pdf', pdfId, pageIndex: j }, rotation: 0, objects: [] });
                    }
                } else if (file.type.startsWith('image/')) { newPages.push({ id: `page_${Date.now()}_${i}`, source: { type: 'image', data: file }, rotation: 0, objects: [] }); }
            }
            if (newPages.length === 0) { throw new Error("No valid pages created"); }

            const pdfSize = Object.values(pdfAssets).reduce((acc, blob) => acc + blob.size, 0);
            const imagesSize = newPages.reduce((acc, p) => acc + (p.source.type === 'image' ? p.source.data.size : 0), 0);
            const totalSize = pdfSize + imagesSize;

            const newProject: StoredProject = { id: `proj_${Date.now()}`, name: sortedFiles.length === 1 ? sortedFiles[0].name : `新專案-${new Date().toLocaleDateString()}`, pages: newPages, pdfAssets: pdfAssets, timestamp: Date.now(), fileSize: totalSize };
            await dbService.saveProject(newProject);
            setCurrentProject(newProject);
            setView('editor');
            loadProjects();
        } catch (e) { console.error("Error creating project:", e); alert("無法開啟檔案 (可能格式不支援或已損壞)"); } finally { setIsAppLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleMergeSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) { setMergeFiles(Array.from(files)); setShowFileSortModal(true); }
        if (mergeInputRef.current) mergeInputRef.current.value = '';
    };

    const handleMergeConfirm = (sortedFiles: MergeFileData[]) => {
        setSortedMergeFiles(sortedFiles); setShowFileSortModal(false); setView('merge-sort');
    };

    const handleMergeSave = async (project: StoredProject) => {
        await dbService.saveProject(project); setCurrentProject(project); setView('editor'); loadProjects();
    };

    const handleDeleteProject = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setDeleteConfirm({ isOpen: true, projectId: id });
    };

    const confirmDeleteProject = async () => {
        if (!deleteConfirm.projectId) return;
        try {
            await dbService.deleteProject(deleteConfirm.projectId);
            loadProjects();
        } catch (error) {
            console.error("Failed to delete project:", error);
            alert("刪除失敗，請稍後再試。");
        } finally {
            setDeleteConfirm({ isOpen: false, projectId: null });
        }
    };

    const handleOpenProject = async (id: string) => {
        const project = await dbService.getProjectData(id);
        if (project) {
            // Normalize pages for legacy data
            project.pages = project.pages.map((p: any) => {
                if (p.source) return p;
                return { ...p, source: { type: 'image', data: p.data } };
            });
            setCurrentProject(project);
            setView('editor');
        } else { alert("找不到專案資料"); }
    };

    const handleHome = () => { setView('home'); setCurrentProject(null); loadProjects(); };

    return (
        <>
            {isAppLoading && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
                    <p className="text-white mt-4 font-light tracking-wider">正在建立專案...</p>
                </div>
            )}

            {view === 'home' && (
                <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
                    {/* Background Effects */}
                    <div className="fixed inset-0 z-0 pointer-events-none">
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]"></div>
                    </div>

                    <div className="max-w-7xl mx-auto relative z-10">
                        {/* Header Section */}
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 transform group-hover:rotate-3 transition-transform duration-300">
                                    <FileIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">照片與PDF 編輯工具</h1>
                                    <p className="text-slate-500 text-sm mt-1">輕鬆分割、合併與編輯您的照片或PDF 文件</p>
                                </div>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => mergeInputRef.current?.click()}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all duration-200 text-sm font-medium group shadow-sm hover:shadow-md"
                                >
                                    <MergeIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                    <span className="text-slate-300 group-hover:text-white">PDF合併與排序</span>
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all duration-200 transform hover:-translate-y-0.5 text-sm font-bold border border-indigo-500/50"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>新專案</span>
                                </button>
                            </div>
                        </header>

                        {/* Projects Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => handleOpenProject(project.id)}
                                    className="group bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 p-0 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col h-64"
                                >
                                    {/* Top Preview Area (Simulated) */}
                                    <div className="flex-1 bg-slate-950/50 relative overflow-hidden p-6 flex items-center justify-center">
                                        <div className="w-24 h-32 bg-white/5 border border-white/10 rounded shadow-2xl transform group-hover:scale-105 group-hover:-rotate-2 transition-transform duration-500 flex flex-col">
                                            <div className="h-2 w-full bg-indigo-500/20 border-b border-indigo-500/10"></div>
                                            <div className="flex-1 p-2 space-y-2">
                                                <div className="h-1 w-3/4 bg-white/10 rounded"></div>
                                                <div className="h-1 w-1/2 bg-white/10 rounded"></div>
                                                <div className="h-1 w-full bg-white/5 rounded"></div>
                                                <div className="h-1 w-full bg-white/5 rounded"></div>
                                            </div>
                                        </div>
                                        {/* Floating Actions */}
                                        <button
                                            onClick={(e) => handleDeleteProject(project.id, e)}
                                            className="absolute top-3 right-3 p-2 text-slate-400 hover:text-red-400 bg-slate-900/50 hover:bg-red-500/10 rounded-lg transition-all z-20"
                                            title="刪除專案"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Bottom Info Area */}
                                    <div className="p-4 bg-slate-900 border-t border-slate-800 group-hover:border-indigo-500/20 transition-colors">
                                        <h3 className="font-bold text-base mb-1 truncate text-slate-200 group-hover:text-indigo-300 transition-colors">{project.name}</h3>
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">編輯時間</span>
                                                <span className="text-xs text-slate-400 font-medium">{formatDate(project.timestamp).split(' ')[0]}</span>
                                                <span className="text-[10px] text-slate-500">{formatDate(project.timestamp).split(' ')[1]}</span>
                                            </div>
                                            <div className="flex flex-col gap-0.5 items-end">
                                                <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">資訊</span>
                                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                    {project.pageCount} 頁
                                                </span>
                                                <span className="text-[10px] text-slate-500">{formatBytes(project.fileSize)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {projects.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-32 text-slate-500 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                                    <div className="bg-slate-800 p-5 rounded-full mb-6 shadow-inner ring-1 ring-white/5">
                                        <FolderOpenIcon className="w-10 h-10 opacity-40" />
                                    </div>
                                    <p className="text-lg font-medium text-slate-400">尚無專案</p>
                                    <button onClick={() => fileInputRef.current?.click()} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                                        立即建立新專案
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} multiple accept="application/pdf,image/*" className="hidden" onChange={handleCreateProject} />
                    <input type="file" ref={mergeInputRef} multiple accept="application/pdf" className="hidden" onChange={handleMergeSelect} />
                    {showFileSortModal && <FileSortModal files={mergeFiles} onCancel={() => setShowFileSortModal(false)} onConfirm={handleMergeConfirm} />}
                    <ConfirmModal
                        isOpen={deleteConfirm.isOpen}
                        title="刪除專案"
                        message="確定要刪除此專案嗎？此動作無法復原。"
                        onConfirm={confirmDeleteProject}
                        onCancel={() => setDeleteConfirm({ isOpen: false, projectId: null })}
                    />
                </div>
            )}

            {view === 'editor' && currentProject && (
                <EditorPage
                    project={currentProject}
                    onSave={async (proj, newName) => { if (newName) proj.name = newName; await dbService.saveProject(proj); loadProjects(); }}
                    onClose={handleHome}
                />
            )}

            {view === 'merge-sort' && (
                <MergeSortPage sortedFiles={sortedMergeFiles} onSave={handleMergeSave} onCancel={() => setView('home')} />
            )}


        </>
    );
};

export default App;
