import React, { useRef, useState } from 'react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
];

export default function FileUpload({ onFileSelected }) {
  const inputRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileInfo, setFileInfo] = useState(null);

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  async function handleFilesChange(event) {
    try {
      setErrorMessage('');
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage('File is too large. Max size is 10MB.');
        setFileInfo(null);
        return;
      }

      const detectedType = file.type || 'application/octet-stream';
      const isAccepted = ACCEPTED_TYPES.includes(detectedType) || file.name.toLowerCase().endsWith('.pdf');
      if (!isAccepted) {
        setErrorMessage('Unsupported file format. Please upload a PDF or image.');
        setFileInfo(null);
        return;
      }

      // Basic pages detection: 1 for images; PDFs estimated via ArrayBuffer scan for \/Type \/Page
      let pageCount = 1;
      if (detectedType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const text = new TextDecoder('utf-8').decode(arrayBuffer);
          const matches = text.match(/\/Type\s*\/Page[^s]/g);
          pageCount = matches ? matches.length : 1;
        } catch (err) {
          pageCount = 1;
        }
      }

      setFileInfo({
        name: file.name,
        size: file.size,
        type: detectedType,
        pages: pageCount,
      });

      if (onFileSelected) {
        onFileSelected({ file, pageCount });
      }
    } catch (err) {
      setErrorMessage('Failed to process the file. Please try another file.');
    }
  }

  function triggerChooseFile() {
    inputRef.current && inputRef.current.click();
  }

  return (
    <section className="upload upload__section" aria-label="File upload">
      <div className="upload__header">
        <h2 className="upload__title">Upload File</h2>
        <p className="upload__hint">Max 10MB. PDF or images only.</p>
      </div>

      <div className="upload__actions">
        <button type="button" className="btn btn--primary" onClick={triggerChooseFile} aria-label="Choose file">
          Choose File
        </button>
        <input
          ref={inputRef}
          className="upload__input"
          type="file"
          accept=".pdf,image/*"
          onChange={handleFilesChange}
          aria-label="File input"
          hidden
        />
      </div>

      {errorMessage && (
        <div role="alert" className="alert alert--error" aria-live="assertive">{errorMessage}</div>
      )}

      {fileInfo && (
        <div className="upload__info">
          <div className="upload__info-row">
            <span className="upload__info-key">Name</span>
            <span className="upload__info-value" title={fileInfo.name}>{fileInfo.name}</span>
          </div>
          <div className="upload__info-row">
            <span className="upload__info-key">Size</span>
            <span className="upload__info-value">{formatBytes(fileInfo.size)}</span>
          </div>
          <div className="upload__info-row">
            <span className="upload__info-key">Type</span>
            <span className="upload__info-value">{fileInfo.type}</span>
          </div>
          <div className="upload__info-row">
            <span className="upload__info-key">Pages</span>
            <span className="upload__info-value">{fileInfo.pages}</span>
          </div>
        </div>
      )}
    </section>
  );
}


