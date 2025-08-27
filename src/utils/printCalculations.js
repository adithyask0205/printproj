function parsePageRange(rangeText, totalPages) {
  if (!rangeText) return [1, totalPages];
  const parts = rangeText.split(',');
  const pages = new Set();
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) pages.add(i);
    } else {
      const single = Math.min(totalPages, Math.max(1, parseInt(trimmed, 10) || 1));
      pages.add(single);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export function calculatePrice({ pages, options }) {
  const safePages = Math.max(1, pages || 1);
  const colorMode = options.colorMode || 'standard';
  const duplex = options.duplex || 'single';
  const pagesPerSheet = Number(options.pagesPerSheet || 1);
  const quality = options.quality || 'standard';
  const pageRangeMode = options.pageRangeMode || 'all';
  const pageRangeText = options.pageRange || `1-${safePages}`;

  let consideredPages = safePages;
  if (pageRangeMode === 'custom') {
    const selected = parsePageRange(pageRangeText, safePages);
    consideredPages = selected.length || safePages;
  }

  const sheets = Math.ceil(consideredPages / pagesPerSheet);

  const basePerSheet = 2.0; // ₹2 per sheet base
  let optionsPerSheet = 0;
  if (colorMode === 'color') optionsPerSheet += 4.0;
  if (colorMode === 'grayscale') optionsPerSheet += 1.0;
  if (quality === 'high') optionsPerSheet += 1.5;
  if (quality === 'draft') optionsPerSheet -= 0.5;
  if (duplex === 'double') optionsPerSheet += 0.5; // handling surcharge

  const baseAmount = sheets * basePerSheet;
  const optionsAmount = Math.max(0, sheets * optionsPerSheet);
  const subTotal = baseAmount + optionsAmount;
  const taxAmount = +(subTotal * 0.18).toFixed(2);
  const totalAmount = +(subTotal + taxAmount).toFixed(2);

  return {
    baseAmount,
    optionsAmount,
    taxAmount,
    totalAmount,
    sheets,
    consideredPages,
  };
}

export function estimatePreviewWorkCost(pixels) {
  // Placeholder for potential performance metric
  return Math.min(1, pixels / (1920 * 1080));
}


