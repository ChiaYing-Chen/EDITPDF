

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
// FIX: The error on `this.version(1)` was due to a schema mismatch.
// The `StoredProject` type was missing the `timestamp` property defined in the schema.
// By adding `timestamp` to `StoredProject` and related types, the inconsistency is resolved.
import Dexie, { type Table } from 'dexie';
import { ProjectMetadata, StoredProject, EditorPageProps, EditorPageState, CompressionQuality, EditorObject, DrawingTool, PageData } from './types';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';


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
        <path d="M12 2 L12 22 M2 12 L22 12 M9 5 L12 2 L15 5 M9 19 L12 22 L15 19 M5 9 L2 12 L5 15 M19 9 L22 12 L19 15" />
    </svg>
);
const LineIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18" transform="rotate(45 12 12)" />
    </svg>
);
const ArrowIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
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


// --- Dexie DB Service ---
class ProjectDB extends Dexie {
    projects!: Table<StoredProject, string>;

    constructor() {
        super('PDFEditorDB');
        // FIX: The error "Property 'version' does not exist on type 'ProjectDB'" was caused by an inconsistency
        // between the StoredProject type and the schema. The `timestamp` property was used here and for sorting,
        // but it was missing from the StoredProject interface in types.ts.
        // Aligning the type with the schema resolves the error.
        this.version(1).stores({
            projects: 'id, name, timestamp', // Primary key and indexed properties
        });
    }
}

const db = new ProjectDB();

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

    // Drawing state
    const [activeTool, setActiveTool] = useState<EditorTool>('move');
    const [actionState, setActionState] = useState<ActionState>({ type: 'idle' });
    const [previewObject, setPreviewObject] = useState<EditorObject | null>(null);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, value: '' });

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

    useEffect(() => {
        const urls = new Map<string, string>();
        for (const page of state.pages) {
            if (page.data instanceof Blob) {
                urls.set(page.id, URL.createObjectURL(page.data));
            }
        }
        setPageUrlCache(urls);

        return () => {
            for (const url of urls.values()) {
                URL.revokeObjectURL(url);
            }
        };
    }, [state]);

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
        // FIX: Construct the project object from the current editor state to ensure all data,
        // including the timestamp, is passed correctly for saving.
        const projectToSave: StoredProject = {
            ...state,
            name: projectName,
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
        } else if ((type === 'moving' || type === 'resizing') && previewObject) {
            newObjects = newObjects.map(obj => obj.id === previewObject.id ? previewObject : obj);
        }

        if (type !== 'idle') {
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
                const headlen = 15 * scaleX;
                const angle = Math.atan2(ep.y - sp.y, ep.x - sp.x);
                
                // Main line
                ctx.beginPath();
                ctx.moveTo(sp.x, sp.y);
                ctx.lineTo(ep.x, ep.y);
                ctx.stroke();

                // Arrowhead (filled triangle)
                ctx.beginPath();
                ctx.moveTo(ep.x, ep.y);
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
    }, [viewedPage, selectedObjectId, selectedObject, previewObject, zoom, pan]);

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
        <div className="flex flex-col h-screen">
             {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-white mt-4">處理中，請稍候...</p>
                </div>
            )}
            <header className="bg-gray-800 shadow-md flex items-center sticky top-0 z-20 h-20 px-3">
                <div className="w-1/6 flex-shrink-0">
                    <span className="text-white text-sm font-bold px-2 py-1 truncate">{projectName}</span>
                </div>

                <div className="flex-grow flex items-center">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 text-sm bg-gray-900 px-3 h-12 rounded-full">
                         {/* Undo/Redo */}
                        <button onClick={handleUndo} disabled={!canUndo} className="p-1.5 hover:bg-gray-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" title="上一步">
                            <UndoIcon className="w-4 h-4" />
                        </button>
                        <button onClick={handleRedo} disabled={!canRedo} className="p-1.5 hover:bg-gray-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" title="下一步">
                            <RedoIcon className="w-4 h-4" />
                        </button>
                        <div className="h-4 border-l border-gray-600 mx-1"></div>
                         {/* File Menu */}
                        <div className="relative" ref={fileMenu.ref}>
                            <button onClick={fileMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 rounded-full" aria-haspopup="true" aria-expanded={fileMenu.isOpen}>
                                <FileIcon className="w-4 h-4" /> 檔案
                            </button>
                            {fileMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-30">
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleSaveAndDownload(); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-600">儲存並下載 PDF</a>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleClose(); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-600">關閉</a>
                                </div>
                            )}
                        </div>
                        {/* Rotate Menu */}
                        <div className="relative" ref={rotateMenu.ref}>
                            <button onClick={rotateMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 rounded-full" aria-haspopup="true" aria-expanded={rotateMenu.isOpen}>
                                <RotateIcon className="w-4 h-4" /> 旋轉
                            </button>
                             {rotateMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-30">
                                     <button
                                        onClick={handleRotateSelectedPages}
                                        disabled={selectedPages.size === 0}
                                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        旋轉選取 90° ({selectedPages.size})
                                    </button>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleRotateAllPages(); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-600">全部旋轉 90°</a>
                                </div>
                            )}
                        </div>
                        {/* Split Menu */}
                        <div className="relative" ref={splitMenu.ref}>
                            <button onClick={splitMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 rounded-full" aria-haspopup="true" aria-expanded={splitMenu.isOpen}>
                                <SplitIcon className="w-4 h-4" /> 分割
                            </button>
                            {splitMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-30">
                                    <button
                                        onClick={deletePages}
                                        disabled={selectedPages.size === 0}
                                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        刪除選取 ({selectedPages.size})
                                    </button>
                                    <button
                                        onClick={handleExportSelected}
                                        disabled={selectedPages.size === 0}
                                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        匯出選取 ({selectedPages.size})
                                    </button>
                                </div>
                            )}
                        </div>
                         <div className="h-4 border-l border-gray-600 mx-1"></div>
                        {/* Draw Tools */}
                         <div className="flex items-center gap-1">
                            <button onClick={() => setActiveTool('move')} title="選取/移動" className={`p-1.5 rounded-full ${activeTool === 'move' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}> <PointerIcon className="w-4 h-4" /> </button>
                            <button onClick={() => setActiveTool('line')} title="直線" className={`p-1.5 rounded-full ${activeTool === 'line' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}> <LineIcon className="w-4 h-4" /> </button>
                            <button onClick={() => setActiveTool('arrow')} title="箭頭" className={`p-1.5 rounded-full ${activeTool === 'arrow' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}> <ArrowIcon className="w-4 h-4" /> </button>
                            <button onClick={() => setActiveTool('rect')} title="方形" className={`p-1.5 rounded-full ${activeTool === 'rect' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}> <RectIcon className="w-4 h-4" /> </button>
                            <button onClick={() => setActiveTool('circle')} title="圓形" className={`p-1.5 rounded-full ${activeTool === 'circle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}> <CircleIcon className="w-4 h-4" /> </button>
                            <button onClick={() => setActiveTool('text')} title="打字" className={`p-1.5 rounded-full ${activeTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}> <TextIcon className="w-4 h-4" /> </button>
                        </div>
                        {isDrawingToolActive && (
                            <>
                                <div className="h-4 border-l border-gray-600 mx-1"></div>
                                <div className="flex items-center gap-3 text-white">
                                    <div title="顏色">
                                        <input type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} className="w-6 h-6 p-0 border-none rounded bg-transparent cursor-pointer appearance-none" style={{'WebkitAppearance': 'none'}}/>
                                    </div>
                                    {activeTool !== 'text' && (
                                        <div className="flex items-center gap-1" title="線條粗細">
                                            {[2, 5, 10].map(width => (
                                                <button key={width} onClick={() => setStrokeWidth(width)} className={`p-1 rounded-full ${strokeWidth === width ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                                    <div className="bg-white rounded-full" style={{width: `${width+2}px`, height: `${width+2}px`}}></div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {activeTool === 'text' && (
                                        <>
                                            <div className="flex items-center gap-2" title="背景色">
                                                <span className="text-xs">背景:</span>
                                                <input type="color" value={textBackgroundColor === 'transparent' ? '#ffffff' : textBackgroundColor} onChange={(e) => setTextBackgroundColor(e.target.value)} className="w-6 h-6 p-0 border-none rounded bg-gray-700 cursor-pointer" />
                                                <button onClick={() => setTextBackgroundColor('transparent')} className={`text-xs px-2 py-0.5 rounded ${textBackgroundColor === 'transparent' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                                    無
                                                </button>
                                            </div>
                                            <div title="字體">
                                                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs">
                                                    <option value="sans-serif">Sans-Serif</option>
                                                    <option value="serif">Serif</option>
                                                    <option value="monospace">Monospace</option>
                                                    <option value="Arial">Arial</option>
                                                    <option value="Times New Roman">Times New Roman</option>
                                                </select>
                                            </div>
                                            <div title="字體大小">
                                                <input type="number" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="bg-gray-700 border border-gray-600 rounded w-16 px-2 py-0.5 text-xs" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 justify-end flex-shrink-0">
                    {showSaveSuccess && <span className="text-green-400 transition-opacity duration-300 text-sm">專案已儲存並開始下載！</span>}
                </div>
            </header>

            <div className="flex-grow flex overflow-hidden">
                <aside 
                    ref={sidebarRef}
                    className="w-56 flex-shrink-0 bg-gray-800 p-2 overflow-y-auto"
                    onWheel={handleSidebarWheel}
                >
                    <div className="sticky top-0 bg-gray-800 bg-opacity-75 backdrop-blur-sm z-10 flex justify-between items-center mb-2 p-2 rounded-lg shadow-lg">
                        <h2 className="text-sm font-semibold">
                            {selectionMode === 'view'
                                ? `頁面 (${viewedPageIndex > -1 ? viewedPageIndex + 1 : 0}/${state.pages.length})`
                                : `已選取 ${selectedPages.size}/${state.pages.length} 頁`
                            }
                        </h2>
                        <button 
                            onClick={() => setSelectionMode(m => m === 'view' ? 'select' : 'view')} 
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            title={selectionMode === 'view' ? '切換至選取模式' : '切換至檢視模式'}
                        >
                            {selectionMode === 'view' ? <EyeIcon className="w-5 h-5" /> : <CheckSquareIcon className="w-5 h-5" />}
                        </button>
                    </div>
                     <div className="grid grid-cols-1 gap-2">
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
                                className={`relative aspect-square group cursor-pointer border-2 bg-gray-900/50 rounded-md ${selectedPages.has(page.id) ? 'border-blue-500' : 'border-transparent'} ${draggedId === page.id ? 'dragging' : ''}`}
                                onClick={() => handleThumbnailClick(page.id)}
                            >
                                <img src={pageUrlCache.get(page.id)} className="w-full h-full object-contain rounded" style={{transform: `rotate(${page.rotation}deg)`}} />
                            </div>
                        ))}
                    </div>
                </aside>
                
                <main className="flex-1 p-4 flex flex-col bg-gray-900 relative" onWheel={handleMainViewWheel}>
                    <div className="flex-grow overflow-hidden flex items-center justify-center">
                        {viewedPage ? (
                            <div className="relative touch-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: 'transform 0.2s ease-in-out', transformOrigin: 'center center' }}>
                               <img ref={imageRef} src={pageUrlCache.get(viewedPage.id)} className="max-w-full max-h-full object-contain shadow-lg transition-transform duration-200 pointer-events-none" style={{transform: `rotate(${viewedPage.rotation}deg)`}}/>
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
                                       className="absolute bg-transparent border p-1 z-20"
                                       style={{ 
                                           left: textInput.x * zoom, 
                                           top: textInput.y * zoom, 
                                           fontSize: fontSize * zoom,
                                           fontFamily: fontFamily,
                                           color: drawingColor,
                                           borderColor: drawingColor,
                                           transform: `rotate(${viewedPage.rotation}deg)`,
                                           transformOrigin: 'top left'
                                        }}
                                   />
                               )}
                            </div>
                            ) : <p className="text-gray-500">沒有頁面可顯示</p>
                        }
                    </div>
                    {viewedPage && (
                        <div className="absolute bottom-5 right-5 z-30 bg-gray-800 bg-opacity-75 rounded-full flex items-center text-white shadow-lg">
                            <button onClick={handleZoomOut} className="p-2 hover:bg-gray-700 rounded-full transition-colors" title="縮小">
                                <MinusIcon className="w-6 h-6" />
                            </button>
                            <span className="px-2 text-sm font-semibold w-16 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                             <button onClick={handleResetZoom} className="p-2 hover:bg-gray-700 rounded-full transition-colors" title="恢復 100%">
                                <ResetZoomIcon className="w-6 h-6" />
                            </button>
                            <button onClick={handleZoomIn} className="p-2 hover:bg-gray-700 rounded-full transition-colors" title="放大">
                                <PlusIcon className="w-6 h-6" />
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// --- Home Page Component ---
const HomePage: React.FC<{ onProjectSelect: (project: StoredProject) => void; }> = ({ onProjectSelect }) => {
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchMeta = async () => {
            const meta = await dbService.getProjectsMetadata();
            setProjects(meta);
        };
        fetchMeta();
    }, []);

    const createNewProject = (name: string, pages: { id: string; data: Blob }[]) => {
        // FIX: Add a timestamp to new projects to align with the database schema and enable sorting.
        const now = Date.now();
        const newProject: StoredProject = {
            id: `proj_${now}`,
            name,
            timestamp: now,
            pages: pages.map(p => ({ ...p, rotation: 0, objects: [] })),
        };
        onProjectSelect(newProject);
    };

    const handlePhotoImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsLoading(true);
        try {
            const imageFiles = [...files].filter((f) => f.type.startsWith('image/'));
            const pages = imageFiles.map((file, index) => ({
                id: `page_${Date.now()}_${index}`,
                data: file, // Store the File object (which is a Blob) directly
            }));
            createNewProject(`新專案-${new Date().toLocaleDateString()}`, pages);
        } catch (error) {
            console.error("Error importing photos:", error);
            if (error instanceof Error) {
                alert(`匯入相片時發生錯誤: ${error.message}`);
            } else {
                alert("匯入相片時發生錯誤。");
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePdfImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.includes('pdf')) return;
        setIsLoading(true);
        try {
            const pdfBytes = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            const pagesData = [];
            const pageCount = pdf.numPages;

            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const scale = 2.0; // Adjusted scale, balance between quality and size
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) {
                    throw new Error('無法獲取 canvas context');
                }

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };
                await page.render(renderContext).promise;

                const blob = await new Promise<Blob | null>(resolve => 
                    canvas.toBlob(resolve, 'image/jpeg', CompressionQuality.HIGH)
                );

                if (!blob) {
                    throw new Error('Canvas toBlob failed');
                }

                pagesData.push({
                    id: `page_${Date.now()}_${i - 1}`,
                    data: blob,
                });
            }
            createNewProject(file.name.replace(/\.pdf$/i, ''), pagesData);
        } catch (error) {
            console.error("Error importing PDF:", error);
            if (error instanceof Error) {
                alert(`匯入 PDF 失敗: ${error.message}。檔案可能已損毀或格式不支援。`);
            } else {
                alert("匯入 PDF 失敗。檔案可能已損毀或格式不支援。");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadProject = async (id: string) => {
        const projectData = await dbService.getProjectData(id);
        if (projectData) {
            onProjectSelect(projectData);
        } else {
            alert("無法載入專案。");
        }
    };

    const deleteProject = async (id: string) => {
      if (window.confirm("確定要刪除這個專案嗎？此操作無法復原。")) {
        await dbService.deleteProject(id);
        const updatedMeta = await dbService.getProjectsMetadata();
        setProjects(updatedMeta);
      }
    };

    return (
        <div className="p-8">
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-white mt-4">讀取中...</p>
                </div>
            )}
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white mb-2">PDF 編輯工具</h1>
                <p className="text-lg text-gray-400">建立、編輯和管理您的 PDF 檔案</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
                <button onClick={() => photoInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-8 flex flex-col items-center justify-center transition-transform transform hover:scale-105">
                    <PlusIcon className="w-16 h-16 mb-4"/>
                    <h2 className="text-2xl font-semibold">從相片建立</h2>
                    <p className="text-blue-200">將多張圖片合併成一個 PDF 檔案</p>
                </button>
                <button onClick={() => pdfInputRef.current?.click()} className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-8 flex flex-col items-center justify-center transition-transform transform hover:scale-105">
                    <FolderOpenIcon className="w-16 h-16 mb-4"/>
                    <h2 className="text-2xl font-semibold">開啟 PDF 檔案</h2>
                    <p className="text-green-200">編輯現有的 PDF 檔案</p>
                </button>
            </div>
            
            <input type="file" multiple accept="image/*" ref={photoInputRef} onChange={handlePhotoImport} className="hidden" />
            <input type="file" accept=".pdf" ref={pdfInputRef} onChange={handlePdfImport} className="hidden" />

            <div>
                <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-700 pb-2">我的專案</h2>
                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {projects.map(p => (
                            <div key={p.id} className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col justify-between hover:bg-gray-700 transition-colors">
                                <div>
                                    <h3 className="font-bold text-lg truncate">{p.name}</h3>
                                    <p className="text-sm text-gray-400">{p.pageCount} 頁</p>
                                    <p className="text-xs text-gray-500 mt-2">{new Date(p.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => loadProject(p.id)} className="flex-grow bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-3 rounded">開啟</button>
                                    <button onClick={() => deleteProject(p.id)} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-800 rounded-lg">
                        <p className="text-gray-500">您還沒有任何專案。</p>
                        <p className="text-gray-500">請從上方選項建立一個新專案。</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main App Component (Router) ---
const App: React.FC = () => {
  const [activeProject, setActiveProject] = useState<StoredProject | null>(null);

  const handleSaveProject = async (project: StoredProject, newName?: string) => {
    // FIX: Always update the timestamp on save to ensure projects are sorted by most recent activity.
    const finalProject = { ...project, name: newName || project.name, timestamp: Date.now() };
    await dbService.saveProject(finalProject);
    // After saving, stay on the editor page. The state is already in sync.
  };

  const handleCloseEditor = () => {
    setActiveProject(null);
  };

  if (activeProject) {
    return <EditorPage project={activeProject} onSave={handleSaveProject} onClose={handleCloseEditor} />;
  }

  return <HomePage onProjectSelect={setActiveProject} />;
};

export default App;