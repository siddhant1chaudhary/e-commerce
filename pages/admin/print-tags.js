import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';
import { parseCookies, verifyToken } from '../../lib/auth';
import navHeader from '../../data/navHeader.json';
import ThermalTagLabel from '../../components/admin/ThermalTagLabel';
import { useToast } from '../../components/ToastProvider';
import { resolveLabelDimsIn } from '../../lib/printLabelDims';

const fetcher = (url) => fetch(url, { credentials: 'same-origin' }).then((r) => r.json());

function norm(s) {
  return String(s || '').trim();
}

export default function AdminPrintTags({ serverUser }) {
  const { user: clientUser } = useAuth();
  const user = clientUser || serverUser;
  const toast = useToast();

  const [category, setCategory] = useState('');
  const currentCatObj = useMemo(
    () => navHeader.find((c) => c.title === category || c.subTitle === category) || null,
    [category]
  );
  const subOptions = useMemo(
    () =>
      currentCatObj && Array.isArray(currentCatObj.items)
        ? currentCatObj.items.map((i) => i.label || i.subTitle).filter(Boolean)
        : [],
    [currentCatObj]
  );
  const [subCategory, setSubCategory] = useState('');
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [q, setQ] = useState('');

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  const [selected, setSelected] = useState(() => new Map()); // id -> { product, variant, copies, template }

  const [labelSize, setLabelSize] = useState('2x1'); // 2x1 | 2x2 | 2x3 | custom
  const [orientation, setOrientation] = useState('portrait'); // portrait | landscape
  const [customW, setCustomW] = useState(2);
  const [customH, setCustomH] = useState(2);
  const [template, setTemplate] = useState('regular'); // regular | sale
  const [printCopies, setPrintCopies] = useState(1); // global copies override
  const [showQr, setShowQr] = useState(false);
  const [showBarcode, setShowBarcode] = useState(true);
  const [washCareText, setWashCareText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const printAreaRef = useRef(null);

  useEffect(() => {
    if (labelSize === '2x1' && orientation !== 'portrait') {
      setOrientation('portrait');
    }
  }, [labelSize, orientation]);

  useEffect(() => {
    const d = resolveLabelDimsIn({ labelSize, orientation, customW, customH });
    let el = document.getElementById('tt-admin-print-page');
    if (!el) {
      el = document.createElement('style');
      el.id = 'tt-admin-print-page';
      document.head.appendChild(el);
    }
    el.textContent = `@media print { @page { size: ${d.w}in ${d.h}in; margin: 0; } }`;
    return () => {
      if (el) el.textContent = '';
    };
  }, [labelSize, orientation, customW, customH]);

  if (!user) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>Admin — Print Tags</h1>
          <div className="alert alert-warning">
            Please login to access admin pages. <a href="/auth/login">Login</a>
          </div>
        </main>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>Admin — Print Tags</h1>
          <div className="alert alert-danger">User is not authorized to view this page.</div>
        </main>
      </div>
    );
  }

  async function runSearch() {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', norm(q));
      if (category) params.set('category', norm(category));
      if (subCategory) params.set('subCategory', norm(subCategory));
      if (sku) params.set('sku', norm(sku));
      if (title) params.set('title', norm(title));
      params.set('limit', '80');

      const data = await fetcher(`/api/admin/print-tags/products?${params.toString()}`);
      if (data?.error) throw new Error(data.error);
      setResults(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      toast?.show({ type: 'error', message: e?.message || 'Search failed' });
    } finally {
      setSearching(false);
    }
  }

  function toggleSelected(p) {
    const id = p.id;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const sizeOptions = Array.isArray(p.sizes) && p.sizes.length ? p.sizes : [];
        const shoeOptions = Array.isArray(p.shoeSizes) && p.shoeSizes.length ? p.shoeSizes.map(String) : [];
        const variantSize = sizeOptions[0] || shoeOptions[0] || (p.freeSize?.available ? 'Free' : '');
        const colorOptions = Array.isArray(p.colors) && p.colors.length ? p.colors : [];
        const variantColor = colorOptions[0] || '';
        next.set(id, {
          product: p,
          variant: { size: variantSize, color: variantColor },
          copies: 1,
          template: 'regular',
        });
      }
      return next;
    });
  }

  function updateSelected(id, patch) {
    setSelected((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (!cur) return prev;
      next.set(id, { ...cur, ...patch });
      return next;
    });
  }

  const selectedList = useMemo(() => Array.from(selected.values()), [selected]);

  // Build print queue: expand each selected item by its copies * global printCopies
  const printQueue = useMemo(() => {
    const q = [];
    for (const row of selectedList) {
      const copies = Math.max(1, Number(row.copies || 1)) * Math.max(1, Number(printCopies || 1));
      for (let i = 0; i < copies; i++) {
        q.push(row);
      }
    }
    return q;
  }, [selectedList, printCopies]);

  function handlePrint() {
    if (!printQueue.length) {
      toast?.show({ type: 'info', message: 'Select at least 1 product to print.' });
      return;
    }
    // Browsers add date, URL, and page numbers in the print *margin* (not our HTML) when
    // "Headers and footers" is on. Clearing the document title reduces the title string
    // in the header; users should still turn off headers/footers in the print dialog.
    const prevTitle = document.title;
    document.title = '\u200b';

    const restore = () => {
      document.title = prevTitle;
    };
    const fallback = setTimeout(restore, 12_000);
    const onAfterPrint = () => {
      clearTimeout(fallback);
      window.removeEventListener('afterprint', onAfterPrint);
      restore();
    };
    window.addEventListener('afterprint', onAfterPrint, { once: true });
    window.print();
  }

  async function downloadZpl() {
    if (!selectedList.length) {
      toast?.show({ type: 'info', message: 'Select at least 1 product.' });
      return;
    }
    if (selectedList.length !== 1) {
      toast?.show({ type: 'info', message: 'ZPL download supports a single label at a time.' });
      return;
    }

    const row = selectedList[0];
    const params = new URLSearchParams();
    params.set('size', labelSize);
    if (labelSize === 'custom') {
      params.set('customW', String(customW));
      params.set('customH', String(customH));
    }
    params.set('sku', row.product?.sku || row.product?.id || '');
    params.set('title', row.product?.title || '');
    params.set('brand', row.product?.brand || row.product?.seller?.sellerName || 'Timtom');
    params.set('variant', [row.variant?.size, row.variant?.color].filter(Boolean).join(' / '));
    params.set('price', `MRP ₹${row.product?.mrp ?? row.product?.price ?? 0}`);

    const url = `/api/admin/print-tags/zpl?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function downloadPdf() {
    if (!printQueue.length) {
      toast?.show({ type: 'info', message: 'Select at least 1 product to print.' });
      return;
    }
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const root = printAreaRef.current;
      if (!root) return;

      // IMPORTANT: Do NOT screenshot the whole grid (it gets clipped for many labels).
      // Instead, render each label and add it as its own PDF page sized to the label.
      const labels = Array.from(root.querySelectorAll('.tt-label'));
      if (!labels.length) {
        toast?.show({ type: 'info', message: 'No labels found to export.' });
        return;
      }

      const dims = resolveLabelDimsIn({ labelSize, orientation, customW, customH });
      const pdf = new jsPDF({
        unit: 'in',
        format: [dims.w, dims.h],
        orientation: dims.w >= dims.h ? 'landscape' : 'portrait',
      });

      for (let i = 0; i < labels.length; i++) {
        const el = labels[i];
        // Let JsBarcode / QR finish painting into the DOM before capture
        await new Promise((r) => setTimeout(r, 350));

        // html2canvas needs a white background for thermal-like output
        const canvas = await html2canvas(el, {
          backgroundColor: '#ffffff',
          scale: 3,
          useCORS: true,
        });
        const imgData = canvas.toDataURL('image/png');

        if (i > 0) {
          pdf.addPage([dims.w, dims.h], dims.w >= dims.h ? 'landscape' : 'portrait');
        }

        pdf.addImage(imgData, 'PNG', 0, 0, dims.w, dims.h);
      }

      pdf.save('tags.pdf');
    } catch (e) {
      toast?.show({ type: 'error', message: e?.message || 'PDF export failed' });
    }
  }

  async function loadTemplates() {
    try {
      const data = await fetcher('/api/admin/print-tags/templates');
      setTemplates(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      // ignore
    }
  }

  function applyTemplate(t) {
    if (!t) return;
    setTemplate(t.type || 'regular');
    setLabelSize(t.size && ['2x1', '2x2', '2x3', 'custom'].includes(t.size) ? t.size : '2x1');
    setCustomW(t.customW ?? 2);
    setCustomH(t.customH ?? 2);
    setShowBarcode(t.showBarcode !== false);
    setShowQr(!!t.showQr);
    setWashCareText(t.washCareText || '');
  }

  async function saveCurrentTemplate() {
    const name = window.prompt('Template name', template === 'sale' ? 'Sale Tag' : 'Regular Tag');
    if (!name) return;
    try {
      const res = await fetch('/api/admin/print-tags/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name,
          type: template,
          size: labelSize,
          customW,
          customH,
          showBarcode,
          showQr,
          washCareText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save template');
      toast?.show({ type: 'success', message: 'Template saved' });
      await loadTemplates();
    } catch (e) {
      toast?.show({ type: 'error', message: e?.message || 'Failed to save template' });
    }
  }

  async function deleteTemplate(id) {
    if (!id) return;
    if (!window.confirm('Delete this template?')) return;
    try {
      const res = await fetch(`/api/admin/print-tags/templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete template');
      }
      toast?.show({ type: 'success', message: 'Template deleted' });
      setSelectedTemplateId('');
      await loadTemplates();
    } catch (e) {
      toast?.show({ type: 'error', message: e?.message || 'Failed to delete template' });
    }
  }

  useEffect(() => {
    runSearch();
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Header />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3 tt-no-print">
          <div>
            <h1 className="h4 mb-1">Print Tags</h1>
            <div className="text-muted small">Search products, select variants, preview, then print.</div>
          </div>
          <div className="d-flex gap-2 tt-no-print">
            <button className="btn btn-outline-secondary" onClick={runSearch} disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              Print Selected
            </button>
          </div>
        </div>

        <div className="row g-3 tt-no-print">
          <div className="col-12 col-lg-8">
            <div className="card p-3">
              <div className="row g-2 align-items-end">
                <div className="col-6 col-md-3">
                  <label className="form-label small">Category</label>
                  <select
                    className="form-select form-select-sm"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSubCategory('');
                    }}
                  >
                    <option value="">All</option>
                    {navHeader.map((c) => (
                      <option key={c.id} value={c.title}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-6 col-md-3">
                  <label className="form-label small">Subcategory</label>
                  <select
                    className="form-select form-select-sm"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                  >
                    <option value="">All</option>
                    {subOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-6 col-md-2">
                  <label className="form-label small">SKU</label>
                  <input className="form-control form-control-sm" value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>

                <div className="col-6 col-md-2">
                  <label className="form-label small">Product name</label>
                  <input
                    className="form-control form-control-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-2">
                  <label className="form-label small">Quick search</label>
                  <input className="form-control form-control-sm" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>

              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-semibold">Results</div>
                  <div className="small text-muted">{results.length} items</div>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }} />
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th style={{ width: 190 }}>Variant</th>
                        <th style={{ width: 110 }}>Copies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((p) => {
                        const isSel = selected.has(p.id);
                        const row = selected.get(p.id);
                        const sizeOptions = [
                          ...(Array.isArray(p.sizes) ? p.sizes : []),
                          ...(Array.isArray(p.shoeSizes) ? p.shoeSizes.map(String) : []),
                          ...(p.freeSize?.available ? ['Free'] : []),
                        ].filter(Boolean);
                        const colorOptions = Array.isArray(p.colors) ? p.colors : [];

                        return (
                          <tr key={p.id}>
                            <td>
                              <input type="checkbox" checked={isSel} onChange={() => toggleSelected(p)} />
                            </td>
                            <td>
                              <div className="fw-semibold">{p.title}</div>
                              <div className="text-muted small">{p.brand || '—'}</div>
                            </td>
                            <td className="small">{p.sku || '—'}</td>
                            <td className="small">
                              {p.category || '—'}
                              {p.subCategory ? ` / ${p.subCategory}` : ''}
                            </td>
                            <td>
                              {isSel ? (
                                <div className="d-flex gap-2">
                                  <select
                                    className="form-select form-select-sm"
                                    value={row?.variant?.size || ''}
                                    onChange={(e) =>
                                      updateSelected(p.id, { variant: { ...row.variant, size: e.target.value } })
                                    }
                                  >
                                    <option value="">— size —</option>
                                    {sizeOptions.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>

                                  {colorOptions.length ? (
                                    <select
                                      className="form-select form-select-sm"
                                      value={row?.variant?.color || ''}
                                      onChange={(e) =>
                                        updateSelected(p.id, { variant: { ...row.variant, color: e.target.value } })
                                      }
                                    >
                                      <option value="">— color —</option>
                                      {colorOptions.map((c) => (
                                        <option key={c} value={c}>
                                          {c}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      className="form-control form-control-sm"
                                      placeholder="Color (optional)"
                                      value={row?.variant?.color || ''}
                                      onChange={(e) =>
                                        updateSelected(p.id, { variant: { ...row.variant, color: e.target.value } })
                                      }
                                    />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted small">Select to choose</span>
                              )}
                            </td>
                            <td>
                              {isSel ? (
                                <input
                                  className="form-control form-control-sm"
                                  type="number"
                                  min="1"
                                  value={row?.copies || 1}
                                  onChange={(e) => updateSelected(p.id, { copies: Math.max(1, Number(e.target.value || 1)) })}
                                />
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!results.length && (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-4">
                            No results. Adjust filters and search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card p-3">
              <div className="fw-semibold mb-2">Print settings</div>

              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label small">Saved templates</label>
                  <div className="d-flex gap-2">
                    <select
                      className="form-select form-select-sm"
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedTemplateId(id);
                        const t = templates.find((x) => String(x.id) === String(id));
                        applyTemplate(t);
                      }}
                    >
                      <option value="">— choose —</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.type})
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-outline-secondary btn-sm" type="button" onClick={saveCurrentTemplate}>
                      Save
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      type="button"
                      onClick={() => deleteTemplate(selectedTemplateId)}
                      disabled={!selectedTemplateId}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="col-6">
                  <label className="form-label small" htmlFor="tt-label-size">
                    Label size
                  </label>
                  <select
                    id="tt-label-size"
                    className="form-select form-select-sm"
                    value={labelSize}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLabelSize(v);
                      if (v === '2x1') setOrientation('portrait');
                    }}
                  >
                    <optgroup label="2 x 1 (thermal, wide)">
                      <option value="2x1">2 x 1 inch (2in wide, 1in tall)</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="2x2">2 x 2 inch</option>
                      <option value="2x3">2 x 3 inch</option>
                      <option value="custom">Custom (W / H below)</option>
                    </optgroup>
                  </select>
                  <div className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                    2x1: text and barcode in one horizontal row. Custom 2 and 1 works the same.
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label small">Orientation</label>
                  <select
                    className="form-select form-select-sm"
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                    disabled={labelSize === '2x1'}
                    title={labelSize === '2x1' ? '2x1 is fixed at 2in x 1in (wide). Use Custom 2x1 for same.' : undefined}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
                <div className="col-3">
                  <label className="form-label small">W (in)</label>
                  <input
                    className="form-control form-control-sm"
                    disabled={labelSize !== 'custom'}
                    value={customW}
                    onChange={(e) => setCustomW(e.target.value)}
                  />
                </div>
                <div className="col-3">
                  <label className="form-label small">H (in)</label>
                  <input
                    className="form-control form-control-sm"
                    disabled={labelSize !== 'custom'}
                    value={customH}
                    onChange={(e) => setCustomH(e.target.value)}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small">Template</label>
                  <select className="form-select form-select-sm" value={template} onChange={(e) => setTemplate(e.target.value)}>
                    <option value="regular">Regular Tag</option>
                    <option value="sale">Sale Tag</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small">Print copies (global)</label>
                  <input
                    className="form-control form-control-sm"
                    type="number"
                    min="1"
                    value={printCopies}
                    onChange={(e) => setPrintCopies(Math.max(1, Number(e.target.value || 1)))}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small">Optional wash care text</label>
                  <input className="form-control form-control-sm" value={washCareText} onChange={(e) => setWashCareText(e.target.value)} />
                </div>

                <div className="col-12">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} id="tt-barcode" />
                    <label className="form-check-label" htmlFor="tt-barcode">
                      Barcode (CODE128)
                    </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} id="tt-qr" />
                    <label className="form-check-label" htmlFor="tt-qr">
                      QR code (from SKU)
                    </label>
                  </div>
                  <div className="small text-muted mt-1">Tip: For most thermal printers, barcode is best; QR is optional.</div>
                </div>
              </div>

              <hr />

              <div className="d-flex gap-2">
                <button className="btn btn-primary flex-grow-1" onClick={handlePrint}>
                  Print
                </button>
                <button className="btn btn-outline-secondary" onClick={downloadPdf}>
                  PDF
                </button>
                <button className="btn btn-outline-secondary" onClick={downloadZpl}>
                  ZPL
                </button>
              </div>
              <p className="text-muted small mt-2 mb-0">
                <strong>Clean print (no date/URL in margins):</strong> In the browser print window, open{' '}
                <em>More settings</em> and <strong>uncheck &quot;Headers and footers&quot;</strong> (Chrome/Edge)
                or disable <strong>Header and footer</strong> (Firefox). This is required to remove the site URL
                and page numbers; PDF export is already clean.
              </p>

              <div className="text-muted small mt-2">
                Selected: <strong>{selectedList.length}</strong> products • Labels: <strong>{printQueue.length}</strong>
              </div>
            </div>

            <div className="card p-3 mt-3">
              <div className="fw-semibold mb-2">Preview</div>
              {selectedList.length ? (
                <div className="tt-preview-surface tt-no-print">
                  <ThermalTagLabel
                    key={`${labelSize}-${customW}x${customH}-${orientation}`}
                    product={selectedList[0].product}
                    template={template}
                    size={labelSize}
                    orientation={orientation}
                    customWidthIn={customW}
                    customHeightIn={customH}
                    variant={selectedList[0].variant}
                    showQr={showQr}
                    showBarcode={showBarcode}
                    washCareText={washCareText}
                  />
                </div>
              ) : (
                <div className="text-muted small">Select a product to preview its label.</div>
              )}
            </div>
          </div>
        </div>

        {/* Print-only area */}
        <div ref={printAreaRef} className="tt-print-root">
          {printQueue.map((row, idx) => (
            <ThermalTagLabel
              key={`${row.product?.id}-${idx}`}
              product={row.product}
              template={template}
              size={labelSize}
              orientation={orientation}
              customWidthIn={customW}
              customHeightIn={customH}
              variant={row.variant}
              showQr={showQr}
              showBarcode={showBarcode}
              washCareText={washCareText}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps({ req }) {
  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;
  const serverUser = payload ? { id: payload.sub, role: payload.role, name: payload.name || null } : null;
  return { props: { serverUser } };
}

