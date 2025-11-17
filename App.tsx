// Fix: Correctly import React hooks using curly braces.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { ProjectMetadata, StoredProject, EditorPageProps, EditorPageState, CompressionQuality } from './types';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';


// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
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
const HandUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V17.5C7 18.3284 7.67157 19 8.5 19H15.5C16.3284 19 17 18.3284 17 17.5V13.4375M7 11.5L9.92561 4.64878C10.2433 3.69333 11.414 3.32177 12.2428 3.88251L17 7.5M7 11.5H5.5C4.67157 11.5 4 12.1716 4 13V15C4 15.8284 4.67157 16.5 5.5 16.5H7"/>
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 4h5v5M9 20H4v-5" />
    </svg>
);
const SplitIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879-2.879a5 5 0 00-7.07 0L2 12l2.879 2.879a5 5 0 007.07 0L19 5" />
    </svg>
);
const DrawIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);
const ResetZoomIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <text x="12" y="15" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">100</text>
  </svg>
);


// --- LocalStorage Service ---
const projectService = {
  getProjectsMetadata: (): ProjectMetadata[] => {
    const meta = localStorage.getItem('pdf_projects_meta');
    return meta ? JSON.parse(meta) : [];
  },
  getProjectData: (id: string): StoredProject | null => {
    const data = localStorage.getItem(`pdf_project_${id}`);
    return data ? JSON.parse(data) : null;
  },
  saveProject: (project: StoredProject): ProjectMetadata[] => {
    const metadataList = projectService.getProjectsMetadata();
    const existingMetaIndex = metadataList.findIndex(p => p.id === project.id);
    const newMeta = {
      id: project.id,
      name: project.name,
      timestamp: Date.now(),
      pageCount: project.pages.length,
    };

    if (existingMetaIndex > -1) {
      metadataList[existingMetaIndex] = newMeta;
    } else {
      metadataList.push(newMeta);
    }
    
    localStorage.setItem('pdf_projects_meta', JSON.stringify(metadataList));
    localStorage.setItem(`pdf_project_${project.id}`, JSON.stringify(project));
    return metadataList;
  },
  deleteProject: (id: string): ProjectMetadata[] => {
    let metadataList = projectService.getProjectsMetadata();
    metadataList = metadataList.filter(p => p.id !== id);
    localStorage.setItem('pdf_projects_meta', JSON.stringify(metadataList));
    localStorage.removeItem(`pdf_project_${id}`);
    return metadataList;
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
type DrawingTool = 'line' | 'arrow' | 'rect' | 'circle' | 'text' | null;
type Point = { x: number; y: number };
type SelectionMode = 'view' | 'select';

const EditorPage: React.FC<EditorPageProps> = ({ project, onSave, onClose }) => {
    // History state for undo/redo
    const [history, setHistory] = useState<EditorPageState[]>([{ ...project, pages: project.pages.map(p => ({ ...p, rotation: p.rotation ?? 0 })) }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const state = history[historyIndex]; // Derived state

    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set(project.pages.length > 0 ? [project.pages[0].id] : []));
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const [isDirty, setIsDirty] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('view');
    const [viewedPageId, setViewedPageId] = useState<string | null>(state.pages[0]?.id || null);
    const [zoom, setZoom] = useState(1);

    // Drawing state
    const [drawingTool, setDrawingTool] = useState<DrawingTool>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [endPoint, setEndPoint] = useState<Point | null>(null);
    const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, value: '' });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    
    const fileMenu = useDropdown();
    const rotateMenu = useDropdown();
    const splitMenu = useDropdown();
    const drawMenu = useDropdown();

    const updateState = (newState: EditorPageState) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);

        // Limit history to 10 undo steps + initial state (11 total)
        while (newHistory.length > 11) {
            newHistory.shift();
        }
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setIsDirty(true);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prevIndex => prevIndex - 1);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prevIndex => prevIndex + 1);
        }
    };

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    
    const generatePdf = async (pagesToExport: EditorPageState['pages'], filename: string) => {
        setIsLoading(true);
        try {
            const pdfDoc = await PDFDocument.create();
            for (const page of pagesToExport) {
                const isPng = page.dataUrl.startsWith('data:image/png');
                const imageBytes = await fetch(page.dataUrl).then(res => res.arrayBuffer());
                const image = await (isPng ? pdfDoc.embedPng(imageBytes) : pdfDoc.embedJpg(imageBytes));

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
        // 1. Save project state to LocalStorage
        const projectToSave: StoredProject = {
            id: state.id,
            name: projectName,
            pages: state.pages.map(({ id, dataUrl, rotation }) => ({ id, dataUrl, rotation })),
        };
        onSave(projectToSave, projectName);
        setIsDirty(false);

        // 2. Generate and Download PDF
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
    const handleResetZoom = () => setZoom(1);


    // --- Drawing Logic ---
    const applyDrawing = (pageId: string, sp: Point, ep: Point, tool: DrawingTool, text?: string) => {
        const page = state.pages.find(p => p.id === pageId);
        if (!page || !imageRef.current) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            // Scale coordinates from display size to natural image size
            const scaleX = img.naturalWidth / imageRef.current!.clientWidth;
            const scaleY = img.naturalHeight / imageRef.current!.clientHeight;

            const startX = sp.x * scaleX;
            const startY = sp.y * scaleY;
            const endX = ep.x * scaleX;
            const endY = ep.y * scaleY;

            ctx.strokeStyle = 'red';
            ctx.fillStyle = 'red';
            ctx.lineWidth = 2 * scaleX;

            switch (tool) {
                case 'line':
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                    break;
                case 'arrow':
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    const headlen = 15 * scaleX;
                    const angle = Math.atan2(endY - startY, endX - startX);
                    ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
                    ctx.stroke();
                    break;
                case 'rect':
                    ctx.strokeRect(startX, startY, endX - startX, endY - startY);
                    break;
                case 'circle':
                    ctx.beginPath();
                    const radiusX = Math.abs(endX - startX) / 2;
                    const radiusY = Math.abs(endY - startY) / 2;
                    const centerX = Math.min(startX, endX) + radiusX;
                    const centerY = Math.min(startY, endY) + radiusY;
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                    break;
                 case 'text':
                    if (text) {
                        ctx.font = `${16 * scaleX}px sans-serif`;
                        ctx.fillText(text, startX, startY);
                    }
                    break;
            }

            const newDataUrl = canvas.toDataURL('image/jpeg');
            const newState = {
                ...state,
                pages: state.pages.map(p => p.id === pageId ? { ...p, dataUrl: newDataUrl } : p)
            };
            updateState(newState);
        };
        img.src = page.dataUrl;
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!drawingTool || !viewedPageId) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const point = { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };

        if (drawingTool === 'text') {
            setTextInput({ show: true, x: point.x, y: point.y, value: '' });
            setTimeout(() => textInputRef.current?.focus(), 0);
            return;
        }

        setIsDrawing(true);
        setStartPoint(point);
        setEndPoint(point);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !drawingTool || !startPoint) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const point = { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
        setEndPoint(point);
    };

    const handleCanvasMouseUp = () => {
        if (!isDrawing || !drawingTool || !startPoint || !endPoint || !viewedPageId) return;
        applyDrawing(viewedPageId, startPoint, endPoint, drawingTool);
        setIsDrawing(false);
        setStartPoint(null);
        setEndPoint(null);
    };

    const handleTextBlur = () => {
        if (textInput.value && viewedPageId) {
            applyDrawing(viewedPageId, {x: textInput.x, y: textInput.y + 16}, {x:0, y:0}, 'text', textInput.value);
        }
        setTextInput({ show: false, x: 0, y: 0, value: '' });
        setDrawingTool(null);
    };
    
    useEffect(() => {
        if (isDrawing && canvasRef.current && startPoint && endPoint) {
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            
            switch (drawingTool) {
                 case 'line':
                    ctx.beginPath();
                    ctx.moveTo(startPoint.x, startPoint.y);
                    ctx.lineTo(endPoint.x, endPoint.y);
                    ctx.stroke();
                    break;
                 case 'arrow':
                    ctx.beginPath();
                    ctx.moveTo(startPoint.x, startPoint.y);
                    ctx.lineTo(endPoint.x, endPoint.y);
                    const headlen = 15;
                    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
                    ctx.lineTo(endPoint.x - headlen * Math.cos(angle - Math.PI / 6), endPoint.y - headlen * Math.sin(angle - Math.PI / 6));
                    ctx.moveTo(endPoint.x, endPoint.y);
                    ctx.lineTo(endPoint.x - headlen * Math.cos(angle + Math.PI / 6), endPoint.y - headlen * Math.sin(angle + Math.PI / 6));
                    ctx.stroke();
                    break;
                case 'rect':
                    ctx.strokeRect(startPoint.x, startPoint.y, endPoint.x - startPoint.x, endPoint.y - startPoint.y);
                    break;
                 case 'circle':
                    ctx.beginPath();
                    const radiusX = Math.abs(endPoint.x - startPoint.x) / 2;
                    const radiusY = Math.abs(endPoint.y - startPoint.y) / 2;
                    const centerX = Math.min(startPoint.x, endPoint.x) + radiusX;
                    const centerY = Math.min(startPoint.y, endPoint.y) + radiusY;
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                    break;
            }
        } else if (!isDrawing && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, [isDrawing, startPoint, endPoint, drawingTool]);
    
    const viewedPage = state.pages.find(p => p.id === viewedPageId) || state.pages[0];

    useEffect(() => {
        if (imageRef.current && canvasRef.current) {
            const { clientWidth, clientHeight } = imageRef.current;
            canvasRef.current.width = clientWidth;
            canvasRef.current.height = clientHeight;
        }
    }, [viewedPage?.dataUrl, state.pages]);
    
    return (
        <div className="flex flex-col h-screen">
             {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-white mt-4">處理中，請稍候...</p>
                </div>
            )}
            <header className="bg-gray-800 p-3 shadow-md flex justify-between items-center sticky top-0 z-20">
                <span className="text-white text-xl font-bold px-2 py-1">{projectName}</span>
                 <div className="flex-grow flex justify-center">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 text-sm bg-gray-900 px-3 py-1 rounded-full">
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
                        {/* Draw Menu */}
                        <div className="relative" ref={drawMenu.ref}>
                            <button onClick={drawMenu.toggle} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 rounded-full" aria-haspopup="true" aria-expanded={drawMenu.isOpen}>
                                <DrawIcon className="w-4 h-4" /> 繪圖
                            </button>
                            {drawMenu.isOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-30">
                                   <button onClick={() => { setDrawingTool('line'); drawMenu.close(); }} className="w-full text-left block px-4 py-2 text-sm text-white hover:bg-gray-600">直線</button>
                                   <button onClick={() => { setDrawingTool('arrow'); drawMenu.close(); }} className="w-full text-left block px-4 py-2 text-sm text-white hover:bg-gray-600">箭頭</button>
                                   <button onClick={() => { setDrawingTool('rect'); drawMenu.close(); }} className="w-full text-left block px-4 py-2 text-sm text-white hover:bg-gray-600">方形</button>
                                   <button onClick={() => { setDrawingTool('circle'); drawMenu.close(); }} className="w-full text-left block px-4 py-2 text-sm text-white hover:bg-gray-600">圓形</button>
                                   <button onClick={() => { setDrawingTool('text'); drawMenu.close(); }} className="w-full text-left block px-4 py-2 text-sm text-white hover:bg-gray-600">打字</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-1/4 justify-end">
                    {showSaveSuccess && <span className="text-green-400 transition-opacity duration-300 text-sm">專案已儲存並開始下載！</span>}
                </div>
            </header>

            <div className="flex-grow flex overflow-hidden">
                <aside className="w-1/6 bg-gray-800 p-2 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2 p-2">
                        <h2 className="text-lg font-semibold">頁面 ({state.pages.length})</h2>
                        <button 
                            onClick={() => setSelectionMode(m => m === 'view' ? 'select' : 'view')} 
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            title={selectionMode === 'view' ? '切換至選取模式' : '切換至檢視模式'}
                        >
                            {selectionMode === 'view' ? <EyeIcon className="w-5 h-5" /> : <HandUpIcon className="w-5 h-5" />}
                        </button>
                    </div>
                     <div className="grid grid-cols-1 gap-2">
                        {state.pages.map(page => (
                            <div key={page.id} 
                                draggable
                                onDragStart={() => setDraggedId(page.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(page.id)}
                                onDragEnd={() => setDraggedId(null)}
                                className={`relative aspect-[_7_/_10_] group cursor-pointer border-2 ${selectedPages.has(page.id) ? 'border-blue-500' : 'border-transparent'} ${draggedId === page.id ? 'dragging' : ''}`}
                                onClick={() => handleThumbnailClick(page.id)}
                            >
                                <img src={page.dataUrl} className="w-full h-full object-contain rounded" style={{transform: `rotate(${page.rotation}deg)`}} />
                            </div>
                        ))}
                    </div>
                </aside>
                
                <main className="w-5/6 p-4 overflow-auto flex items-center justify-center bg-gray-900 relative">
                    {viewedPage ? (
                        <div className="relative" style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-in-out', transformOrigin: 'center center' }}>
                           <img ref={imageRef} src={viewedPage.dataUrl} className="max-w-full max-h-full object-contain shadow-lg transition-transform duration-200" style={{transform: `rotate(${viewedPage.rotation}deg)`}} onLoad={() => {
                               if (imageRef.current && canvasRef.current) {
                                   const { clientWidth, clientHeight } = imageRef.current;
                                   canvasRef.current.width = clientWidth;
                                   canvasRef.current.height = clientHeight;
                               }
                           }}/>
                           <canvas
                                ref={canvasRef}
                                className={`absolute top-0 left-0 ${drawingTool ? 'cursor-crosshair' : 'cursor-default'} pointer-events-auto`}
                                style={{ transform: `rotate(${viewedPage.rotation}deg)` }}
                                onMouseDown={handleCanvasMouseDown}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseUp={handleCanvasMouseUp}
                                onMouseLeave={handleCanvasMouseUp}
                           />
                           {textInput.show && (
                               <textarea
                                   ref={textInputRef}
                                   value={textInput.value}
                                   onChange={(e) => setTextInput(t => ({...t, value: e.target.value}))}
                                   onBlur={handleTextBlur}
                                   className="absolute bg-transparent text-red-500 border border-red-500 p-1"
                                   style={{ left: textInput.x, top: textInput.y, fontSize: 16 }}
                               />
                           )}
                        </div>
                        ) : <p className="text-gray-500">沒有頁面可顯示</p>
                    }
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
        setProjects(projectService.getProjectsMetadata().sort((a,b) => b.timestamp - a.timestamp));
    }, []);

    const createNewProject = (name: string, pages: { id: string; dataUrl: string }[]) => {
        const newProject: StoredProject = {
            id: `proj_${Date.now()}`,
            name,
            pages: pages.map(p => ({ ...p, rotation: 0 })),
        };
        onProjectSelect(newProject);
    };

    const handlePhotoImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsLoading(true);
        try {
            const imageFiles = [...files].filter((f) => f.type.startsWith('image/'));
            const pages = await Promise.all(
                imageFiles.map(async (file, index) => ({
                    id: `page_${Date.now()}_${index}`,
                    dataUrl: await fileToBase64(file),
                }))
            );
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
            const pages = [];
            const pageCount = pdf.numPages;

            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const scale = 3.0; // Increased scale for higher resolution
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

                pages.push({
                    id: `page_${Date.now()}_${i - 1}`,
                    dataUrl: canvas.toDataURL('image/png'), // Switched to PNG for lossless quality
                });
            }
            createNewProject(file.name.replace(/\.pdf$/i, ''), pages);
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

    const loadProject = (id: string) => {
        const projectData = projectService.getProjectData(id);
        if (projectData) {
            onProjectSelect(projectData);
        } else {
            alert("無法載入專案。");
        }
    };

    const deleteProject = (id: string) => {
      if (window.confirm("確定要刪除這個專案嗎？此操作無法復原。")) {
        const updatedMeta = projectService.deleteProject(id);
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

  const handleSaveProject = (project: StoredProject, newName?: string) => {
    const finalProject = { ...project, name: newName || project.name };
    projectService.saveProject(finalProject);
    // After saving, stay on the editor page.
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