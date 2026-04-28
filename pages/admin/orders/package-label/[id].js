import { useEffect, useRef, useState } from 'react';
import { MongoClient } from 'mongodb';
import Header from '../../../../components/Header';
import OrderPackageLabel from '../../../../components/admin/OrderPackageLabel';
import { parseCookies, verifyToken } from '../../../../lib/auth';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

export default function AdminOrderPackageLabel({ order }) {
  const printRootRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.body.classList.add('is-opkg-label-page');
    let el = document.getElementById('opkg-admin-print-page');
    if (!el) {
      el = document.createElement('style');
      el.id = 'opkg-admin-print-page';
      document.head.appendChild(el);
    }
    // Exact 4×6 in; zero @page margin so the label is not downscaled to “fit” a larger sheet.
    el.textContent = `
      @page { size: 4in 6in; margin: 0; }
      @media print {
        html, body, #__next { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    `;
    return () => {
      document.body.classList.remove('is-opkg-label-page');
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

  async function downloadPdf() {
    const node = printRootRef.current?.querySelector?.('.opkg-label');
    if (!node) return;
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      await new Promise((r) => setTimeout(r, 400));
      const canvas = await html2canvas(node, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
      });
      const wIn = 4;
      const hIn = 6;
      const pdf = new jsPDF({
        unit: 'in',
        format: [wIn, hIn],
        orientation: hIn > wIn ? 'portrait' : 'landscape',
      });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, wIn, hIn);
      pdf.save(`package-label-${order.id}.pdf`);
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
      <main className="admin-pkg-page opkg-print-page" data-opkg-main>
        <p className="text-muted small mb-2 no-print">
          <a href="/admin/dashboard">← Admin dashboard</a>
        </p>
        <div className="admin-pkg-toolbar no-print">
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
        <div className="opkg-preview" ref={printRootRef}>
          <OrderPackageLabel order={order} />
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
    console.error('[admin/orders/package-label]', err);
  }

  if (!order) {
    return { notFound: true };
  }

  return { props: { order } };
}
