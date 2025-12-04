    };

const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (actionState.type === 'panning') { setActionState({ type: 'idle' }); return; }
    if (actionState.type === 'idle') return;
    const endPoint = getCanvasCoordinates(e); const { type, startPoint } = actionState;
    let newObjects = [...(viewedPage?.objects || [])]; let changesMade = false;
    if (type === 'drawing' && startPoint && (startPoint.x !== endPoint.x || startPoint.y !== endPoint.y)) {
        if (activeTool === 'stamp' && activeStamp) {
            const newObject: EditorObject = {
                id: `obj_${Date.now()}`,
                type: 'stamp',
                sp: startPoint,
                ep: endPoint,
                text: activeStamp.text,
                color: activeStamp.textColor,
                backgroundColor: activeStamp.backgroundColor,
                fontSize: activeStamp.fontSize,
                strokeWidth: 0, // No border by default
            };
            newObjects.push(newObject);
            changesMade = true;
        } else {
            const newObject: EditorObject = { id: `obj_${Date.now()}`, type: activeTool as DrawingTool, sp: startPoint, ep: endPoint, color: activeTool === 'image-placeholder' ? '#FF69B4' : drawingColor, strokeWidth: strokeWidth, };
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

const handleTextBlur = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (textInput.value && viewedPageId && ctx) {
        const text = textInput.value; const lines = text.split('\n'); const size = fontSize; const family = fontFamily;
        ctx.font = `${size}px ${family}`; let maxWidth = 0;
        lines.forEach(line => { const metrics = ctx.measureText(line); if (metrics.width > maxWidth) { maxWidth = metrics.width; } });
        const lineHeight = size * 1.2; const totalHeight = lines.length * lineHeight;
        const newObject: EditorObject = { id: `obj_${Date.now()}`, type: 'text', sp: { x: textInput.x, y: textInput.y }, ep: { x: textInput.x + maxWidth, y: textInput.y + totalHeight }, text: text, color: drawingColor, backgroundColor: textBackgroundColor, fontFamily: family, fontSize: size, };
        const newState = { ...state, pages: state.pages.map(p => p.id === viewedPageId ? { ...p, objects: [...(p.objects || []), newObject] } : p) };
        updateState(newState);
    }
    setTextInput({ show: false, x: 0, y: 0, value: '' }); setActiveTool('move');
};

const drawObject = (ctx: CanvasRenderingContext2D, obj: EditorObject, options: { scaleX?: number, scaleY?: number } = {}) => {
    const { scaleX = 1, scaleY = 1 } = options;
    const sp = { x: obj.sp.x * scaleX, y: obj.sp.y * scaleY };
    const ep = { x: obj.ep.x * scaleX, y: obj.ep.y * scaleY };
    const isImagePlaceholder = obj.type === 'image-placeholder';
    ctx.strokeStyle = isImagePlaceholder ? '#FF69B4' : (obj.color || 'red');
    ctx.fillStyle = isImagePlaceholder ? '#FF69B4' : (obj.color || 'red');
    ctx.lineWidth = (obj.strokeWidth || 2) * scaleX;

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
                const lines = obj.text.split('\n'); const lineHeight = (obj.fontSize || 16) * 1.2 * scaleY;
                if (obj.backgroundColor && obj.backgroundColor !== 'transparent') { ctx.fillStyle = obj.backgroundColor; lines.forEach((line, index) => { const metrics = ctx.measureText(line); const textWidth = metrics.width; ctx.fillRect(sp.x, sp.y + (index * lineHeight), textWidth, lineHeight); }); }
                ctx.fillStyle = obj.color || 'red'; lines.forEach((line, index) => { ctx.fillText(line, sp.x, sp.y + (index * lineHeight)); });
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
    const canvas = canvasRef.current; const image = imageRef.current; const ctx = canvas?.getContext('2d');
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
                    {/* Removed PDF Icon here as requested */}
                    <div className="flex items-center gap-3 shrink-0 ml-1">
                        <h2 className="text-sm font-medium tabular-nums text-slate-200">
                            {selectionMode === 'view'
                                ? `頁面 (${viewedPageIndex > -1 ? viewedPageIndex + 1 : 0}/${state.pages.length})`
                                : `已選取 ${selectedPages.size}`
                            }
                        </h2>
                        <button
                            onClick={() => setSelectionMode(m => m === 'view' ? 'select' : 'view')}
                            className={`p-2 rounded hover:bg-slate-700 transition-colors ${selectionMode === 'select' ? 'text-blue-400 bg-slate-700/50' : 'text-slate-400'}`}
                            title={selectionMode === 'view' ? '切換至多選模式' : '切換至檢視模式'}
                        >
                            {selectionMode === 'view' ? <CheckSquareIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>
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

                        {/* Desktop Shape Tools */}
                        <div className="hidden md:flex items-center gap-2">
                            <button onClick={() => setActiveTool('line')} title="直線" className={`p-2 rounded-full transition-all ${activeTool === 'line' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <LineIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('arrow')} title="箭頭" className={`p-2 rounded-full transition-all ${activeTool === 'arrow' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <ArrowIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('rect')} title="方形" className={`p-2 rounded-full transition-all ${activeTool === 'rect' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <RectIcon className="w-5 h-5" /> </button>
                            <button onClick={() => setActiveTool('circle')} title="圓形" className={`p-2 rounded-full transition-all ${activeTool === 'circle' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}> <CircleIcon className="w-5 h-5" /> </button>
                        </div>

                        {/* Mobile Shape Menu (Accordion) */}
