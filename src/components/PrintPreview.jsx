import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?worker';

GlobalWorkerOptions.workerPort = new pdfjsWorker();
const HANDLE_SIZE = 8;

// --- Main Preview Component ---
export default React.memo(function PrintPreview({ file, printOptions, currentPage, onPageChange }) {
  const canvasRef = useRef(null);
  const pdfRef = useRef(null);
  const offscreenCanvasCache = useRef({});

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pages, setPages] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(-1);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' or 'sequence'
  
  const [dragState, setDragState] = useState({
    isDragging: false,
    type: 'none',
    targetPageIndex: -1,
    startX: 0,
    startY: 0,
    ghost: null
  });

  const pagesPerSheet = useMemo(() => Number(printOptions?.pagesPerSheet || 1), [printOptions]);

  // --- Layout and Initialization Logic ---
  const resetAndLayoutPages = async () => {
    if (!pdfRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const numPages = pdfRef.current.numPages;
    const newPagesState = [];

    setIsLoading(true);

    for (let i = 1; i <= numPages; i++) {
        const page = await pdfRef.current.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        
        let targetBox;
        const pageIndexOnSheet = (i - 1) % pagesPerSheet;

        // Determine the target box for the page based on layout
        switch (pagesPerSheet) {
            case 2: // Top/Bottom layout
                targetBox = {
                    x: 0,
                    y: pageIndexOnSheet === 0 ? 0 : canvas.height / 2,
                    width: canvas.width,
                    height: canvas.height / 2,
                };
                break;
            case 4: // 2x2 grid layout
                targetBox = {
                    x: (pageIndexOnSheet % 2) * (canvas.width / 2),
                    y: Math.floor(pageIndexOnSheet / 2) * (canvas.height / 2),
                    width: canvas.width / 2,
                    height: canvas.height / 2,
                };
                break;
            default: // Case 1: Full page layout
                targetBox = { x: 0, y: 0, width: canvas.width, height: canvas.height };
                break;
        }

        // Calculate best-fit scale and dimensions
        const scale = Math.min(targetBox.width / viewport.width, targetBox.height / viewport.height) * 0.9;
        const scaledWidth = viewport.width * scale;
        const scaledHeight = viewport.height * scale;

        newPagesState.push({
            pageNumber: i,
            x: targetBox.x + (targetBox.width - scaledWidth) / 2,
            y: targetBox.y + (targetBox.height - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
            rotation: 0,
        });
    }
    
    setPages(newPagesState);
    setActivePageIndex(currentPage -1);
    setIsLoading(false);
  };
  
  // --- Effects ---
  useEffect(() => {
    if (!file || !file.type.includes('pdf')) {
      pdfRef.current = null;
      setPages([]);
      return;
    };
    
    const loadPdf = async () => {
      setIsLoading(true);
      try {
        const data = await file.arrayBuffer();
        const pdf = await getDocument({ data }).promise;
        pdfRef.current = pdf;
        offscreenCanvasCache.current = {};
      } catch (err) {
        setErrorMessage('Failed to load PDF.');
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [file]);

  // This effect now handles layout changes when file or pagesPerSheet changes
  useEffect(() => {
    if (pdfRef.current) {
        resetAndLayoutPages();
    }
  }, [pdfRef.current, pagesPerSheet]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pages.length) return;
    const context = canvas.getContext('2d');

    const drawEditorMode = async () => {
      const pagesToRenderIndices = Array.from({ length: pagesPerSheet }, (_, i) => currentPage - 1 + i);

      for (const index of pagesToRenderIndices) {
        const pageState = pages[index];
        if (!pageState) continue;

        let offscreenCanvas = offscreenCanvasCache.current[pageState.pageNumber];
        if (!offscreenCanvas && pdfRef.current) {
          const page = await pdfRef.current.getPage(pageState.pageNumber);
          const viewport = page.getViewport({ scale: 2.0 }); // Higher res for cache
          offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = viewport.width;
          offscreenCanvas.height = viewport.height;
          await page.render({ canvasContext: offscreenCanvas.getContext('2d'), viewport }).promise;
          offscreenCanvasCache.current[pageState.pageNumber] = offscreenCanvas;
        }

        if(offscreenCanvas) {
            context.save();
            context.translate(pageState.x + pageState.width / 2, pageState.y + pageState.height / 2);
            context.rotate(pageState.rotation * Math.PI / 180);
            context.drawImage(offscreenCanvas, -pageState.width / 2, -pageState.height / 2, pageState.width, pageState.height);
            context.strokeStyle = (index === activePageIndex) ? 'var(--accent)' : '#999';
            context.lineWidth = (index === activePageIndex) ? 2 : 1;
            context.strokeRect(-pageState.width / 2, -pageState.height / 2, pageState.width, pageState.height);
            context.restore();
        }

        if (index === activePageIndex) {
          context.fillStyle = 'var(--accent)';
          const halfHandle = HANDLE_SIZE / 2;
          context.fillRect(pageState.x + pageState.width - halfHandle, pageState.y + pageState.height - halfHandle, HANDLE_SIZE, HANDLE_SIZE);
          context.fillRect(pageState.x - halfHandle, pageState.y + pageState.height - halfHandle, HANDLE_SIZE, HANDLE_SIZE);
          context.fillRect(pageState.x + pageState.width - halfHandle, pageState.y - halfHandle, HANDLE_SIZE, HANDLE_SIZE);
          context.fillRect(pageState.x - halfHandle, pageState.y - halfHandle, HANDLE_SIZE, HANDLE_SIZE);
        }
      }
    };

    const drawSequenceMode = async () => {
        const cols = 4;
        const padding = 20;
        const thumbWidth = (canvas.width - (cols + 1) * padding) / cols;
        const thumbHeight = thumbWidth * (canvas.height / canvas.width);

        for (let i = 0; i < pages.length; i++) {
            const pageState = pages[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = padding + col * (thumbWidth + padding);
            const y = padding + row * (thumbHeight + padding);

            let offscreenCanvas = offscreenCanvasCache.current[pageState.pageNumber];
            if (!offscreenCanvas && pdfRef.current) {
                const page = await pdfRef.current.getPage(pageState.pageNumber);
                const viewport = page.getViewport({ scale: 2.0 });
                offscreenCanvas = document.createElement('canvas');
                offscreenCanvas.width = viewport.width;
                offscreenCanvas.height = viewport.height;
                await page.render({ canvasContext: offscreenCanvas.getContext('2d'), viewport }).promise;
                offscreenCanvasCache.current[pageState.pageNumber] = offscreenCanvas;
            }

            context.save();
            if (dragState.isDragging && dragState.targetPageIndex === i) {
                context.globalAlpha = 0.3;
            }
            context.drawImage(offscreenCanvas, x, y, thumbWidth, thumbHeight);
            context.strokeStyle = '#333';
            context.strokeRect(x, y, thumbWidth, thumbHeight);
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.font = '14px sans-serif';
            context.textAlign = 'center';
            context.fillText(pageState.pageNumber, x + thumbWidth / 2, y + 20);
            context.fillText(`(Pos ${i + 1})`, x + thumbWidth / 2, y + thumbHeight - 10);
            context.restore();
        }
        
        if (dragState.isDragging && dragState.ghost) {
            context.save();
            context.globalAlpha = 0.7;
            context.drawImage(dragState.ghost.image, dragState.ghost.x, dragState.ghost.y, thumbWidth, thumbHeight);
            context.restore();
        }
    };

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (viewMode === 'editor') drawEditorMode();
    else drawSequenceMode();

  }, [pages, currentPage, pagesPerSheet, activePageIndex, viewMode, dragState.isDragging, dragState.ghost]);
  
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    if (viewMode === 'editor') {
      const pagesToRenderIndices = Array.from({ length: pagesPerSheet }, (_, i) => currentPage - 1 + i).reverse();
      let didHit = false;
      for (const index of pagesToRenderIndices) {
        const page = pages[index];
        if (!page) continue;
        const handleType = checkHandleCollision(pos, page);
        if (handleType) {
          setActivePageIndex(index);
          setDragState({ isDragging: true, type: handleType, targetPageIndex: index, startX: pos.x, startY: pos.y });
          didHit = true; break;
        }
        if (pos.x >= page.x && pos.x <= page.x + page.width && pos.y >= page.y && pos.y <= page.y + page.height) {
          setActivePageIndex(index);
          setDragState({ isDragging: true, type: 'move', targetPageIndex: index, startX: pos.x - page.x, startY: pos.y - page.y });
          didHit = true; break;
        }
      }
      if (!didHit) setActivePageIndex(-1);
    } else {
        const cols = 4;
        const padding = 20;
        const thumbWidth = (canvasRef.current.width - (cols + 1) * padding) / cols;
        const thumbHeight = thumbWidth * (canvasRef.current.height / canvasRef.current.width);
        for(let i=0; i < pages.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = padding + col * (thumbWidth + padding);
            const y = padding + row * (thumbHeight + padding);
            if(pos.x > x && pos.x < x + thumbWidth && pos.y > y && pos.y < y + thumbHeight) {
                setDragState({ isDragging: true, targetPageIndex: i, startX: pos.x, startY: pos.y, ghost: { image: offscreenCanvasCache.current[pages[i].pageNumber], x: pos.x - thumbWidth / 2, y: pos.y - thumbHeight / 2 }});
                break;
            }
        }
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    
    if (viewMode === 'editor') {
      let cursor = 'default';
      const pagesToCheck = Array.from({ length: pagesPerSheet }, (_, i) => currentPage - 1 + i);
      let onTop = false;

      for(const index of pagesToCheck) {
        const page = pages[index];
        if(!page) continue;

        if (index === activePageIndex) {
            const handleType = checkHandleCollision(pos, page);
            if (handleType) {
                if (handleType === 'resize-br' || handleType === 'resize-tl') cursor = 'nwse-resize'; else cursor = 'nesw-resize';
                onTop = true;
                break;
            }
        }
        if (pos.x >= page.x && pos.x <= page.x + page.width && pos.y >= page.y && pos.y <= page.y + page.height) {
            cursor = 'move';
        }
      }
      if(onTop) canvas.style.cursor = cursor; else canvas.style.cursor = cursor;

      if (!dragState.isDragging) return;

      const newPages = [...pages];
      const page = newPages[dragState.targetPageIndex];
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;

      switch (dragState.type) {
        case 'move': page.x = pos.x - dragState.startX; page.y = pos.y - dragState.startY; break;
        case 'resize-br': page.width = Math.max(20, page.width + dx); page.height = Math.max(20, page.height + dy); setDragState(s => ({...s, startX: pos.x, startY: pos.y })); break;
        case 'resize-bl': page.width = Math.max(20, page.width - dx); page.height = Math.max(20, page.height + dy); page.x += dx; setDragState(s => ({...s, startX: pos.x, startY: pos.y })); break;
        case 'resize-tr': page.width = Math.max(20, page.width + dx); page.height = Math.max(20, page.height - dy); page.y += dy; setDragState(s => ({...s, startX: pos.x, startY: pos.y })); break;
        case 'resize-tl': page.width = Math.max(20, page.width - dx); page.height = Math.max(20, page.height - dy); page.x += dx; page.y += dy; setDragState(s => ({...s, startX: pos.x, startY: pos.y })); break;
      }
      setPages(newPages);
    } else {
        canvas.style.cursor = dragState.isDragging ? 'grabbing' : 'grab';
        if (!dragState.isDragging) return;
        const thumbWidth = 120;
        const thumbHeight = 160;
        setDragState(s => ({...s, ghost: { ...s.ghost, x: pos.x - thumbWidth / 2, y: pos.y - thumbHeight / 2 }}));
    }
  };

  const handleMouseUp = (e) => {
    if (viewMode === 'sequence' && dragState.isDragging) {
        const pos = getMousePos(e);
        const cols = 4;
        const padding = 20;
        const thumbWidth = (canvasRef.current.width - (cols + 1) * padding) / cols;
        const thumbHeight = thumbWidth * (canvasRef.current.height / canvasRef.current.width);
        const targetIndex = dragState.targetPageIndex;

        const col = Math.floor((pos.x - padding / 2) / (thumbWidth + padding));
        const row = Math.floor((pos.y - padding / 2) / (thumbHeight + padding));
        let dropIndex = Math.max(0, Math.min(pages.length - 1, row * cols + col));
        
        if (targetIndex !== dropIndex) {
            const newPages = [...pages];
            const [draggedPage] = newPages.splice(targetIndex, 1);
            newPages.splice(dropIndex, 0, draggedPage);
            setPages(newPages);
        }
    }
    setDragState({ isDragging: false, type: 'none', targetPageIndex: -1, startX: 0, startY: 0, ghost: null });
  };
  
  const checkHandleCollision = (pos, page) => {
    const halfHandle = HANDLE_SIZE / 2;
    if (pos.x > page.x + page.width - halfHandle && pos.x < page.x + page.width + halfHandle && pos.y > page.y + page.height - halfHandle && pos.y < page.y + page.height + halfHandle) return 'resize-br';
    if (pos.x > page.x - halfHandle && pos.x < page.x + halfHandle && pos.y > page.y + page.height - halfHandle && pos.y < page.y + page.height + halfHandle) return 'resize-bl';
    if (pos.x > page.x + page.width - halfHandle && pos.x < page.x + page.width + halfHandle && pos.y > page.y - halfHandle && pos.y < page.y + halfHandle) return 'resize-tr';
    if (pos.x > page.x - halfHandle && pos.x < page.x + halfHandle && pos.y > page.y - halfHandle && pos.y < page.y + halfHandle) return 'resize-tl';
    return null;
  };

  return (
    <section className="preview preview__section" aria-label="Print preview editor">
      <div className="preview__toolbar">
        <button className={`btn ${viewMode === 'editor' ? 'btn--active' : ''}`} onClick={() => setViewMode('editor')}>Editor</button>
        <button className={`btn ${viewMode === 'sequence' ? 'btn--active' : ''}`} onClick={() => setViewMode('sequence')}>Sequence</button>
        {viewMode === 'editor' && (
          <>
            <div className="preview__nav">
              <button className="btn" onClick={() => onPageChange(Math.max(1, currentPage - pagesPerSheet))}>Prev</button>
              <span className="preview__page">Viewing Sheet {(Math.floor((currentPage-1)/pagesPerSheet))+1}</span>
              <button className="btn" onClick={() => onPageChange(Math.min(pages.length || 1, currentPage + pagesPerSheet))}>Next</button>
            </div>
            <div className="preview__actions">
              <button className="btn" onClick={() => { if(activePageIndex !== -1) { const newPages = [...pages]; newPages[activePageIndex].rotation = (newPages[activePageIndex].rotation + 90) % 360; setPages(newPages);}}}>Rotate</button>
            </div>
          </>
        )}
      </div>
      <div className="preview__canvas-wrap">
        <canvas 
          ref={canvasRef} 
          width="595" 
          height="842" 
          className={`preview__canvas--editor view--${viewMode}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {(isLoading || (dragState.isDragging && viewMode === 'sequence')) && <div className="preview__loading">{isLoading ? 'Processing PDF...' : ' '}</div>}
        {errorMessage && <div className="alert alert--error">{errorMessage}</div>}
      </div>
    </section>
  );
});