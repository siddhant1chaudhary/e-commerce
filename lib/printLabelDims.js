// Single source of truth for label size (inches) for print, PDF, and label component.
// "2x1" is common thermal paper: 2" wide × 1" tall. It must NOT be swapped by "Landscape"
// (that was turning it into 1"×2" / tall, which users mistake for the wrong orientation).
export function resolveLabelDimsIn({ labelSize, orientation, customW, customH }) {
  let w = 2;
  let h = 2;
  if (labelSize === '2x3') {
    w = 2;
    h = 3;
  } else if (labelSize === '2x1') {
    w = 2;
    h = 1;
  } else if (labelSize === 'custom') {
    const cw = Number(customW);
    const ch = Number(customH);
    if (Number.isFinite(cw) && cw > 0) w = cw;
    if (Number.isFinite(ch) && ch > 0) h = ch;
    // Custom 2 x 1: same as 2x1 thermal strip — do not apply landscape swap below
    if (Math.abs(w - 2) < 0.02 && Math.abs(h - 1) < 0.02) {
      return { w: 2, h: 1 };
    }
  }
  if (labelSize === '2x1') {
    return { w, h };
  }
  if (orientation === 'landscape') {
    return { w: h, h: w };
  }
  return { w, h };
}

export function isCompactLabel({ w, h }) {
  return Math.min(w, h) <= 1.15;
}
