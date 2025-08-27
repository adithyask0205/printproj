import QRCode from 'qrcode';

function buildUpiUri({ upiId, amount, name = 'Print Service', reference, note }) {
  const params = new URLSearchParams();
  params.set('pa', upiId);
  params.set('pn', name);
  if (amount && amount > 0) params.set('am', String(amount.toFixed(2)));
  params.set('cu', 'INR');
  if (reference) params.set('tr', reference);
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString()}`;
}

export async function generateUpiQrDataUrl({ upiId, amount, reference, note }) {
  if (!upiId) throw new Error('UPI ID required');
  const uri = buildUpiUri({ upiId, amount, reference, note });
  const options = {
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    width: 256,
  };
  return await QRCode.toDataURL(uri, options);
}


