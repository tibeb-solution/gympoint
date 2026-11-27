import React, { useState } from 'react'

export default function QRScannerModal({
  onClose,
  onScan,
}: {
  onClose: () => void
  onScan: (code: string) => void
}) {
  const [manualCode, setManualCode] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return
    onScan(manualCode.trim())
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 440px)' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
        <div className="modal-icon">📱</div>
        <h2>QR & barcode check-in</h2>
        <p>Scan a member pass or type their member card code.</p>

        {/* Camera Scanner Viewfinder Simulator */}
        <div style={{ position: 'relative', width: '100%', height: '170px', background: '#090b10', borderRadius: '10px', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#94a3b8', margin: '4px 0 14px' }}>
          <div style={{ position: 'absolute', width: '130px', height: '130px', border: '2px solid #7c3aed', borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '2px', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
          </div>
          <span style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', zIndex: 1, color: '#e2e8f0', marginTop: '100px' }}>
            Position QR code in center
          </span>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Or scan with USB scanner / type code
            <input
              placeholder="e.g. GP-01001"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              required
              autoFocus
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={!manualCode.trim()}>
              Validate Pass
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
