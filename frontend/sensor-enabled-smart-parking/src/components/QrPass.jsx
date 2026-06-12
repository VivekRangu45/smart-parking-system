import './QrPass.css';

export default function QrPass({ qrBase64, bookingId, zoneId, slotId, expiry }) {
  if (!qrBase64) return null;

  return (
    <div className="qr-pass-container">
      <div className="qr-header">
        <h4>Digital Parking Pass</h4>
        <span className="qr-badge">#{bookingId}</span>
      </div>
      <div className="qr-image-wrapper">
        <img src={`data:image/png;base64,${qrBase64}`} alt="Booking QR Code" className="qr-image" />
      </div>
      <div className="qr-details">
        <div className="qr-detail-item">
          <span>Zone</span>
          <strong>{getZoneLetter(zoneId)}</strong>
        </div>
        <div className="qr-detail-item">
          <span>Slot</span>
          <strong>#{slotId}</strong>
        </div>
      </div>
      <div className="qr-footer">
        <p>Valid until {new Date(expiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="qr-hint">Scan at exit gate</p>
      </div>
    </div>
  );
}

function getZoneLetter(zoneId) {
  const map = { 1: 'A', 2: 'B', 3: 'C' };
  return map[zoneId] || String(zoneId);
}
