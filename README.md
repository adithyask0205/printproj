## Print Preview Web Application (React + Vite)

A simple, interactive print preview application that lets users upload files, preview them with configurable print options, and generate a UPI QR code for payment.

### Features
- File upload with validation (PDF and images, up to 10MB)
- Real-time preview using Canvas
- PDF rendering via pdf.js, including zoom and multi-page tiling (1/2/4 per sheet)
- Controlled print options: color mode, duplex, pages per sheet, paper size, quality, page range
- Dynamic price calculation with clear breakdown
- UPI QR code generation with amount and reference

### Tech Stack
- React (functional components with hooks)
- Vite
- pdf.js (`pdfjs-dist`) for PDF rendering
- `qrcode` for QR generation
- Vanilla CSS with CSS Grid/Flexbox (no frameworks)

### Project Structure
```
src/
  components/
    FileUpload.jsx
    PrintPreview.jsx
    PrintOptions.jsx
    PaymentSection.jsx
  utils/
    qrGenerator.js
    printCalculations.js
  styles/
    main.css
  App.jsx
  main.jsx
index.html
```

### Getting Started
1. Install dependencies:
   - Node >= 18 recommended
   - Run:
     ```bash
     npm install
     ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
   - Open the printed URL (e.g., http://localhost:5173/)
   - To access from other devices: `npm run dev -- --host`

### Usage
1. Click “Choose File” and select a PDF or image (≤ 10MB).
2. Adjust print options in the right panel; the preview updates live.
3. The payment section shows the price breakdown and generates a UPI QR with the total amount.

### Print Options Explained
- Color: Monochrome/Grayscale/Color (applies to canvas preview)
- Duplex: Single/Double-sided (affects pricing only in preview app)
- Pages per sheet: 1 / 2 / 4 (PDF preview tiles multiple pages per canvas)
- Paper size: A4 / Letter (UI option for completeness; preview uses PDF intrinsic sizes)
- Quality: Draft / Standard / High (changes render scale for sharper preview)
- Page range: All / Custom (influences pricing calculation)

### Pricing Model (Client-side demo)
- Base: ₹2.00 per sheet
- Options:
  - Color: +₹4.00, Grayscale: +₹1.00 per sheet
  - Quality: High +₹1.50, Draft -₹0.50 per sheet
  - Duplex: +₹0.50 per sheet
- Tax: 18%

### Accessibility & UX
- ARIA labels for key controls
- Live regions for loading and errors
- Responsive layout (desktop/tablet/mobile)

### Troubleshooting
- PDF doesn’t preview:
  - Ensure `pdfjs-dist` is installed: `npm install pdfjs-dist`
  - The app uses pdf.js worker via Vite import: `pdfjs-dist/build/pdf.worker.min?worker`
  - Try a different PDF to rule out file corruption
- “JSX syntax not enabled” error in dev server:
  - Components must use `.jsx` extension. Ensure files in `src/components` are `*.jsx` and imports in `src/App.jsx` match.
- Dev server URL not opening:
  - Make sure it’s running (`npm run dev`) and open the Local URL in your browser

### Security Notes
- Files are processed client-side only
- No sensitive payment data is stored; QR encodes UPI URI with amount and reference

### License
MIT
