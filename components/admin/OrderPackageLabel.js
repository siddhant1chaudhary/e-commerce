import { useEffect, useRef } from 'react';

/**
 * Shipping / delivery label for stick-on packages.
 * Styling matches thermal tags (.tt-*) in printTags.css; size 4×6 in (common carrier label).
 */
export default function OrderPackageLabel({ order, className = '' }) {
  const barcodeRef = useRef(null);
  const orderId = order?.id || '';
  const ship = order?.shipping || {};
  const name = ship.name || '—';
  const address = ship.address || '—';
  const phone = ship.phone || '';
  const itemCount = Array.isArray(order?.items) ? order.items.length : 0;
  const units = Array.isArray(order?.items)
    ? order.items.reduce((n, i) => n + (Number(i.qty) || 0), 0)
    : 0;
  const payment = order?.paymentMethod || 'COD';
  const total = typeof order?.total === 'number' ? order.total : Number(order?.total) || 0;
  const showCod = String(payment).toUpperCase() === 'COD';

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (typeof window === 'undefined' || !barcodeRef.current || !orderId) return;
      try {
        barcodeRef.current.innerHTML = '';
        const JsBarcode = (await import('jsbarcode')).default;
        if (cancelled) return;
        JsBarcode(barcodeRef.current, String(orderId), {
          format: 'CODE128',
          lineColor: '#000',
          displayValue: true,
          font: 'monospace',
          width: 1,
          height: 22,
          fontSize: 8,
          textMargin: 1,
          margin: 0,
        });
      } catch (e) {
        // ignore
      }
    }
    const id = requestAnimationFrame(() => void run());
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [orderId]);

  return (
    <div
      className={`opkg-label tt-label ${className}`}
      style={{
        width: '4in',
        height: '6in',
        maxWidth: '4in',
        maxHeight: '6in',
        minWidth: '4in',
        minHeight: '6in',
        boxSizing: 'border-box',
      }}
    >
      <div className="opkg-inner">
        <div className="opkg-brand">
          <span className="opkg-brand-line">Timtom Collection</span>
          <span className="opkg-brand-sub">www.timtom.in</span>
        </div>
        <div className="opkg-ship">SHIP TO</div>
        <div className="opkg-addr">
          <div className="opkg-name">{name}</div>
          <div className="opkg-text">{address}</div>
          {phone ? <div className="opkg-phone">Ph: {phone}</div> : null}
        </div>
        <div className="opkg-order-row">
          <span className="opkg-mono">Order: {orderId || '—'}</span>
        </div>
        <div className="opkg-barcode-wrap" aria-hidden={!orderId ? true : undefined}>
          {orderId ? <svg ref={barcodeRef} className="opkg-barcode" role="img" /> : null}
        </div>
        <div className="opkg-meta">
          <div>
            Items: {itemCount} line{itemCount === 1 ? '' : 's'} · {units} pc{units === 1 ? '' : 's'}
          </div>
          {showCod ? <div className="opkg-cod">Collect on delivery: ₹{total.toFixed(2)}</div> : null}
          <div className="opkg-pmt">Payment: {payment}</div>
        </div>
      </div>
    </div>
  );
}
