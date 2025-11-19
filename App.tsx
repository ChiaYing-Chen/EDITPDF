import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
// FIX: Dexie is a default export, not a named export. This resolves the error on `this.version(1)`.
// Fix: Import `Table` type directly from dexie and remove the unused `DexieType` alias. This resolves the error on `this.version(1)`.
import Dexie, { type Table } from 'dexie';
import { ProjectMetadata, StoredProject, EditorPageProps, EditorPageState, CompressionQuality, EditorObject, DrawingTool, PageData } from './types';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';


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
const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
        return projects.map(({ id, name, timestamp, pages }) => ({
            id,
            name,
            timestamp,
            pageCount: pages.length,
        }));
    },
    getProjectData: (id: string): Promise<StoredProject | undefined> => {
        return db.projects.get(id);
    },
    saveProject: (project: StoredProject): Promise<string> => {
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

// --- Components for Merge Feature ---

const FILE_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
];

const FileSortModal: React.FC<{
    files: File[];
    onCancel: () => void;
    onConfirm: (sortedFiles: MergeFileData[]) => void;
}> = ({ files, onCancel, onConfirm }) => {
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 text-white">
                <h2 className="text-xl font-bold mb-4">合併設定：文件排序與標記</h2>
                <p className="text-sm text-gray-400 mb-4">請調整文件順序，並設定顏色以便在後續步驟中識別。</p>
                
                <div className="max-h-[60vh] overflow-y-auto space-y-2 mb-6 pr-2">
                    {fileList.map((item, index) => (
                        <div key={item.id} className="flex items-center bg-gray-700 p-3 rounded border-l-4" style={{ borderColor: item.color }}>
                            <div className="flex flex-col gap-1 mr-2">
                                <button 
                                    onClick={() => moveFile(index, -1)} 
                                    disabled={index === 0}
                                    className="text-gray-400 hover:text-white disabled:opacity-30"
                                >
                                    ▲
                                </button>
                                <button 
                                    onClick={() => moveFile(index, 1)} 
                                    disabled={index === fileList.length - 1}
                                    className="text-gray-400 hover:text-white disabled:opacity-30"
                                >
                                    ▼
                                </button>
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className="truncate font-medium">{item.name}</p>
                                <p className="text-xs text-gray-400">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                                <input 
                                    type="color" 
                                    value={item.color} 
                                    onChange={(e) => changeColor(item.id, e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white">取消</button>
                    <button onClick={() => onConfirm(fileList)} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold">開始合併處理</button>
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
                        if(!context) continue;

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
            data: p.data,
            rotation: p.rotation,
            objects: []
        }));

        const newProject: StoredProject = {
            id: `proj_merge_${Date.now()}`,
            name: projectName,
            pages: projectPages,
            timestamp: Date.now()
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
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                <p className="text-lg">{loadingProgress}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <header className="bg-gray-800 shadow-md p-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <MergeIcon className="w-6 h-6 text-purple-400" />
                    <div>
                        <h1 className="font-bold text-lg">頁面排序與合併</h1>
                        <p className="text-xs text-gray-400">拖曳頁面以調整順序，顏色框代表不同原始檔案。</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <input 
                        type="text" 
                        value={projectName} 
                        onChange={(e) => setProjectName(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm w-64"
                        placeholder="專案名稱"
                    />
                    <button onClick={onCancel} className="px-4 py-2 text-gray-300 hover:text-white">取消</button>
                    <button onClick={handleFinish} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded font-bold shadow-lg">完成合併</button>
                </div>
            </header>

            <main className="flex-grow overflow-y-auto p-6">
                {pages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
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
                                className="relative group bg-gray-800 rounded transition-transform"
                            >
                                {/* Color Border Container */}
                                <div className="p-2 rounded-t border-4 border-b-0" style={{ borderColor: page.color }}>
                                    <div className="aspect-[3/4] bg-gray-700 flex items-center justify-center overflow-hidden relative">
                                        <img 
                                            src={urlCache.get(page.id)} 
                                            alt={`Page ${index + 1}`} 
                                            className="max-w-full max-h-full object-contain"
                                            style={{ transform: `rotate(${page.rotation}deg)` }}
                                        />
                                        {/* Hover Actions */}
                                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => rotatePage(index)} className="p-1.5 bg-gray-700 rounded-full hover:bg-gray-600 text-white" title="旋轉">
                                                <RotateIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => removePage(index)} className="p-1.5 bg-red-600 rounded-full hover:bg-red-500 text-white" title="刪除">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Footer Info */}
                                <div className="bg-gray-800 p-2 rounded-b border-4 border-t-0 text-center" style={{ borderColor: page.color }}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: page.color }}></span>
                                        <span className="text-xs font-mono text-gray-300">原始: P.{page.originalPageNum}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">新頁碼: {index + 1}</div>
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

const EditorPage: React.FC<EditorPageProps> = ({ project, onSave, onClose }) => {
    // History state for undo/redo
    const [history, setHistory] = useState<EditorPageState[]>([{ ...project, pages: project.pages.map(p => ({ ...p, rotation: p.rotation ?? 0, objects: p.objects || [] })) }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const state = history[historyIndex]; // Derived state

    const [pageUrlCache, setPageUrlCache] = useState<Map<string, string>>(new Map());
    // Ref to store valid URLs to prevent reloading image on every state change (like drawing)
    const activeUrlMap = useRef(new Map<string, string>());

    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set(project.pages.length > 0 ? [project.pages[0].id] : []));
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const [isDirty, setIsDirty] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('view');
    const [viewedPageId, setViewedPageId] = useState<string | null>(state.pages[0]?.id || null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    
    // Mobile state
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Drawing state
    const [activeTool, setActiveTool] = useState<EditorTool>('move');
    const [actionState, setActionState] = useState<ActionState>({ type: 'idle' });
    const [previewObject, setPreviewObject] = useState<EditorObject | null>(null);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, value: '' });
    // Force render triggering when image loads
    const [imageLoadedCount, setImageLoadedCount] = useState(0);

    // Drawing Style State
    const [drawingColor, setDrawingColor] = useState('#FF0000');
    const [textBackgroundColor, setTextBackgroundColor] = useState('transparent');
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [fontSize, setFontSize] = useState(16);
    const [fontFamily, setFontFamily] = useState('sans-serif');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);
    const thumbnailRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const pinchState = useRef({ isPinching: false, initialDist: 0, initialZoom: 1 });

    const fileMenu = useDropdown();
    const rotateMenu = useDropdown();
    const splitMenu = useDropdown();
    
    const viewedPage = state.pages.find(p => p.id === viewedPageId) || state.pages[0];
    const viewedPageIndex = state.pages.findIndex(p => p.id === viewedPageId);
    const selectedObject = viewedPage?.objects.find(o => o.id === selectedObjectId) || null;
    const isDrawingToolActive = activeTool && activeTool !== 'move';

    // Optimized URL Cache Logic: Only regenerate URLs if the page ID is new
    useEffect(() => {
        const currentMap = activeUrlMap.current;
        const newMap = new Map<string, string>();
        let hasChanges = false;

        state.pages.forEach(page => {
            if (currentMap.has(page.id)) {
                // Reuse existing URL
                newMap.set(page.id, currentMap.get(page.id)!);
            } else if (page.data instanceof Blob) {
                // Generate new URL
                const url = URL.createObjectURL(page.data);
                newMap.set(page.id, url);
                hasChanges = true;
            }
        });

        // Check for deleted pages (removed IDs)
        if (currentMap.size !== newMap.size) hasChanges = true;

        // Revoke URLs for pages that no longer exist
        currentMap.forEach((url, id) => {
            if (!newMap.has(id)) {
                URL.revokeObjectURL(url);
                hasChanges = true;
            }
        });

        activeUrlMap.current = newMap;
        
        // Only update state (triggering re-render of images) if map actually changed
        if (hasChanges) {
             setPageUrlCache(new Map(newMap));
        }
    }, [state.pages]);

    // Cleanup all URLs on unmount
    useEffect(() => {
        return () => {
            activeUrlMap.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);


    const updateState = (newState: EditorPageState, options: { keepSelection?: boolean } = {}) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);

        // Limit history to 10 undo steps + initial state (11 total)
        while (newHistory.length > 11) {
            newHistory.shift();
        }
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setIsDirty(true);
        if (!options.keepSelection) {
            setSelectedObjectId(null);
        }
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prevIndex => prevIndex - 1);
            setSelectedObjectId(null);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prevIndex => prevIndex + 1);
            setSelectedObjectId(null);
        }
    };

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    
    const generatePdf = async (pagesToExport: EditorPageState['pages'], filename: string) => {
        setIsLoading(true);
        try {
            const pdfDoc = await PDFDocument.create();
            for (const page of pagesToExport) {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                const img = new Image();
                
                const flattenedDataUrl = await new Promise<string>((resolve, reject) => {
                    img.onload = () => {
                        tempCanvas.width = img.naturalWidth;
                        tempCanvas.height = img.naturalHeight;
                        tempCtx!.drawImage(img, 0, 0);

                        const scaleX = img.naturalWidth / imageRef.current!.clientWidth;
                        const scaleY = img.naturalHeight / imageRef.current!.clientHeight;

                        (page.objects || []).forEach(obj => {
                            drawObject(tempCtx!, obj, { scaleX, scaleY });
                        });
                        resolve(tempCanvas.toDataURL('image/jpeg', 0.92));
                    };
                    img.onerror = () => reject(new Error('Image failed to load for PDF generation'));
                    const pageUrl = pageUrlCache.get(page.id);
                    if (!pageUrl) {
                        reject(new Error(`Could not find URL for page ${page.id}`));
                        return;
                    }
                    img.src = pageUrl;
                });

                const imageBytes = await fetch(flattenedDataUrl).then(res => res.arrayBuffer());
                const image = await pdfDoc.embedJpg(imageBytes);

                const { width, height } = image;
                const isRotated = page.rotation === 90 || page.rotation === 270;
                const pdfPage = pdfDoc.addPage(isRotated ? [height, width] : [width, height]);
                
                const drawOptions: any = {
                    width: image.width,
                    height: image.height,
                    rotate: degrees(-page.rotation), // Use negative for clockwise rotation to match CSS
                };

                // Adjust position based on clockwise rotation
                if (page.rotation === 90) {
                    drawOptions.x = image.width;
                    drawOptions.y = 0;
                } else if (page.rotation === 180) {
                    drawOptions.x = image.width;
                    drawOptions.y = image.height;
                } else if (page.rotation === 270) {
                    drawOptions.x = 0;
                    drawOptions.y = image.height;
                }
                
                pdfPage.drawImage(image, drawOptions);
            }
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("產生 PDF 失敗。");
            return false;
        } finally {
            setIsLoading(false);
        }
    };


    const handleSaveAndDownload = async () => {
        fileMenu.close();
        const projectToSave: StoredProject = {
            id: state.id,
            name: projectName,
            pages: state.pages,
            timestamp: Date.now()
        };
        await onSave(projectToSave, projectName);
        setIsDirty(false);

        const success = await generatePdf(state.pages, `${projectName.replace(/\.pdf$/i, '') || 'document'}.pdf`);

        if (success) {
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);
        }
    };


    const togglePageSelection = (pageId: string) => {
        setSelectedPages(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(pageId)) {
                newSelection.delete(pageId);
            } else {
                newSelection.add(pageId);
            }
            return newSelection;
        });
    };

    const handleThumbnailClick = (pageId: string) => {
        if (selectionMode === 'view') {
            setViewedPageId(pageId);
            setSelectedPages(new Set([pageId]));
            // Close sidebar on mobile after selection
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
            }
        } else { // 'select' mode
            togglePageSelection(pageId);
        }
    };
    
    const handleRotateSelectedPages = () => {
        rotateMenu.close();
        if (selectedPages.size === 0) return;
        const newState = {
            ...state,
            pages: state.pages.map(p => selectedPages.has(p.id) ? { ...p, rotation: ((p.rotation + 90) % 360) as any } : p),
        };
        updateState(newState);
    };

    const handleRotateAllPages = () => {
        rotateMenu.close();
        const newState = {
            ...state,
            pages: state.pages.map(p => ({ ...p, rotation: ((p.rotation + 90) % 360) as any })),
        };
        updateState(newState);
    };

    const deletePages = () => {
        splitMenu.close();
        if (selectedPages.size === 0) return;
        const newPages = state.pages.filter(p => !selectedPages.has(p.id));
        const newState = {
            ...state,
            pages: newPages,
        };
        // If the viewed page was deleted, view the first available page
        if (!newPages.some(p => p.id === viewedPageId)) {
            setViewedPageId(newPages[0]?.id || null);
        }
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
        if (selectedPages.size === 0) {
            alert("請先選取要匯出的頁面。");
            return;
        }
        const pagesToExport = state.pages.filter(p => selectedPages.has(p.id));
        generatePdf(pagesToExport, `${projectName.replace(/\.pdf$/i, '') || 'document'}_selection.pdf`);
    };

    const handleClose = () => {
        fileMenu.close();
        if (isDirty) {
            if (window.confirm("您有未儲存的變更。確定要關閉嗎？")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 5));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.2));
    const handleResetZoom = () => {
      setZoom(1);
      setPan({x: 0, y: 0});
    };
    
    // Use ref to avoid stale closures in keydown listener
    const handlersRef = useRef({ handleSaveAndDownload, handleUndo, canUndo });
    // Update ref on every render
    handlersRef.current = { handleSaveAndDownload, handleUndo, canUndo };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+S or Command+S
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handlersRef.current.handleSaveAndDownload();
            }
            // Check for Ctrl+Z or Command+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (handlersRef.current.canUndo) {
                    handlersRef.current.handleUndo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // Empty dependency array as we use ref

    // --- Interaction Handlers ---
    const handleSidebarWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation(); // Prevent main view from zooming
        const direction = e.deltaY > 0 ? 1 : -1;
        const currentIndex = state.pages.findIndex(p => p.id === viewedPageId);
        if (currentIndex === -1) return;
        const nextIndex = Math.max(0, Math.min(state.pages.length - 1, currentIndex + direction));
        const nextPage = state.pages[nextIndex];
        if (nextPage && nextPage.id !== viewedPageId) {
            setViewedPageId(nextPage.id);
            setSelectedPages(new Set([nextPage.id]));
            setTimeout(() => {
                thumbnailRefs.current.get(nextPage.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 0);
        }
    }, [state.pages, viewedPageId]);

    const handleMainViewWheel = (e: React.WheelEvent) => {
        // Prevent default scrolling of the page when inside the canvas area
        if (e.ctrlKey) {
             e.preventDefault();
        }

        // LOCK: If drawing tool is active, disable zoom entirely
        if (isDrawingToolActive) {
            // Explicitly prevent default to stop browser scroll as well, effectively "locking" the view
            e.preventDefault();
            return; 
        }
        
        e.preventDefault();
        const scaleAmount = e.deltaY * -0.001;
        setZoom(z => Math.max(0.2, Math.min(z + scaleAmount, 5)));
    };

    // --- Drawing Logic ---
    const getObjectAtPoint = (point: Point, objects: EditorObject[]): EditorObject | null => {
        // Iterate backwards to select top-most object
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            const { sp, ep } = obj;
            const minX = Math.min(sp.x, ep.x);
            const maxX = Math.max(sp.x, ep.x);
            const minY = Math.min(sp.y, ep.y);
            const maxY = Math.max(sp.y, ep.y);

            if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
                // coarse check, good enough for now
                return obj;
            }
        }
        return null;
    };
    
    const getHandlesForObject = (object: EditorObject) => {
        const { sp, ep } = object;
        const minX = Math.min(sp.x, ep.x);
        const maxX = Math.max(sp.x, ep.x);
        const minY = Math.min(sp.y, ep.y);
        const maxY = Math.max(sp.y, ep.y);
        return {
            'top-left': { x: minX, y: minY },
            'top-right': { x: maxX, y: minY },
            'bottom-left': { x: minX, y: maxY },
            'bottom-right': { x: maxX, y: maxY },
        };
    };

    const getHandleAtPoint = (point: Point, object: EditorObject | null): string | null => {
        if (!object) return null;
        const handles = getHandlesForObject(object);
        const handleSize = 8; // in pixels
        for (const [name, pos] of Object.entries(handles)) {
            if (
                point.x >= pos.x - handleSize / 2 &&
                point.x <= pos.x + handleSize / 2 &&
                point.y >= pos.y - handleSize / 2 &&
                point.y <= pos.y + handleSize / 2
            ) {
                return name;
            }
        }
        return null;
    };

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return { x: 0, y: 0 };
    
        const rect = image.getBoundingClientRect(); // This rect INCLUDES pan and zoom transforms.
        
        const interactionPoint = 'touches' in e ? e.touches[0] : e;
        const mouseX = interactionPoint.clientX;
        const mouseY = interactionPoint.clientY;

        const imageCenterX = rect.left + rect.width / 2;
        const imageCenterY = rect.top + rect.height / 2;
        
        // Vector from image center to mouse
        let vecX = mouseX - imageCenterX;
        let vecY = mouseY - imageCenterY;
    
        // Inverse rotation
        const rotation = viewedPage.rotation;
        const angleRad = -rotation * (Math.PI / 180);
        const rotatedX = vecX * Math.cos(angleRad) - vecY * Math.sin(angleRad);
        const rotatedY = vecX * Math.sin(angleRad) + vecY * Math.cos(angleRad);
    
        // Inverse scaling to get back to 1:1 image coordinates
        const unscaledX = rotatedX / zoom;
        const unscaledY = rotatedY / zoom;
    
        // Add back to the original image's unscaled center
        const finalX = (image.clientWidth / 2) + unscaledX;
        const finalY = (image.clientHeight / 2) + unscaledY;
    
        return { x: finalX, y: finalY };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // FIX: Prevent default browser behavior (like selection/drag)
        if (textInput.show) {
            textInputRef.current?.blur();
            return;
        }
        
        const startPoint = getCanvasCoordinates(e);

        if (isDrawingToolActive) {
            if (activeTool === 'text') {
                setSelectedObjectId(null);
                setTextInput({ show: true, x: startPoint.x, y: startPoint.y, value: '' });
                setTimeout(() => textInputRef.current?.focus(), 0);
            } else {
                setActionState({ type: 'drawing', startPoint });
                setSelectedObjectId(null);
            }
        } else { // Move/Select tool
            const handle = getHandleAtPoint(startPoint, selectedObject);
            if (handle) {
                setActionState({ type: 'resizing', startPoint, handle, initialObject: selectedObject! });
            } else {
                const objectToSelect = getObjectAtPoint(startPoint, viewedPage.objects);
                if (objectToSelect) {
                    setSelectedObjectId(objectToSelect.id);
                    setActionState({ type: 'moving', startPoint, initialObject: objectToSelect });
                } else {
                    setSelectedObjectId(null);
                    setActionState({ type: 'panning', panStartPoint: { x: e.clientX, y: e.clientY } });
                }
            }
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (actionState.type === 'panning' && actionState.panStartPoint) {
            const dx = e.clientX - actionState.panStartPoint.x;
            const dy = e.clientY - actionState.panStartPoint.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
            setActionState(s => ({ ...s, panStartPoint: { x: e.clientX, y: e.clientY } }));
            return;
        }

        if (actionState.type === 'idle') return;
        
        const currentPoint = getCanvasCoordinates(e);
        const { type, startPoint } = actionState;

        if (type === 'drawing' && startPoint) {
            setPreviewObject({
                id: 'preview',
                type: activeTool as DrawingTool,
                sp: startPoint,
                ep: currentPoint,
                color: drawingColor,
                strokeWidth: strokeWidth,
            });
        } else if (type === 'moving' && actionState.initialObject) {
            const dx = currentPoint.x - startPoint!.x;
            const dy = currentPoint.y - startPoint!.y;
            const { sp, ep } = actionState.initialObject;
            const updatedObject = {
                ...actionState.initialObject,
                sp: { x: sp.x + dx, y: sp.y + dy },
                ep: { x: ep.x + dx, y: ep.y + dy },
            };
            setPreviewObject(updatedObject);
        } else if (type === 'resizing' && actionState.initialObject && actionState.handle) {
             const { sp, ep } = actionState.initialObject;
             let newSp = { ...sp };
             let newEp = { ...ep };
             if (actionState.handle.includes('left')) {
                 newSp.x = currentPoint.x;
             }
             if (actionState.handle.includes('right')) {
                 newEp.x = currentPoint.x;
             }
             if (actionState.handle.includes('top')) {
                 newSp.y = currentPoint.y;
             }
             if (actionState.handle.includes('bottom')) {
                 newEp.y = currentPoint.y;
             }
             const updatedObject = { ...actionState.initialObject, sp: newSp, ep: newEp };
             setPreviewObject(updatedObject);
        }
    };

    const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (actionState.type === 'panning') {
            setActionState({ type: 'idle' });
            return;
        }
        if (actionState.type === 'idle') return;

        const endPoint = getCanvasCoordinates(e);
        const { type, startPoint } = actionState;
        let newObjects = [...(viewedPage?.objects || [])];
        let changesMade = false;

        if (type === 'drawing' && startPoint && (startPoint.x !== endPoint.x || startPoint.y !== endPoint.y)) {
            const newObject: EditorObject = {
                id: `obj_${Date.now()}`,
                type: activeTool as DrawingTool,
                sp: startPoint,
                ep: endPoint,
                color: drawingColor,
                strokeWidth: strokeWidth,
            };
            newObjects.push(newObject);
            changesMade = true;
        } else if ((type === 'moving' || type === 'resizing') && previewObject) {
            newObjects = newObjects.map(obj => obj.id === previewObject.id ? previewObject : obj);
            changesMade = true;
        }

        if (changesMade) {
            const newState = {
                ...state,
                pages: state.pages.map(p => p.id === viewedPageId ? { ...p, objects: newObjects } : p)
            };
            updateState(newState, { keepSelection: true });
        }
        
        setActionState({ type: 'idle' });
        setPreviewObject(null);
    };

    const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (e.touches.length === 2) {
            // LOCK: Disable pinch zoom when drawing
            if (isDrawingToolActive) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            pinchState.current = { isPinching: true, initialDist: dist, initialZoom: zoom };
            setActionState({type: 'idle'}); // End other actions
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            const startPoint = getCanvasCoordinates(e);

            if (isDrawingToolActive) {
                // Simplified: Touch doesn't support text input for now
                if (activeTool !== 'text') {
                    setActionState({ type: 'drawing', startPoint });
                    setSelectedObjectId(null);
                }
            } else {
                const objectToSelect = getObjectAtPoint(startPoint, viewedPage.objects);
                if (objectToSelect) {
                    setSelectedObjectId(objectToSelect.id);
                    setActionState({ type: 'moving', startPoint, initialObject: objectToSelect });
                } else {
                    setSelectedObjectId(null);
                    setActionState({ type: 'panning', panStartPoint: { x: touch.clientX, y: touch.clientY } });
                }
            }
        }
    };
    
    const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (pinchState.current.isPinching && e.touches.length === 2) {
            if (isDrawingToolActive) return;
            e.preventDefault();
            const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const scale = (newDist / pinchState.current.initialDist) * pinchState.current.initialZoom;
            setZoom(Math.max(0.2, Math.min(scale, 5)));
        } else if (actionState.type === 'panning' && actionState.panStartPoint && e.touches.length === 1) {
            const touch = e.touches[0];
            const dx = touch.clientX - actionState.panStartPoint.x;
            const dy = touch.clientY - actionState.panStartPoint.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
            setActionState(s => ({ ...s, panStartPoint: { x: touch.clientX, y: touch.clientY } }));
        } else if ((actionState.type === 'drawing' || actionState.type === 'moving') && e.touches.length === 1) {
             const currentPoint = getCanvasCoordinates(e);
             const { type, startPoint, initialObject } = actionState;
             if (type === 'drawing' && startPoint) {
                 setPreviewObject({ id: 'preview', type: activeTool as DrawingTool, sp: startPoint, ep: currentPoint, color: drawingColor, strokeWidth });
             } else if (type === 'moving' && initialObject) {
                 const dx = currentPoint.x - startPoint!.x;
                 const dy = currentPoint.y - startPoint!.y;
                 const { sp, ep } = initialObject;
                 setPreviewObject({ ...initialObject, sp: { x: sp.x + dx, y: sp.y + dy }, ep: { x: ep.x + dx, y: ep.y + dy } });
             }
        }
    };

    const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (pinchState.current.isPinching) {
            pinchState.current.isPinching = false;
        } else {
            handleCanvasMouseUp({} as React.MouseEvent<HTMLCanvasElement>); // Simulate mouse up
        }
    };
    
    const handleTextBlur = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (textInput.value && viewedPageId && ctx) {
            const text = textInput.value;
            const lines = text.split('\n');
            const size = fontSize;
            const family = fontFamily;
            ctx.font = `${size}px ${family}`;
    
            let maxWidth = 0;
            lines.forEach(line => {
                const metrics = ctx.measureText(line);
                if (metrics.width > maxWidth) {
                    maxWidth = metrics.width;
                }
            });
    
            // Use a standard line height multiplier for robust height calculation
            const lineHeight = size * 1.2;
            const totalHeight = lines.length * lineHeight;
    
            const newObject: EditorObject = {
                id: `obj_${Date.now()}`,
                type: 'text',
                sp: { x: textInput.x, y: textInput.y },
                ep: { x: textInput.x + maxWidth, y: textInput.y + totalHeight },
                text: text,
                color: drawingColor,
                backgroundColor: textBackgroundColor,
                fontFamily: family,
                fontSize: size,
            };
            const newState = {
                ...state,
                pages: state.pages.map(p => p.id === viewedPageId ? { ...p, objects: [...(p.objects || []), newObject] } : p)
            };
            updateState(newState);
        }
        setTextInput({ show: false, x: 0, y: 0, value: '' });
        setActiveTool('move');
    };
    
    const drawObject = (ctx: CanvasRenderingContext2D, obj: EditorObject, options: { scaleX?: number, scaleY?: number } = {}) => {
        const { scaleX = 1, scaleY = 1 } = options;
        const sp = { x: obj.sp.x * scaleX, y: obj.sp.y * scaleY };
        const ep = { x: obj.ep.x * scaleX, y: obj.ep.y * scaleY };
        
        ctx.strokeStyle = obj.color || 'red';
        ctx.fillStyle = obj.color || 'red';
        ctx.lineWidth = (obj.strokeWidth || 2) * scaleX;

        switch (obj.type) {
            case 'line':
                ctx.beginPath();
                ctx.moveTo(sp.x, sp.y);
                ctx.lineTo(ep.x, ep.y);
                ctx.stroke();
                break;
            case 'arrow':
                // Calculate arrowhead size based on stroke width so it looks proportional
                const headlen = Math.max(15, (obj.strokeWidth || 2) * 3) * scaleX;
                const angle = Math.atan2(ep.y - sp.y, ep.x - sp.x);
                
                // Calculate the point where the arrow base intersects the line
                // cos(30 deg) = 0.866. This is the projection of the side length onto the axis.
                const arrowBaseX = ep.x - headlen * Math.cos(Math.PI / 6) * Math.cos(angle);
                const arrowBaseY = ep.y - headlen * Math.cos(Math.PI / 6) * Math.sin(angle);

                // Main line - Stop at the base of the arrow
                ctx.beginPath();
                ctx.moveTo(sp.x, sp.y);
                ctx.lineTo(arrowBaseX, arrowBaseY); 
                ctx.stroke();

                // Arrowhead (filled triangle)
                ctx.beginPath();
                ctx.moveTo(ep.x, ep.y);
                // Sides
                ctx.lineTo(ep.x - headlen * Math.cos(angle - Math.PI / 6), ep.y - headlen * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(ep.x - headlen * Math.cos(angle + Math.PI / 6), ep.y - headlen * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fill();
                break;
            case 'rect':
                ctx.strokeRect(Math.min(sp.x, ep.x), Math.min(sp.y, ep.y), Math.abs(ep.x - sp.x), Math.abs(ep.y - sp.y));
                break;
            case 'circle':
                ctx.beginPath();
                const radiusX = Math.abs(ep.x - sp.x) / 2;
                const radiusY = Math.abs(ep.y - sp.y) / 2;
                const centerX = Math.min(sp.x, ep.x) + radiusX;
                const centerY = Math.min(sp.y, ep.y) + radiusY;
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                ctx.stroke();
                break;
            case 'text':
                if (obj.text) {
                    const size = (obj.fontSize || 16) * scaleY;
                    const family = obj.fontFamily || 'sans-serif';
                    ctx.font = `${size}px ${family}`;
                    ctx.textBaseline = 'top';
            
                    const lines = obj.text.split('\n');
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
                }
                break;
        }
    };
    
    // Combined effect for resizing canvas and drawing objects to prevent flicker.
    useEffect(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || !image || !viewedPage) return;

        // 1. Resize canvas to match image's rendered size
        const { clientWidth, clientHeight } = image;
        if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
            canvas.width = clientWidth;
            canvas.height = clientHeight;
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // 2. Redraw all objects
        const objectsToDraw = previewObject ? viewedPage.objects.filter(o => o.id !== previewObject.id) : viewedPage.objects;
        
        objectsToDraw.forEach(obj => drawObject(ctx, obj));

        if (previewObject) {
            drawObject(ctx, previewObject);
        }
        
        const currentSelectedObject = previewObject && previewObject.id === selectedObjectId ? previewObject : selectedObject;
        if (currentSelectedObject) {
            const { sp, ep } = currentSelectedObject;
            const x = Math.min(sp.x, ep.x);
            const y = Math.min(sp.y, ep.y);
            const w = Math.abs(sp.x - ep.x);
            const h = Math.abs(sp.y - ep.y);

            ctx.strokeStyle = 'rgba(0, 123, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
            
            const handles = getHandlesForObject(currentSelectedObject);
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            Object.values(handles).forEach(pos => {
                ctx.fillRect(pos.x - 4, pos.y - 4, 8, 8);
                ctx.strokeRect(pos.x - 4, pos.y - 4, 8, 8);
            });
        }
    }, [viewedPage, selectedObjectId, selectedObject, previewObject, zoom, pan, imageLoadedCount]); // Added imageLoadedCount

    // Update cursor based on action
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (isDrawingToolActive) {
            canvas.style.cursor = 'crosshair';
        } else if (actionState.type === 'moving') {
            canvas.style.cursor = 'grabbing';
        } else if (actionState.type === 'resizing') {
            canvas.style.cursor = 'nwse-resize'; // Simplified for now
        } else if (actionState.type === 'panning') {
            canvas.style.cursor = 'grabbing';
        } else {
            canvas.style.cursor = 'grab';
        }
    }, [activeTool, actionState.type, isDrawingToolActive]);
    
    return (
        <div className="flex flex-col h-screen bg-gray-900">
             {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-white mt-4">處理中，請稍候...</p>
                </div>
            )}
            
            {/* Header & Toolbar */}
            <header className="bg-gray-800 shadow-md z-40 relative flex flex-col">
                {/* Top Row: Meta Controls */}
                <div className="relative flex items-center h-14 px-3 border-b border-gray-700">
                    {/* Left Section */}
                    <div className="flex-1 flex items-center gap-2 overflow-hidden">
                         {/* Mobile Sidebar Toggle */}
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="md:hidden p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded mr-1 shrink-0"
                        >
                            <MenuIcon className="w-6 h-6" />
                        </button>
                        
                        {/* Page Info & Select Mode - Desktop Only */}
                        <div className="hidden md:flex items-center gap-2 md:gap-4 shrink-0">
                            <h2 className="text-xs md:text-sm font-semibold tabular-nums whitespace-nowrap">
                                {selectionMode === 'view'
                                    ? `頁面 (${viewedPageIndex > -1 ? viewedPageIndex + 1 : 0}/${state.pages.length})`
                                    : `已選取 ${selectedPages.size}`
                                }
                            </h2>
                            <button 
                                onClick={() => setSelectionMode(m => m === 'view' ? 'select' : 'view')} 
                                className={`p-2 md:p-2.5 rounded hover:bg-gray-700 ${selectionMode === 'select' ? 'text-blue-400' : 'text-gray-400'}`}
                                title={selectionMode === 'view' ? '切換至多選模式' : '切換至檢視模式'}
                            >
                                {selectionMode === 'view' ? <CheckSquareIcon className="w-5 h-5 md:w-6 md:h-6" /> : <EyeIcon className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Center Section */}
                    <div className="flex items-center justify-center gap-2">
                        {/* Menus */}
                        <div className="relative" ref={fileMenu.ref}>
                            <button onClick={fileMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors" aria-haspopup="true" aria-expanded={fileMenu.isOpen}>
                                <FileIcon className="w-4 h-4" /> <span className="hidden md:inline">檔案</span>
                            </button>
                            {fileMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-50 border border-gray-600">
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleSaveAndDownload(); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-600">儲存並下載 PDF (Ctrl+S)</a>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleClose(); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-600">關閉</a>
                                </div>
                            )}
                        </div>

                        {/* Rotate Menu */}
                        <div className="relative" ref={rotateMenu.ref}>
                            <button onClick={rotateMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors" title="旋轉">
                                <RotateIcon className="w-4 h-4" /> <span className="hidden md:inline">旋轉</span>
                            </button>
                                {rotateMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-50 border border-gray-600">
                                        <button onClick={handleRotateSelectedPages} disabled={selectedPages.size === 0} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50">
                                        旋轉選取 90° ({selectedPages.size})
                                    </button>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleRotateAllPages(); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-600">全部旋轉 90°</a>
                                </div>
                            )}
                        </div>

                        {/* Split/Delete Menu */}
                        <div className="relative" ref={splitMenu.ref}>
                            <button onClick={splitMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors" title="分割/刪除">
                                <SplitIcon className="w-4 h-4" /> <span className="hidden md:inline">分割/刪除</span>
                            </button>
                            {splitMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-50 border border-gray-600">
                                    <button onClick={deletePages} disabled={selectedPages.size === 0} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50">
                                        刪除選取 ({selectedPages.size})
                                    </button>
                                    <button onClick={handleExportSelected} disabled={selectedPages.size === 0} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50">
                                        匯出選取 ({selectedPages.size})
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Right Side: Project Name */}
                    <div className="flex-1 flex items-center justify-end gap-2">
                         {showSaveSuccess && <span className="hidden md:inline text-green-400 text-sm animate-pulse ml-2">已儲存!</span>}
                        <div className="font-bold text-white truncate max-w-[100px] md:max-w-xs">
                            {projectName}
                        </div>
                    </div>
                </div>

                {/* Bottom Row (Mobile) / Inline (Desktop): Editing Tools */}
                <div className="flex items-center justify-center px-3 py-2 bg-gray-900/50 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-3 md:gap-4 min-w-max">
                        {/* History */}
                        <div className="flex items-center gap-1 border-r border-gray-600 pr-3">
                            <button onClick={handleUndo} disabled={!canUndo} className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-30" title="上一步 (Ctrl+Z)">
                                <UndoIcon className="w-5 h-5" />
                            </button>
                            <button onClick={handleRedo} disabled={!canRedo} className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-30" title="下一步">
                                <RedoIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawing Tools */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => setActiveTool('move')} title="移動" className={`p-2 rounded-full ${activeTool === 'move' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}> <HandIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('line')} title="直線" className={`p-2 rounded-full ${activeTool === 'line' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}> <LineIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('arrow')} title="箭頭" className={`p-2 rounded-full ${activeTool === 'arrow' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}> <ArrowIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('rect')} title="方形" className={`p-2 rounded-full ${activeTool === 'rect' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}> <RectIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('circle')} title="圓形" className={`p-2 rounded-full ${activeTool === 'circle' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}> <CircleIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('text')} title="文字" className={`p-2 rounded-full ${activeTool === 'text' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}> <TextIcon className="w-5 h-5" /> </button>
                        </div>
                        
                        {isDrawingToolActive && (
                            <div className="flex items-center gap-3 pl-3 border-l border-gray-600">
                                <input type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} className="w-8 h-8 rounded bg-transparent cursor-pointer border-none p-0" />
                                
                                {activeTool !== 'text' && (
                                     <div className="flex items-center gap-1">
                                        {[2, 5, 10].map(width => (
                                            <button key={width} onClick={() => setStrokeWidth(width)} className={`w-6 h-6 flex items-center justify-center rounded-full ${strokeWidth === width ? 'bg-gray-600' : ''}`}>
                                                <div className="bg-white rounded-full" style={{width: `${Math.min(width+2, 14)}px`, height: `${Math.min(width+2, 14)}px`}}></div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                 {activeTool === 'text' && (
                                    <div className="flex items-center gap-2 md:gap-3">
                                        {/* Font Size */}
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="bg-gray-700 border border-gray-600 rounded w-10 md:w-12 px-1 text-sm text-center text-white" />
                                            <span className="text-xs text-gray-400 hidden md:inline">px</span>
                                        </div>
                                        
                                        {/* Font Family */}
                                        <select 
                                            value={fontFamily} 
                                            onChange={(e) => setFontFamily(e.target.value)} 
                                            className="bg-gray-700 text-white border border-gray-600 rounded text-xs md:text-sm h-8 px-1 max-w-[80px] md:max-w-[120px]"
                                        >
                                            <option value="sans-serif">Sans Serif</option>
                                            <option value="serif">Serif</option>
                                            <option value="monospace">Mono</option>
                                            <option value="Arial">Arial</option>
                                            <option value="Times New Roman">Times New Roman</option>
                                            <option value="Courier New">Courier New</option>
                                            <option value="Georgia">Georgia</option>
                                            <option value="Verdana">Verdana</option>
                                        </select>

                                        {/* Background Color */}
                                        <div className="flex items-center gap-2 border-l border-gray-600 pl-2 md:pl-3">
                                             <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={textBackgroundColor !== 'transparent'} 
                                                    onChange={(e) => setTextBackgroundColor(e.target.checked ? '#ffffff' : 'transparent')} 
                                                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-0 w-3 h-3 md:w-4 md:h-4"
                                                />
                                                <span className="hidden md:inline">背景</span>
                                             </label>
                                             {textBackgroundColor !== 'transparent' && (
                                                 <input 
                                                    type="color" 
                                                    value={textBackgroundColor} 
                                                    onChange={(e) => setTextBackgroundColor(e.target.value)} 
                                                    className="w-6 h-6 md:w-8 md:h-8 rounded bg-transparent cursor-pointer border-none p-0" 
                                                    title="背景顏色"
                                                 />
                                             )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-grow flex overflow-hidden relative">
                {/* Mobile Sidebar Backdrop */}
                {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar (Thumbnails) - Responsive Drawer */}
                <aside 
                    ref={sidebarRef}
                    className={`
                        flex-shrink-0 bg-gray-800 overflow-y-auto transition-transform duration-300 ease-in-out z-40
                        fixed inset-y-0 left-0 w-64 shadow-2xl transform
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        md:relative md:translate-x-0 md:w-56 md:shadow-none md:block
                    `}
                    onWheel={handleSidebarWheel}
                >
                    {/* Mobile Sidebar Header Controls */}
                    <div className="md:hidden flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800 sticky top-0 z-10">
                         <h2 className="text-sm font-semibold text-white tabular-nums">
                            {selectionMode === 'view'
                                ? `頁面 (${viewedPageIndex > -1 ? viewedPageIndex + 1 : 0}/${state.pages.length})`
                                : `已選取 ${selectedPages.size}`
                            }
                        </h2>
                        <button 
                            onClick={() => setSelectionMode(m => m === 'view' ? 'select' : 'view')} 
                            className={`p-2 rounded hover:bg-gray-700 ${selectionMode === 'select' ? 'text-blue-400' : 'text-gray-400'}`}
                            title={selectionMode === 'view' ? '切換至多選模式' : '切換至檢視模式'}
                        >
                            {selectionMode === 'view' ? <CheckSquareIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>

                     <div className="grid grid-cols-2 md:grid-cols-1 gap-2 p-2 pb-20 md:pb-0">
                        {state.pages.map(page => (
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
                                className={`relative aspect-square group cursor-pointer border-2 bg-gray-900/50 rounded-md overflow-hidden ${selectedPages.has(page.id) ? 'border-blue-500' : 'border-transparent'} ${draggedId === page.id ? 'opacity-50' : ''}`}
                                onClick={() => handleThumbnailClick(page.id)}
                            >
                                <img src={pageUrlCache.get(page.id)} className="w-full h-full object-contain" style={{transform: `rotate(${page.rotation}deg)`}} />
                                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-tl">
                                    {state.pages.findIndex(p => p.id === page.id) + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
                
                {/* Main Canvas Area */}
                <main className="flex-1 p-4 flex flex-col bg-gray-900 relative overflow-hidden" onWheel={handleMainViewWheel}>
                    <div className="flex-grow overflow-hidden flex items-center justify-center">
                        {viewedPage ? (
                            <div className="relative touch-none select-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: 'transform 0.2s ease-in-out', transformOrigin: 'center center' }}>
                               <img 
                                    ref={imageRef} 
                                    src={pageUrlCache.get(viewedPage.id)} 
                                    className="max-w-full max-h-full object-contain shadow-lg transition-transform duration-200 pointer-events-none" 
                                    style={{transform: `rotate(${viewedPage.rotation}deg)`}}
                                    onLoad={() => setImageLoadedCount(c => c + 1)}
                               />
                               <canvas
                                    ref={canvasRef}
                                    className={`absolute top-0 left-0 pointer-events-auto z-10`}
                                    style={{ transform: `rotate(${viewedPage.rotation}deg)` }}
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                    onTouchStart={handleCanvasTouchStart}
                                    onTouchMove={handleCanvasTouchMove}
                                    onTouchEnd={handleCanvasTouchEnd}
                               />
                               {textInput.show && (
                                   <textarea
                                       ref={textInputRef}
                                       value={textInput.value}
                                       onChange={(e) => setTextInput(t => ({...t, value: e.target.value}))}
                                       onBlur={handleTextBlur}
                                       className="absolute border p-1 z-20 overflow-auto resize whitespace-pre"
                                       style={{ 
                                           left: textInput.x * zoom, 
                                           top: textInput.y * zoom, 
                                           fontSize: fontSize * zoom,
                                           fontFamily: fontFamily,
                                           color: drawingColor,
                                           borderColor: drawingColor,
                                           backgroundColor: textBackgroundColor,
                                           transform: `rotate(${viewedPage.rotation}deg)`,
                                           transformOrigin: 'top left',
                                           minWidth: `${100 * zoom}px`,
                                           minHeight: `${(fontSize * 1.5) * zoom}px`
                                        }}
                                   />
                               )}
                            </div>
                            ) : <p className="text-gray-500">沒有頁面可顯示</p>
                        }
                    </div>
                    
                    {/* Zoom Controls */}
                    {viewedPage && (
                        <div className="absolute bottom-6 right-6 z-30 bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center text-white shadow-xl border border-gray-700">
                            <button onClick={handleZoomOut} className="p-3 hover:bg-gray-700 rounded-full transition-colors" title="縮小">
                                <MinusIcon className="w-5 h-5" />
                            </button>
                            <span className="px-1 text-sm font-mono font-semibold w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                             <button onClick={handleResetZoom} className="p-3 hover:bg-gray-700 rounded-full transition-colors" title="恢復 100%">
                                <ResetZoomIcon className="w-5 h-5" />
                            </button>
                            <button onClick={handleZoomIn} className="p-3 hover:bg-gray-700 rounded-full transition-colors" title="放大">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [currentProject, setCurrentProject] = useState<StoredProject | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [mergeFiles, setMergeFiles] = useState<File[]>([]);
    const [showMergeSort, setShowMergeSort] = useState(false);
    const [sortedMergeFiles, setSortedMergeFiles] = useState<MergeFileData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const loadProjects = useCallback(async () => {
        try {
            const projs = await dbService.getProjectsMetadata();
            setProjects(projs);
        } catch (error) {
            console.error("Failed to load projects", error);
        }
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const handleCreateProject = async (file: File) => {
        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const pages: PageData[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.0 }); // Thumbnail
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) continue;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                };
                await page.render(renderContext).promise;

                const blob = await new Promise<Blob | null>(resolve => 
                    canvas.toBlob(resolve, 'image/jpeg', CompressionQuality.NORMAL)
                );

                if (blob) {
                    pages.push({
                        id: `page_${Date.now()}_${i}`,
                        data: blob,
                        rotation: 0,
                        objects: []
                    });
                }
            }

            const newProject: StoredProject = {
                id: `proj_${Date.now()}`,
                name: file.name.replace(/\.pdf$/i, ''),
                pages: pages,
                timestamp: Date.now()
            };

            await dbService.saveProject(newProject);
            await loadProjects();
            setCurrentProject(newProject);
        } catch (error) {
            console.error("Error creating project:", error);
            alert("建立專案失敗。");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateProjectFromImages = async (files: File[]) => {
        setIsProcessing(true);
        try {
            const pages: PageData[] = [];
            // Sort by name to ensure order
            const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            for (let i = 0; i < sortedFiles.length; i++) {
                const file = sortedFiles[i];
                // Ensure it's an image
                if (!file.type.startsWith('image/')) continue;

                pages.push({
                    id: `page_${Date.now()}_${i}`,
                    data: file,
                    rotation: 0,
                    objects: []
                });
            }

            if (pages.length === 0) {
                alert("請選擇有效的圖片檔案。");
                return;
            }

            const newProject: StoredProject = {
                id: `proj_img_${Date.now()}`,
                name: files.length === 1 ? files[0].name.split('.')[0] : `圖片專案 ${new Date().toLocaleDateString()}`,
                pages: pages,
                timestamp: Date.now()
            };

            await dbService.saveProject(newProject);
            await loadProjects();
            setCurrentProject(newProject);

        } catch (error) {
            console.error("Error creating project from images:", error);
            alert("建立專案失敗。");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleOpenProject = async (id: string) => {
        const project = await dbService.getProjectData(id);
        if (project) {
            setCurrentProject(project);
        }
    };
    
    const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('您確定要刪除此專案嗎？')) {
            await dbService.deleteProject(id);
            await loadProjects();
        }
    };

    const handleSaveProject = async (project: StoredProject, newName?: string) => {
        const updatedProject = { ...project, timestamp: Date.now() };
        if (newName) {
            updatedProject.name = newName;
        }
        await dbService.saveProject(updatedProject);
        await loadProjects();
        
        // Update current project state if it's the one being edited
        if (currentProject && currentProject.id === project.id) {
             setCurrentProject(updatedProject);
        } else if (!currentProject) {
            // If we just saved a new merged project
             setCurrentProject(updatedProject);
        }
    };

    const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            // If one file and it's a PDF, treat as standard PDF project
            if (files.length === 1 && files[0].type === 'application/pdf') {
                await handleCreateProject(files[0]);
            } else {
                // Otherwise, treat as image project (multiple or single image)
                await handleCreateProjectFromImages(Array.from(files));
            }
        }
        event.target.value = '';
    };

    const onMergeFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
         if (event.target.files && event.target.files.length > 0) {
            setMergeFiles(Array.from(event.target.files));
            setIsMerging(true);
            setShowMergeSort(false);
        }
        event.target.value = '';
    };

    const handleMergeConfirm = (sorted: MergeFileData[]) => {
        setSortedMergeFiles(sorted);
        setShowMergeSort(true);
        setIsMerging(false); // Close modal
    };

    if (currentProject) {
        return (
            <EditorPage 
                project={currentProject} 
                onSave={handleSaveProject} 
                onClose={() => {
                    setCurrentProject(null);
                    loadProjects(); // Refresh list when closing
                }} 
            />
        );
    }

    if (showMergeSort) {
        return (
            <MergeSortPage
                sortedFiles={sortedMergeFiles}
                onSave={async (project) => {
                    await handleSaveProject(project);
                    setShowMergeSort(false);
                    setCurrentProject(project);
                }}
                onCancel={() => setShowMergeSort(false)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            {isProcessing && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-white mt-4">處理中，請稍候...</p>
                </div>
            )}

            {isMerging && (
                <FileSortModal 
                    files={mergeFiles} 
                    onCancel={() => setIsMerging(false)} 
                    onConfirm={handleMergeConfirm} 
                />
            )}
            
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row items-center justify-between mb-10 border-b border-gray-700 pb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                            PDF 編輯與合併工具
                        </h1>
                        <p className="text-gray-400 mt-1">在瀏覽器中直接管理、編輯與合併您的 PDF 文件，安全無虞。</p>
                    </div>
                    <div className="flex gap-4">
                        <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors">
                            <input type="file" accept="application/pdf" multiple onChange={onMergeFilesChange} className="hidden" />
                            <MergeIcon className="w-5 h-5" />
                            合併 PDF
                        </label>
                         <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/50">
                            <input type="file" accept="application/pdf, image/png, image/jpeg, image/jpg" multiple onChange={onFileChange} className="hidden" />
                            <PlusIcon className="w-5 h-5" />
                            新增專案
                        </label>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => (
                        <div 
                            key={project.id} 
                            onClick={() => handleOpenProject(project.id)}
                            className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-blue-500 cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-900/20 group relative"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-gray-700 rounded-lg group-hover:bg-blue-900/30 group-hover:text-blue-400 transition-colors">
                                    <FileIcon className="w-8 h-8" />
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteProject(project.id, e)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    title="刪除專案"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <h3 className="font-bold text-lg truncate mb-1" title={project.name}>{project.name}</h3>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                                <span>{project.pageCount} 頁</span>
                                <span>{new Date(project.timestamp).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                    
                    {projects.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                            <div className="mb-4 mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                                <FolderOpenIcon className="w-8 h-8 text-gray-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-400">尚未建立專案</h3>
                            <p className="max-w-md mx-auto mt-2">上傳 PDF 開始編輯，或選取多個 PDF 進行合併。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;