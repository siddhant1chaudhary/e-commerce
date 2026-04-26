import { useEffect, useMemo, useRef } from 'react';
import { resolveLabelDimsIn, isCompactLabel } from '../../lib/printLabelDims';

/** Monochrome Instagram mark for thermal / print (single path) */
function InstagramTag({ className = '' }) {
  return (
    <div className={className}>
      <svg className="tt-ig-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.4 5.6 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.6 18.4 4 16.4 4H7.6m5.1 1.4a1.1 1.1 0 0 0-1.1 1.1A1.1 1.1 0 0 0 12.7 7.6 1.1 1.1 0 0 0 13.8 6.5a1.1 1.1 0 0 0-1-1.1M12 7.4a4.6 4.6 0 0 0-4.6 4.6A4.6 4.6 0 0 0 12 16.6a4.6 4.6 0 0 0 4.6-4.6A4.6 4.6 0 0 0 12 7.4m0 1.8a2.8 2.8 0 0 1 2.8 2.8A2.8 2.8 0 0 1 12 15a2.8 2.8 0 0 1-2.8-2.8A2.8 2.8 0 0 1 12 9.2Z"
        />
      </svg>
      <span className="tt-ig-id">@timtomcollection</span>
    </div>
  );
}

// Renders a monochrome thermal-friendly label.
// Wide short labels (e.g. 2×1) use a horizontal row: text left, barcode/QR right.
export default function ThermalTagLabel({
  product,
  template = 'regular', // 'regular' | 'sale'
  size = '2x2', // '2x1' | '2x2' | '2x3' | 'custom'
  orientation = 'portrait',
  customWidthIn = 2,
  customHeightIn = 2,
  variant = { size: '', color: '' },
  showQr = false,
  showBarcode = true,
  washCareText = '',
  className = '',
}) {
  const barcodeRef = useRef(null);
  const qrRef = useRef(null);

  const sku = product?.sku || product?.id || '';
  const brand = product?.brand || product?.seller?.sellerName || 'Timtom Seller';
  const title = product?.title || 'Product';
  const mrp =
    typeof product?.mrp === 'number'
      ? product.mrp
      : typeof product?.price === 'number'
        ? product.price
        : Number(product?.price || 0);
  const fabric = product?.fabric || '';
  const washCare = washCareText || product?.washCare || '';

  const orientedDims = useMemo(
    () => resolveLabelDimsIn({ labelSize: size, orientation, customW: customWidthIn, customH: customHeightIn }),
    [size, orientation, customWidthIn, customHeightIn]
  );
  const compact = useMemo(() => isCompactLabel(orientedDims), [orientedDims]);
  const rowLayout = useMemo(
    () => compact && orientedDims.w >= orientedDims.h,
    [compact, orientedDims.w, orientedDims.h]
  );
  const rowDualCode = useMemo(
    () => rowLayout && showBarcode && showQr,
    [rowLayout, showBarcode, showQr]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (typeof window === 'undefined') return;
      try {
        if (showBarcode && barcodeRef.current) {
          barcodeRef.current.innerHTML = '';
          if (sku) {
            const JsBarcode = (await import('jsbarcode')).default;
            if (cancelled) return;
            let opts;
            if (rowLayout) {
              opts = rowDualCode
                ? { width: 0.65, height: 12, fontSize: 4, textMargin: 0, margin: 0 }
                : { width: 0.85, height: 20, fontSize: 5, textMargin: 0, margin: 0 };
            } else {
              opts = compact
                ? { width: 1.15, height: 22, fontSize: 7, textMargin: 0, margin: 0 }
                : { width: 2, height: 42, fontSize: 12, textMargin: 2, margin: 0 };
            }
            JsBarcode(barcodeRef.current, String(sku), {
              format: 'CODE128',
              lineColor: '#000',
              displayValue: true,
              font: 'monospace',
              ...opts,
            });
          }
        }
      } catch (e) {
        // ignore
      }
      try {
        if (showQr && qrRef.current) {
          const ctx = qrRef.current.getContext?.('2d');
          if (ctx) ctx.clearRect(0, 0, qrRef.current.width, qrRef.current.height);
          if (sku) {
            const QRCode = await import('qrcode');
            if (cancelled) return;
            const qrW = rowLayout ? (rowDualCode ? 28 : 36) : compact ? 38 : 86;
            await QRCode.toCanvas(qrRef.current, String(sku), {
              margin: 0,
              width: qrW,
              color: { dark: '#000000', light: '#FFFFFF' },
            });
          }
        }
      } catch (e) {
        // ignore
      }
    }
    const id = requestAnimationFrame(() => {
      void run();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [showBarcode, showQr, sku, compact, rowLayout, rowDualCode]);

  const detailBlock = (
    <>
      {sku ? <div className="tt-sku">SKU: {sku}</div> : null}
      {variant?.size ? <div className="tt-size">Size: {variant.size}</div> : null}
      {variant?.color ? <div className="tt-color">Color: {variant.color}</div> : null}
      {fabric ? <div className="tt-fabric">Fabric: {fabric}</div> : null}
    </>
  );
  const hasRowDetails = sku || variant?.size || variant?.color || fabric;
  const washCareBlock = washCare ? <div className="tt-washcare">{washCare}</div> : null;

  return (
    <div
      className={`tt-label tt-${size} tt-${orientation} ${compact ? 'tt-compact' : ''} ${
        rowLayout ? 'tt-row' : ''
      } ${rowLayout && rowDualCode ? 'tt-row--dual' : ''} ${
        template === 'sale' ? 'tt-sale' : 'tt-regular'
      } ${className}`}
      style={{
        width: `${orientedDims.w}in`,
        height: `${orientedDims.h}in`,
        maxWidth: `${orientedDims.w}in`,
        maxHeight: `${orientedDims.h}in`,
        minWidth: `${orientedDims.w}in`,
        minHeight: `${orientedDims.h}in`,
        boxSizing: 'border-box',
      }}
    >
      <div className="tt-inner">
        {rowLayout ? (
          <>
            <div className="tt-row-text">
              <div className="tt-row-head">
                <span className="tt-brand">{brand}</span>
                {template === 'sale' && <span className="tt-badge">SALE</span>}
              </div>
              <div className="tt-row-title" title={title}>
                {title}
              </div>
              {hasRowDetails ? <div className="tt-row-details">{detailBlock}</div> : null}
              <div
                className={hasRowDetails ? 'tt-row-line2' : 'tt-row-line2 tt-row-line2--priceonly'}
              >
                <span className="tt-price">MRP ₹{Number.isFinite(mrp) ? mrp : 0}</span>
              </div>
              <InstagramTag className="tt-row-ig" />
              {washCare ? <div className="tt-washcare tt-washcare--row">{washCare}</div> : null}
            </div>
            <div
              className={`tt-row-code ${rowDualCode ? 'tt-row-code--both' : ''}`}
              aria-hidden={!showBarcode && !showQr ? true : undefined}
            >
              {showBarcode ? <svg ref={barcodeRef} className="tt-barcode" role="img" /> : null}
              {showQr ? <canvas ref={qrRef} className={rowDualCode ? 'tt-qr tt-qr--stacked' : 'tt-qr'} /> : null}
            </div>
          </>
        ) : (
          <>
            <div className="tt-top">
              <div className="tt-brand">{brand}</div>
              {template === 'sale' && <div className="tt-badge">SALE</div>}
            </div>
            <div className="tt-title" title={title}>
              {title}
            </div>
            <div className="tt-meta">
              <div className="tt-sku">SKU: {sku || '—'}</div>
              {variant?.size ? <div className="tt-size">Size: {variant.size}</div> : null}
              {variant?.color ? <div className="tt-color">Color: {variant.color}</div> : null}
              {fabric ? <div className="tt-fabric">Fabric: {fabric}</div> : null}
            </div>
            <div className="tt-bottom">
              <div className="tt-price">MRP ₹{Number.isFinite(mrp) ? mrp : 0}</div>
              <div className={`tt-code${showBarcode && showQr ? ' tt-code--both' : ''}`}>
                {showBarcode ? <svg ref={barcodeRef} className="tt-barcode" role="img" /> : null}
                {showQr ? <canvas ref={qrRef} className="tt-qr" /> : null}
              </div>
              <InstagramTag className="tt-instagram" />
              {washCareBlock}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
