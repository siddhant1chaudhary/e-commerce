import { useEffect, useMemo, useRef } from 'react';

// Renders a monochrome thermal-friendly label.
// Barcode/QR are optional (generated client-side).
export default function ThermalTagLabel({
  product,
  template = 'regular', // 'regular' | 'sale'
  size = '2x2', // '2x2' | '2x3' | 'custom'
  orientation = 'portrait', // 'portrait' | 'landscape'
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

  const dims = useMemo(() => {
    if (size === '2x3') return { w: 2, h: 3 };
    if (size === 'custom') {
      const w = Number(customWidthIn);
      const h = Number(customHeightIn);
      return {
        w: Number.isFinite(w) && w > 0 ? w : 2,
        h: Number.isFinite(h) && h > 0 ? h : 2,
      };
    }
    return { w: 2, h: 2 };
  }, [size, customWidthIn, customHeightIn]);

  const orientedDims = useMemo(() => {
    if (orientation === 'landscape') return { w: dims.h, h: dims.w };
    return dims;
  }, [dims, orientation]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (typeof window === 'undefined') return;

      try {
        if (showBarcode && barcodeRef.current && sku) {
          const JsBarcode = (await import('jsbarcode')).default;
          if (cancelled) return;
          JsBarcode(barcodeRef.current, String(sku), {
            format: 'CODE128',
            lineColor: '#000',
            width: 2,
            height: 42,
            displayValue: true,
            font: 'monospace',
            fontSize: 12,
            margin: 0,
          });
        }
      } catch (e) {
        // ignore barcode failures (still printable)
      }

      try {
        if (showQr && qrRef.current && sku) {
          const QRCode = await import('qrcode');
          if (cancelled) return;
          await QRCode.toCanvas(qrRef.current, String(sku), {
            margin: 0,
            width: 86,
            color: { dark: '#000000', light: '#FFFFFF' },
          });
        }
      } catch (e) {
        // ignore qr failures
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [showBarcode, showQr, sku]);

  const variantText = [variant?.size ? `Size: ${variant.size}` : '', variant?.color ? `Color: ${variant.color}` : '']
    .filter(Boolean)
    .join('  ');

  return (
    <div
      className={`tt-label tt-${size} tt-${orientation} ${template === 'sale' ? 'tt-sale' : 'tt-regular'} ${className}`}
      style={{
        width: `${orientedDims.w}in`,
        height: `${orientedDims.h}in`,
      }}
    >
      <div className="tt-inner">
        <div className="tt-top">
          <div className="tt-brand">{brand}</div>
          {template === 'sale' && <div className="tt-badge">SALE</div>}
        </div>

        <div className="tt-title" title={title}>
          {title}
        </div>

        <div className="tt-meta">
          <div className="tt-sku">SKU: {sku || '—'}</div>
          {variantText ? <div className="tt-variant">{variantText}</div> : null}
          {fabric ? <div className="tt-fabric">Fabric: {fabric}</div> : null}
        </div>

        <div className="tt-bottom">
          <div className="tt-price">MRP ₹{Number.isFinite(mrp) ? mrp : 0}</div>

          <div className="tt-code">
            {showBarcode ? (
              <svg ref={barcodeRef} className="tt-barcode" />
            ) : showQr ? (
              <canvas ref={qrRef} className="tt-qr" />
            ) : null}
          </div>

          {washCare ? <div className="tt-washcare">{washCare}</div> : null}
        </div>
      </div>
    </div>
  );
}

