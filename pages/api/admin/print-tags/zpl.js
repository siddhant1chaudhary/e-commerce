import { requireAdminApi } from '../../../../lib/adminApi';

function esc(s) {
  // ZPL is fairly permissive; we just strip newlines.
  return String(s || '').replace(/[\r\n]+/g, ' ').trim();
}

// ZPL for thermal labels at 203dpi.
function zplForLabel({ widthIn, heightIn, sku, title, price, variant, brand }) {
  const dpi = 203;
  const w = Math.max(1, Math.round(Number(widthIn) * dpi));
  const h = Math.max(1, Math.round(Number(heightIn) * dpi));
  const compact = Number(heightIn) <= 1.15;

  const lines = [];
  lines.push('^XA');
  lines.push(`^PW${w}`);
  lines.push(`^LL${h}`);
  lines.push('^CI28');

  if (compact) {
    lines.push('^FO8,6^A0N,16,16^FD' + esc(brand || '') + '^FS');
    lines.push('^FO8,24^A0N,16,16^FD' + esc((title || '').slice(0, 42)) + '^FS');
    if (variant) lines.push('^FO8,42^A0N,12,12^FD' + esc((variant || '').slice(0, 48)) + '^FS');
    if (price) lines.push('^FO8,56^A0N,18,18^FD' + esc(price) + '^FS');
    const barH = 28;
    const barY = Math.max(64, h - barH - 10);
    lines.push(`^FO8,${barY}^BY1,2,${barH}^BCN,${barH},Y,N,N`);
    lines.push('^FD' + esc(sku || '') + '^FS');
  } else {
    lines.push('^FO20,20^A0N,26,26^FD' + esc(brand || '') + '^FS');
    lines.push('^FO20,55^A0N,28,28^FD' + esc(title || '') + '^FS');
    if (variant) lines.push('^FO20,95^A0N,24,24^FD' + esc(variant) + '^FS');
    if (price) lines.push('^FO20,125^A0N,28,28^FD' + esc(price) + '^FS');
    lines.push('^FO20,160^BY2,2,60^BCN,60,Y,N,N');
    lines.push('^FD' + esc(sku || '') + '^FS');
  }

  lines.push('^XZ');
  return lines.join('\n');
}

export default async function handler(req, res) {
  const payload = requireAdminApi(req, res);
  if (!payload) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      size = '2x2',
      customW = '',
      customH = '',
      sku = '',
      title = '',
      brand = '',
      variant = '',
      price = '',
    } = req.query || {};

    let widthIn = 2;
    let heightIn = 2;
    if (String(size) === '2x3') {
      widthIn = 2;
      heightIn = 3;
    } else if (String(size) === '2x1') {
      widthIn = 2;
      heightIn = 1;
    } else if (String(size) === 'custom') {
      const w = Number(customW);
      const h = Number(customH);
      if (Number.isFinite(w) && w > 0.5 && w < 10) widthIn = w;
      if (Number.isFinite(h) && h > 0.5 && h < 10) heightIn = h;
    }

    const zpl = zplForLabel({
      widthIn,
      heightIn,
      sku,
      title,
      brand,
      variant,
      price,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tag-${esc(sku || 'label')}.zpl"`);
    return res.status(200).send(zpl);
  } catch (err) {
    console.error('[admin/print-tags/zpl] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

