import { useEffect, useRef, useState } from 'react';
import { MongoClient } from 'mongodb';
import Header from '../../../../components/Header';
import { parseCookies, verifyToken } from '../../../../lib/auth';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

/** Stable display string; must not use `Date#toLocaleString` in the component (SSR vs browser mismatch). */
function formatOrderCreatedAt(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

export default function AdminOrderInvoice({ order, createdAtLabel }) {
  const sheetRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let el = document.getElementById('oinv-admin-print-page');
    if (!el) {
      el = document.createElement('style');
      el.id = 'oinv-admin-print-page';
      document.head.appendChild(el);
    }
    el.textContent = '@media print { @page { size: A4; margin: 12mm; } }';
    return () => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  if (!order) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <div className="alert alert-danger">Order not found</div>
        </main>
      </div>
    );
  }

  const subtotal = typeof order.subtotal === 'number' ? order.subtotal : Number(order.subtotal) || 0;
  const discount = typeof order.discount === 'number' ? order.discount : Number(order.discount) || 0;
  const total = typeof order.total === 'number' ? order.total : Number(order.total) || 0;
  const ship = order.shipping || {};
  const items = Array.isArray(order.items) ? order.items : [];

  async function downloadPdf() {
    const node = sheetRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      await new Promise((r) => setTimeout(r, 80));
      const canvas = await html2canvas(node, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const r0 = maxW / canvas.width;
      const r1 = maxH / canvas.height;
      const scale = Math.min(r0, r1);
      const w = canvas.width * scale;
      const h = canvas.height * scale;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(imgData, 'PNG', x, y, w, h);
      pdf.save(`invoice-${order.id}.pdf`);
    } catch (e) {
      console.error(e);
      if (typeof window !== 'undefined') window.alert(e?.message || 'PDF failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Header />
      <main className="admin-invoice-page">
        <p className="text-muted small mb-2 no-print">
          <a href="/admin/dashboard">← Admin dashboard</a>
        </p>
        <div className="admin-invoice-toolbar no-print">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={downloadPdf}>
            {busy ? 'Preparing…' : 'Download PDF'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => (typeof window !== 'undefined' ? window.print() : null)}
          >
            Print
          </button>
        </div>
        <div className="admin-invoice-sheet" ref={sheetRef}>
          <div className="admin-invoice-brand">
            <div className="admin-invoice-brand-name">Timtom Collection</div>
            <div className="admin-invoice-brand-site">www.timtom.in</div>
          </div>
          <h1>Tax invoice / Order summary</h1>
          <div className="admin-invoice-meta">
            <div>
              <strong>Order ID:</strong> {order.id}
            </div>
            {createdAtLabel && (
              <div>
                <strong>Date:</strong> {createdAtLabel}
              </div>
            )}
            <div>
              <strong>Status:</strong> {order.status || '—'}
            </div>
            {order.paymentMethod && (
              <div>
                <strong>Payment:</strong> {order.paymentMethod}
              </div>
            )}
          </div>
          <div className="admin-invoice-block">
            <h2>Bill to / Ship to</h2>
            <div className="admin-invoice-addr">
              {ship.name && <div>{ship.name}</div>}
              {ship.address && <div>{ship.address}</div>}
              {ship.phone && <div>Phone: {ship.phone}</div>}
              {ship.email && <div>Email: {ship.email}</div>}
            </div>
          </div>
          {order.userId && (
            <div className="small text-muted mb-2">Customer account: {String(order.userId)}</div>
          )}
          <table className="admin-invoice-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Size</th>
                <th className="num">Qty</th>
                <th className="num">Rate (₹)</th>
                <th className="num">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const p = Number(it.price) || 0;
                const q = Number(it.qty) || 0;
                return (
                  <tr key={it.productId != null ? `${it.productId}-${i}` : i}>
                    <td>{it.title || '—'}</td>
                    <td>{it.sku || it.skuCode || it.sku_code || '—'}</td>
                    <td>{it.size || '—'}</td>
                    <td className="num">{q}</td>
                    <td className="num">{p.toFixed(2)}</td>
                    <td className="num">₹{(p * q).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <table className="admin-invoice-totals">
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td>₹{subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Discount</td>
                <td>₹{discount.toFixed(2)}</td>
              </tr>
              {order.coupon?.code && (
                <tr>
                  <td>Coupon</td>
                  <td>{order.coupon.code}</td>
                </tr>
              )}
              <tr className="grand">
                <td>Total</td>
                <td>₹{total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps({ req, params }) {
  const { id } = params;
  const cookies = parseCookies(req);
  const token = cookies.token;
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'admin') {
    return { redirect: { destination: '/auth/login', permanent: false } };
  }

  let order = null;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    order = await db.collection('orders').findOne({ id });
    await client.close();
    if (order) {
      order = JSON.parse(JSON.stringify(order));
      if (order._id) order._id = String(order._id);
    }
  } catch (err) {
    console.error('[admin/orders/invoice]', err);
  }

  if (!order) {
    return { notFound: true };
  }

  return {
    props: {
      order,
      createdAtLabel: formatOrderCreatedAt(order.createdAt),
    },
  };
}
