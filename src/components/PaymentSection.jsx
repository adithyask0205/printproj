import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateUpiQrDataUrl } from '../utils/qrGenerator';
import { calculatePrice } from '../utils/printCalculations';

export default function PaymentSection({ upiId = 'merchant@upi', fileInfo, printOptions }) {
  const [amount, setAmount] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const canvasRef = useRef(null);

  const priceBreakdown = useMemo(() => {
    return calculatePrice({
      pages: (fileInfo && fileInfo.pages) || 1,
      options: printOptions || {},
    });
  }, [fileInfo, printOptions]);

  useEffect(() => {
    setAmount(priceBreakdown.totalAmount);
  }, [priceBreakdown]);

  useEffect(() => {
    async function updateQr() {
      try {
        setErrorMessage('');
        const referenceId = `PRINT-${Date.now()}`;
        const url = await generateUpiQrDataUrl({
          upiId,
          amount,
          reference: referenceId,
          note: 'Print Service Payment',
        });
        setQrDataUrl(url);
      } catch (err) {
        setErrorMessage('Failed to generate QR code.');
      }
    }
    if (amount > 0) updateQr();
  }, [amount, upiId]);

  return (
    <section className="payment payment__section" aria-label="Payment section">
      <h2 className="payment__title">Payment</h2>
      <div className="payment__grid">
        <div className="payment__summary">
          <div className="payment__row"><span className="payment__key">Base</span><span className="payment__value">₹{priceBreakdown.baseAmount.toFixed(2)}</span></div>
          <div className="payment__row"><span className="payment__key">Options</span><span className="payment__value">₹{priceBreakdown.optionsAmount.toFixed(2)}</span></div>
          <div className="payment__row"><span className="payment__key">Tax</span><span className="payment__value">₹{priceBreakdown.taxAmount.toFixed(2)}</span></div>
          <div className="payment__row payment__row--total"><span className="payment__key">Total</span><span className="payment__value">₹{priceBreakdown.totalAmount.toFixed(2)}</span></div>
        </div>
        <div className="payment__qr">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="UPI QR code" className="payment__qr-img" />
          ) : (
            <div ref={canvasRef} className="payment__qr-placeholder">QR will appear here</div>
          )}
          <div className="payment__details">
            <div><strong>UPI ID:</strong> {upiId}</div>
            <div><strong>Amount:</strong> ₹{amount.toFixed(2)}</div>
          </div>
          {errorMessage && <div role="alert" className="alert alert--error">{errorMessage}</div>}
        </div>
      </div>
    </section>
  );
}


