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
    const [history, setHistory] = useState<EditorPageState[]>([{ ...project, pages: project.pages.map(p => ({ ...p, rotation: p.rotation ?? 0, objects: p.objects || [] })) }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const state = history[historyIndex]; // Derived state

    const [pageUrlCache, setPageUrlCache] = useState<Map<string, string>>(new Map());
    // Ref to store valid URLs to prevent reloading image on every state change (like drawing)
    const activeUrlMap = useRef(new Map<string, string>());

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
    const [viewedPageId, setViewedPageId] = useState<string | null>(state.pages[0]?.id || null);
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

    const viewedPage = state.pages.find(p => p.id === viewedPageId) || state.pages[0];
    const viewedPageIndex = state.pages.findIndex(p => p.id === viewedPageId);
    const selectedObject = viewedPage?.objects.find(o => o.id === selectedObjectId) || null;
    const isDrawingToolActive = activeTool && activeTool !== 'move';

    // Calculate Current Project Size from pages
    const currentProjectSize = state.pages.reduce((acc, page) => acc + (page.source.type === 'image' ? page.source.data.size : 0), 0) + (state.pdfAssets ? Object.values(state.pdfAssets).reduce((acc, blob) => acc + blob.size, 0) : 0);

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
        const currentMap = activeUrlMap.current;
        const newMap = new Map<string, string>();
        let hasChanges = false;

        state.pages.forEach(page => {
            if (currentMap.has(page.id)) {
                newMap.set(page.id, currentMap.get(page.id)!);
            } else if (page.source.type === 'image') {
                const url = URL.createObjectURL(page.source.data);
                newMap.set(page.id, url);
                hasChanges = true;
            }
        });

        if (currentMap.size !== newMap.size) hasChanges = true;

        currentMap.forEach((url, id) => {
            if (!newMap.has(id)) {
                URL.revokeObjectURL(url);
                hasChanges = true;
            }
        });

        activeUrlMap.current = newMap;
        if (hasChanges) {
            setPageUrlCache(new Map(newMap));
        }
    }, [state.pages]);

    useEffect(() => {
        return () => {
            activeUrlMap.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    useEffect(() => {
        if (!viewedPage) return;
        const loadImages = async () => {
            let hasNewImages = false;
            for (const obj of viewedPage.objects) {
                if (obj.type === 'image-placeholder' && obj.imageData && !loadedObjectImages.current.has(obj.id)) {
                    const img = new Image();
                    const url = URL.createObjectURL(obj.imageData);
                    img.src = url;
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    }).then(() => {
                        loadedObjectImages.current.set(obj.id, img);
                        hasNewImages = true;
                    }).catch(() => {
                        console.error(`Failed to load image for object ${obj.id}`);
                    });
                }
            }
            if (hasNewImages) {
                setImageLoadedCount(c => c + 1);
            }
        };
        loadImages();
    }, [viewedPage]);

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
                if (page.source.type !== 'image') continue; // Skip non-image pages for now

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

            updateState({ ...state, pages: newPages });

            // Auto save after compression
            const projectToSave: StoredProject = { id: state.id, name: projectName, pages: newPages, timestamp: Date.now() };
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

    const createPdfBlob = async (pagesToExport: EditorPageState['pages']): Promise<Blob | null> => {
        // ... (existing PDF generation logic)
        try {
            const pdfDoc = await PDFDocument.create();
            for (const page of pagesToExport) {
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
                const drawOptions: any = { width: image.width, height: image.height, rotate: degrees(-page.rotation) };

                if (page.rotation === 90) { drawOptions.x = image.width; drawOptions.y = 0; }
                else if (page.rotation === 180) { drawOptions.x = image.width; drawOptions.y = image.height; }
                else if (page.rotation === 270) { drawOptions.x = 0; drawOptions.y = image.height; }

                pdfPage.drawImage(image, drawOptions);
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
        const projectToSave: StoredProject = { id: state.id, name: projectName, pages: state.pages, timestamp: Date.now() };
        await onSave(projectToSave, projectName);
        setIsDirty(false);
        const success = await generatePdf(state.pages, `${projectName.replace(/\.pdf$/i, '') || 'document'}.pdf`);
        if (success) { setShowSaveSuccess(true); setTimeout(() => setShowSaveSuccess(false), 2000); }
    };

    const handleShare = async () => {
        fileMenu.close();
        const projectToSave: StoredProject = { id: state.id, name: projectName, pages: state.pages, timestamp: Date.now() };
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
        if (!files || files.length === 0 || !targetObjectId || !viewedPageId) return;
        const file = files[0];
        const newPages = state.pages.map(p => {
            if (p.id === viewedPageId) {
                const newObjects = p.objects.map(obj => {
                    if (obj.id === targetObjectId) { return { ...obj, imageData: file }; }
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

    const handleMainViewWheel = (e: React.WheelEvent) => {
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
        const canvas = canvasRef.current; const image = imageRef.current;
        if (!canvas || !image) return { x: 0, y: 0 };
        const rect = image.getBoundingClientRect();
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
        const finalX = (image.clientWidth / 2) + unscaledX; const finalY = (image.clientHeight / 2) + unscaledY;
        return { x: finalX, y: finalY };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (textInput.show) { textInputRef.current?.blur(); return; }
        const startPoint = getCanvasCoordinates(e);
        if (isDrawingToolActive) {
            if (activeTool === 'text') { setSelectedObjectId(null); setTextInput({ show: true, x: startPoint.x, y: startPoint.y, value: '' }); setTimeout(() => textInputRef.current?.focus(), 0); }
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
