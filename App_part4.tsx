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

                            <button onClick={() => setActiveTool('text')} title="文字" className={`p-2 rounded-full transition-all ${activeTool === 'text' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <TextIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('image-placeholder')} title="疊加圖片" className={`p-2 rounded-full transition-all ${activeTool === 'image-placeholder' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <ImageIcon className="w-5 h-5" /> </button>

                            <button
                                onClick={() => setShowStampPicker(true)}
                                title="印章"
                                className={`p-2 rounded-full transition-all ${activeTool === 'stamp' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                                <StampIcon className="w-5 h-5" />
                            </button>
                        </div >

    { isDrawingToolActive && (
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
            {activeTool === 'text' && (
                <div className="flex md:flex-row flex-col items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-1 bg-slate-700 rounded px-1">
                        <input type="number" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="bg-transparent border-none w-8 md:w-10 text-sm text-center text-white focus:ring-0 p-1" />
                        <span className="text-xs text-slate-400 hidden md:inline pr-1">px</span>
                    </div>
                    <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="bg-slate-700 text-white border-none rounded text-xs md:text-sm h-8 px-2 max-w-[80px] md:max-w-[120px] focus:ring-0"
                    >
                        <option value="sans-serif">Sans Serif</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Mono</option>
                    </select>
                    <div className="flex items-center gap-2 border-l border-slate-600 pl-2 md:pl-3">
                        <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={textBackgroundColor !== 'transparent'}
                                onChange={(e) => setTextBackgroundColor(e.target.checked ? '#ffffff' : 'transparent')}
                                className="rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-0 w-3 h-3 md:w-4 md:h-4"
                            />
                            <span className="hidden md:inline">背景</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    )}
                    </div >
                </div >
            </header >

            <div className="flex flex-1 overflow-hidden relative">
                {/* Desktop Sidebar */}
                <div
                    ref={sidebarRef}
                    className="hidden md:flex flex-col w-52 bg-slate-800 border-r border-slate-700 overflow-y-auto custom-scrollbar flex-shrink-0"
                >
                    <div className="p-4 space-y-4">
                        {state.pages.map((page, index) => (
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
                                    relative w-full aspect-[3/4] group cursor-pointer rounded-lg overflow-hidden border-2 transition-all bg-slate-900/50
                                    ${selectedPages.has(page.id) ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-transparent hover:border-slate-500'}
                                    ${viewedPageId === page.id && !selectedPages.has(page.id) ? 'border-slate-500' : ''}
                                    ${draggedId === page.id ? 'opacity-40 scale-95' : ''}
                                `}
                            >
                                <img
                                    src={pageUrlCache.get(page.id)}
                                    className="w-full h-full object-contain p-1"
                                    style={{ transform: `rotate(${page.rotation}deg)` }}
                                    alt={`Page ${index + 1}`}
                                />
                                <div className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded-md shadow-sm">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col flex-1 min-w-0 relative bg-slate-900">
                    {/* ... (Thumbnail container code remains same) */}
                    <div
                        ref={thumbnailContainerRef}
                        className="md:hidden bg-slate-800 border-b border-slate-700 h-24 flex items-center px-4 gap-3 overflow-x-auto no-scrollbar flex-shrink-0 relative z-30 shadow-md"
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
                                <img
                                    src={pageUrlCache.get(page.id)}
                                    className="h-full w-auto object-contain bg-slate-900"
                                    style={{ transform: `rotate(${page.rotation}deg)` }}
                                    alt={`Page ${index + 1}`}
                                />
                                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-tl">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>

                    <main className="flex-1 p-4 flex flex-col relative overflow-hidden" onWheel={handleMainViewWheel} style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                        <div className="flex-grow overflow-hidden flex items-center justify-center">
                            {viewedPage ? (
                                <div className="relative touch-none select-none shadow-2xl" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: 'transform 0.2s ease-in-out', transformOrigin: 'center center' }}>
                                    <img
                                        ref={imageRef}
                                        src={pageUrlCache.get(viewedPage.id)}
                                        className="max-w-full max-h-full object-contain pointer-events-none"
                                        style={{ transform: `rotate(${viewedPage.rotation}deg)` }}
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
                                            onChange={(e) => setTextInput(t => ({ ...t, value: e.target.value }))}
                                            onBlur={handleTextBlur}
                                            className="absolute border p-1 z-20 overflow-auto resize whitespace-pre shadow-sm rounded-sm"
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
                            ) : <p className="text-slate-500">沒有頁面可顯示</p>
                            }
                        </div>

                        {viewedPage && (
                            <div className="hidden md:flex flex-col-reverse absolute bottom-6 right-6 z-30 gap-2">
                                <div className="bg-slate-800/80 backdrop-blur-md rounded-full items-center text-white shadow-xl border border-slate-600 flex p-1">
                                    <button onClick={handleZoomOut} className="p-2.5 hover:bg-slate-700 rounded-full transition-colors" title="縮小">
                                        <MinusIcon className="w-5 h-5" />
                                    </button>
                                    <span className="px-2 text-sm font-mono font-semibold w-14 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                                    <button onClick={handleResetZoom} className="p-2.5 hover:bg-slate-700 rounded-full transition-colors" title="恢復 100%">
                                        <ResetZoomIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={handleZoomIn} className="p-2.5 hover:bg-slate-700 rounded-full transition-colors" title="放大">
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
            <input type="file" ref={fileInputRef} multiple accept="application/pdf,image/*" className="hidden" onChange={onAddFilesChange} />
            <input type="file" ref={objectImageInputRef} accept="image/*" className="hidden" onChange={onObjectImageChange} />
        </div >
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

    const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("確定要刪除此專案嗎？此動作無法復原。")) { await dbService.deleteProject(id); loadProjects(); }
    };

    const handleOpenProject = async (id: string) => {
        const project = await dbService.getProjectData(id);
        if (project) { setCurrentProject(project); setView('editor'); } else { alert("找不到專案資料"); }
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
                                    <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">PDF 編輯工具</h1>
                                    <p className="text-slate-500 text-sm mt-1">輕鬆分割、合併與編輯您的 PDF 文件</p>
                                </div>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => mergeInputRef.current?.click()}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all duration-200 text-sm font-medium group shadow-sm hover:shadow-md"
                                >
                                    <MergeIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                    <span className="text-slate-300 group-hover:text-white">合併 PDF</span>
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
                                            className="absolute top-3 right-3 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0"
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
