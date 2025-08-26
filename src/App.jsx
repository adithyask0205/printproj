import React, { useMemo, useState } from 'react';
import FileUpload from './components/FileUpload.jsx';
import PrintPreview from './components/PrintPreview.jsx';
import PrintOptions from './components/PrintOptions.jsx';
import PaymentSection from './components/PaymentSection.jsx';
import './styles/main.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMeta, setFileMeta] = useState({ pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [printOptions, setPrintOptions] = useState({});

  function handleFileSelected({ file, pageCount }) {
    setSelectedFile(file);
    setFileMeta({ pages: pageCount });
    setCurrentPage(1);
  }

  const canPreview = !!selectedFile;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Print Preview</h1>
      </header>
      <main className="app__content" role="main">
        <div className="app__left">
          <FileUpload onFileSelected={handleFileSelected} />
          {canPreview && (
            <PrintPreview
              file={selectedFile}
              printOptions={printOptions}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
        <aside className="app__right">
          <PrintOptions totalPages={fileMeta.pages} onChange={setPrintOptions} />
          <PaymentSection upiId="merchant@upi" fileInfo={{ pages: fileMeta.pages }} printOptions={printOptions} />
        </aside>
      </main>
      <footer className="app__footer">
        © {new Date().getFullYear()} Print Preview App
      </footer>
    </div>
  );
}

export default App;
