import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?worker';

const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.1;

function drawImageOnCanvas(img, canvas, scale) {
  const context = canvas.getContext('2d');
  const width = Math.min(img.width * scale, 1400);
  const height = (img.height * width) / img.width;
  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(img, 0, 0, width, height);
}

GlobalWorkerOptions.workerPort = new pdfjsWorker();

async function renderPdfTiled({ file, canvas, scale, pagesPerSheet, colorMode }) {
  const data = await file.arrayBuffer();
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;

  const firstPage = await pdf.getPage(1);
  const viewport = firstPage.getViewport({ scale: 1 });
  const pageWidth = viewport.width * scale;
  const pageHeight = viewport.height * scale;

  let cols = 1, rows = 1;
  if (pagesPerSheet === 2) { cols = 1; rows = 2; }
  if (pagesPerSheet === 4) { cols = 2; rows = 2; }

  const totalWidth = Math.floor(pageWidth * cols);
  const totalHeight = Math.floor(pageHeight * rows);
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, totalWidth, totalHeight);

  const renderOne = async (pageNumber, tileX, tileY) => {
    if (pageNumber > pdf.numPages) return;
    const page = await pdf.getPage(pageNumber);
    const vp = page.getViewport({ scale });
    const off = document.createElement('canvas');
    off.width = Math.floor(vp.width);
    off.height = Math.floor(vp.height);
    await page.render({ canvasContext: off.getContext('2d'), viewport: vp }).promise;

    if (colorMode === 'grayscale' || colorMode === 'monochrome') {
      const ctx = off.getContext('2d');
      const img = ctx.getImageData(0, 0, off.width, off.height);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const val = colorMode === 'monochrome' ? (gray > 160 ? 255 : 0) : gray;
        data[i] = data[i+1] = data[i+2] = val;
      }
      ctx.putImageData(img, 0, 0);
    }

    context.drawImage(off, tileX, tileY, Math.floor(pageWidth), Math.floor(pageHeight));
  };

  let pageIndex = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.floor(c * pageWidth);
      const y = Math.floor(r * pageHeight);
      await renderOne(1 + pageIndex, x, y);
      pageIndex++;
    }
  }
}

function useDebounced(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default React.memo(function PrintPreview({ file, printOptions, currentPage, onPageChange }) {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const debouncedOptions = useDebounced(printOptions, 200);
  const debouncedPage = useDebounced(currentPage, 150);

  const isPdf = useMemo(() => {
    if (!file) return false;
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }, [file]);

  const qualityScale = useMemo(() => {
    const q = debouncedOptions?.quality || 'standard';
    if (q === 'draft') return 0.9;
    if (q === 'high') return 1.25;
    return 1.0;
  }, [debouncedOptions]);

  const pagesPerSheet = useMemo(() => Number(debouncedOptions?.pagesPerSheet || 1), [debouncedOptions]);
  const colorMode = useMemo(() => debouncedOptions?.colorMode || 'color', [debouncedOptions]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!file || !canvasRef.current) return;
      setIsLoading(true);
      setErrorMessage('');
      try {
        const scale = Math.max(0.2, zoom * qualityScale);
        if (isPdf) {
          await renderPdfTiled({
            file,
            canvas: canvasRef.current,
            scale,
            pagesPerSheet,
            colorMode,
          });
        } else {
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            try {
              drawImageOnCanvas(img, canvasRef.current, scale);
              if (colorMode === 'grayscale' || colorMode === 'monochrome') {
                const ctx = canvasRef.current.getContext('2d');
                const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                  const r = data[i], g = data[i+1], b = data[i+2];
                  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                  const val = colorMode === 'monochrome' ? (gray > 160 ? 255 : 0) : gray;
                  data[i] = data[i+1] = data[i+2] = val;
                }
                ctx.putImageData(imgData, 0, 0);
              }
            } finally {
              URL.revokeObjectURL(url);
              if (!cancelled) setIsLoading(false);
            }
          };
          img.onerror = () => {
            setErrorMessage('Failed to load image for preview.');
            if (!cancelled) setIsLoading(false);
          };
          img.src = url;
          return;
        }
      } catch (err) {
        setErrorMessage('Failed to render preview.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    render();
    return () => { cancelled = true };
  }, [file, isPdf, debouncedOptions, debouncedPage, zoom, qualityScale, pagesPerSheet, colorMode]);

  function handleZoomIn() {
    setZoom(z => Math.min(3, +(z + ZOOM_STEP).toFixed(2)));
  }
  function handleZoomOut() {
    setZoom(z => Math.max(0.2, +(z - ZOOM_STEP).toFixed(2)));
  }
  function handleResetZoom() {
    setZoom(DEFAULT_ZOOM);
  }

  function handlePrev() {
    const step = pagesPerSheet || 1;
    onPageChange && onPageChange(Math.max(1, (currentPage || 1) - step));
  }
  function handleNext() {
    const step = pagesPerSheet || 1;
    onPageChange && onPageChange((currentPage || 1) + step);
  }

  return (
    <section className="preview preview__section" aria-label="Print preview">
      <div className="preview__toolbar">
        <div className="preview__nav">
          <button className="btn" onClick={handlePrev} aria-label="Previous page">Prev</button>
          <span className="preview__page" aria-live="polite">Page {currentPage || 1}</span>
          <button className="btn" onClick={handleNext} aria-label="Next page">Next</button>
        </div>
        <div className="preview__zoom">
          <button className="btn" onClick={handleZoomOut} aria-label="Zoom out">-</button>
          <button className="btn" onClick={handleResetZoom} aria-label="Reset zoom">100%</button>
          <button className="btn" onClick={handleZoomIn} aria-label="Zoom in">+</button>
        </div>
      </div>
      <div className="preview__canvas-wrap">
        <canvas ref={canvasRef} className="preview__canvas" aria-label="Preview canvas" />
        {isLoading && <div className="preview__loading" aria-live="polite">Rendering preview…</div>}
        {errorMessage && <div className="alert alert--error" role="alert">{errorMessage}</div>}
      </div>
    </section>
  );
});


