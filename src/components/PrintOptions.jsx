import React, { useEffect, useMemo, useState } from 'react';

const defaultOptions = {
  colorMode: 'standard', // monochrome | grayscale | color -> normalized later
  duplex: 'single', // single | double
  pagesPerSheet: 1, // 1 | 2 | 4
  paperSize: 'A4', // A4 | Letter
  quality: 'standard', // draft | standard | high
  pageRangeMode: 'all', // all | custom
  pageRange: '1-1',
};

function normalizeOptions(options) {
  return {
    ...options,
    colorMode: options.colorMode,
    duplex: options.duplex,
    pagesPerSheet: Number(options.pagesPerSheet) || 1,
  };
}

export default function PrintOptions({ totalPages = 1, onChange }) {
  const [options, setOptions] = useState(defaultOptions);

  useEffect(() => {
    onChange && onChange(normalizeOptions(options));
  }, [options, onChange]);

  function handleChange(event) {
    const { name, value } = event.target;
    setOptions(prev => ({ ...prev, [name]: value }));
  }

  const pageRangeHint = useMemo(() => {
    return `Enter ranges like 1-3,5,7-${totalPages}`;
  }, [totalPages]);

  return (
    <section className="options options__section" aria-label="Print options">
      <h2 className="options__title">Print Options</h2>
      <div className="options__grid">
        <label className="options__field">
          <span className="options__label">Color</span>
          <select name="colorMode" value={options.colorMode} onChange={handleChange} className="options__input" aria-label="Color mode">
            <option value="monochrome">Monochrome</option>
            <option value="grayscale">Grayscale</option>
            <option value="color">Color</option>
          </select>
        </label>

        <label className="options__field">
          <span className="options__label">Duplex</span>
          <select name="duplex" value={options.duplex} onChange={handleChange} className="options__input" aria-label="Duplex">
            <option value="single">Single-sided</option>
            <option value="double">Double-sided</option>
          </select>
        </label>

        <label className="options__field">
          <span className="options__label">Pages per sheet</span>
          <select name="pagesPerSheet" value={options.pagesPerSheet} onChange={handleChange} className="options__input" aria-label="Pages per sheet">
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </label>

        <label className="options__field">
          <span className="options__label">Paper size</span>
          <select name="paperSize" value={options.paperSize} onChange={handleChange} className="options__input" aria-label="Paper size">
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </label>

        <label className="options__field">
          <span className="options__label">Quality</span>
          <select name="quality" value={options.quality} onChange={handleChange} className="options__input" aria-label="Quality">
            <option value="draft">Draft</option>
            <option value="standard">Standard</option>
            <option value="high">High</option>
          </select>
        </label>

        <fieldset className="options__field options__field--range">
          <legend className="options__label">Page range</legend>
          <div className="options__range">
            <label className="options__radio">
              <input type="radio" name="pageRangeMode" value="all" checked={options.pageRangeMode === 'all'} onChange={handleChange} />
              <span>All</span>
            </label>
            <label className="options__radio">
              <input type="radio" name="pageRangeMode" value="custom" checked={options.pageRangeMode === 'custom'} onChange={handleChange} />
              <span>Custom</span>
            </label>
            <input
              type="text"
              name="pageRange"
              value={options.pageRange}
              onChange={handleChange}
              className="options__input"
              aria-label="Custom page range"
              placeholder="e.g., 1-3,5"
              disabled={options.pageRangeMode !== 'custom'}
              title={pageRangeHint}
            />
          </div>
          <small className="options__hint">{pageRangeHint}</small>
        </fieldset>
      </div>
    </section>
  );
}


