export type ReceiptData = {
  id: string
  invoice_number: string
  org_name: string
  org_phone?: string | null
  org_email?: string | null
  member_name: string
  member_code?: string
  plan_name: string
  amount_dollars: number
  method: string
  paid_at: string
  discount_amount?: number
  notes?: string
}

export default function ReceiptModal({
  data,
  onClose,
}: {
  data: ReceiptData
  onClose: () => void
}) {
  const handlePrint = () => {
    const printable = document.getElementById('printable-receipt')
    if (!printable) {
      window.print()
      return
    }

    // Create a hidden print iframe or dedicated popup window for guaranteed clean printing
    const printWindow = window.open('', '_blank', 'width=650,height=750')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Receipt #${data.invoice_number} - ${data.org_name}</title>
            <style>
              @page { size: auto; margin: 15mm; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #0f172a;
                background: #fff;
                margin: 0;
                padding: 20px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              * { box-sizing: border-box; }
              .receipt-box {
                max-width: 500px;
                margin: 0 auto;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 24px;
              }
            </style>
          </head>
          <body>
            <div class="receipt-box">
              ${printable.innerHTML}
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 750);
              };
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    } else {
      // Fallback if popups blocked
      window.print()
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal receipt-modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 480px)', background: '#fff', padding: '28px' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>

        {/* Printable Receipt Card */}
        <div id="printable-receipt" style={{ display: 'grid', gap: '16px' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#7c3aed', fontWeight: 800 }}>OFFICIAL PAYMENT RECEIPT</span>
            <h2 style={{ margin: '4px 0 2px', font: '800 20px Manrope, sans-serif', color: '#0f172a' }}>{data.org_name}</h2>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {data.org_email || 'billing@gympoint.com'} {data.org_phone ? `· ${data.org_phone}` : ''}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#475569' }}>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>RECEIPT #</span>
              <strong style={{ color: '#0f172a' }}>{data.invoice_number}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>DATE & TIME</span>
              <strong style={{ color: '#0f172a' }}>{new Date(data.paid_at).toLocaleDateString()}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>BILLED TO</span>
              <strong style={{ color: '#0f172a' }}>{data.member_name}</strong>
              {data.member_code && <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>{data.member_code}</span>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>PAYMENT METHOD</span>
              <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{data.method.replace('_', ' ')}</strong>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
              <span style={{ color: '#334155' }}>{data.plan_name} Membership</span>
              <strong style={{ color: '#0f172a' }}>ETB {data.amount_dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            {data.discount_amount ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', color: '#16a34a' }}>
                <span>Promotional Discount</span>
                <span>-ETB {data.discount_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, paddingTop: '8px', marginTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ color: '#0f172a' }}>Total Paid</span>
              <span style={{ color: '#059669' }}>ETB {data.amount_dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
            Status: <strong style={{ color: '#16a34a' }}>PAID & VERIFIED</strong> · Thank you for training with {data.org_name}!
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" className="button button-outline" onClick={onClose}>Close</button>
          <button
            type="button"
            className="button button-primary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🖨️</span> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  )
}
