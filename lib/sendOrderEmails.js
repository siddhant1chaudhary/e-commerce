import { createSmtpTransporter, getMailFrom } from './mailTransporter';

function money(n) {
	const v = Number(n) || 0;
	return `₹${v.toFixed(2)}`;
}

function itemTitle(i) {
	const t = i.title || 'Item';
	const extra = [i.size ? `Size ${i.size}` : null, i.sku ? `SKU ${i.sku}` : null].filter(Boolean);
	return extra.length ? `${t} (${extra.join(', ')})` : t;
}

function linesItemsText(items) {
	return (items || [])
		.map(
			(i) =>
				`  - ${itemTitle(i)} × ${Number(i.qty) || 0} @ ${money(i.price)} = ${money(
					(Number(i.price) || 0) * (Number(i.qty) || 0)
				)}`
		)
		.join('\n');
}

function linesItemsHtml(items) {
	const rows = (items || [])
		.map(
			(i) =>
				`<tr>
					<td style="padding:8px;border:1px solid #eee">${escapeHtml(itemTitle(i))}</td>
					<td style="padding:8px;border:1px solid #eee;text-align:center">${Number(i.qty) || 0}</td>
					<td style="padding:8px;border:1px solid #eee;text-align:right">${money(i.price)}</td>
					<td style="padding:8px;border:1px solid #eee;text-align:right">${money(
						(Number(i.price) || 0) * (Number(i.qty) || 0)
					)}</td>
				</tr>`
		)
		.join('');
	return `<table style="border-collapse:collapse;width:100%;max-width:560px;margin:12px 0">
		<thead><tr style="background:#f5f5f5">
			<th style="padding:8px;border:1px solid #eee;text-align:left">Product</th>
			<th style="padding:8px;border:1px solid #eee">Qty</th>
			<th style="padding:8px;border:1px solid #eee;text-align:right">Price</th>
			<th style="padding:8px;border:1px solid #eee;text-align:right">Line</th>
		</tr></thead><tbody>${rows}</tbody></table>`;
}

function escapeHtml(s) {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function addressBlock(shipping) {
	if (!shipping || typeof shipping !== 'object') return '—';
	const parts = [shipping.name, shipping.phone, shipping.address].filter(Boolean);
	return parts.length ? parts.join('\n') : '—';
}

function addressBlockHtml(shipping) {
	if (!shipping || typeof shipping !== 'object') return '—';
	const parts = [shipping.name, shipping.phone, shipping.address].filter(Boolean);
	return parts.length ? parts.map((p) => escapeHtml(p)).join('<br/>') : '—';
}

/**
 * After a successful order, email the customer (if email present) and admin address(es).
 * Uses the same SMTP env vars as OTP mail: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
 * Admin recipients: ADMIN_ORDER_EMAIL (comma or semicolon separated). Falls back to ADMIN_EMAIL.
 * Does not throw; logs on failure.
 */
export async function sendOrderNotificationEmails({ order, customerEmail, customerName, shipping, userId }) {
	const transporter = createSmtpTransporter();
	const from = getMailFrom();
	if (!transporter || !from) {
		console.warn(
			'[sendOrderEmails] Skipped: use the same env as signup OTP (SMTP_USER, SMTP_PASS, MAIL_FROM, and optional SMTP_HOST / SMTP_PORT).'
		);
		return;
	}
	const orderId = order?.id || '—';
	const created = order?.createdAt ? new Date(order.createdAt).toLocaleString() : '—';
	const pay = order?.paymentMethod || '—';
	const sub = order?.subtotal;
	const disc = order?.discount;
	const tot = order?.total;
	const coupon = order?.coupon;

	const items = order?.items || [];
	const userLabel = userId ? `User id: ${userId}` : 'Guest checkout';

	const adminList = (process.env.ADMIN_ORDER_EMAIL || process.env.ADMIN_EMAIL || '')
		.split(/[,;]/)
		.map((s) => s.trim())
		.filter(Boolean);

	// —— Customer ——
	if (customerEmail) {
		const greet = customerName ? `Hi ${customerName}` : 'Hi';
		const subj = `Your order is placed — #${orderId}`;
		const text = `${greet},

Thank you for your order. Here are the details.

Order id: ${orderId}
Placed: ${created}
Payment: ${pay}

Items:
${linesItemsText(items)}

Subtotal: ${money(sub)}
${disc ? `Discount: -${money(disc)}` : ''}
${coupon?.code ? `Coupon: ${coupon.code}` : ''}
Total: ${money(tot)}

Shipping address:
${addressBlock(shipping)}

We will notify you when your order status updates.

— The store team`;

		const html = `<p>${escapeHtml(greet)},</p>
<p><strong>Your order is placed.</strong> Here are the details.</p>
<p>
  <strong>Order id:</strong> ${escapeHtml(orderId)}<br/>
  <strong>Placed:</strong> ${escapeHtml(created)}<br/>
  <strong>Payment:</strong> ${escapeHtml(String(pay))}
</p>
${linesItemsHtml(items)}
<p>
  Subtotal: <strong>${money(sub)}</strong><br/>
  ${disc ? `Discount: <strong>-${money(disc)}</strong><br/>` : ''}
  ${coupon?.code ? `Coupon: <strong>${escapeHtml(coupon.code)}</strong><br/>` : ''}
  Total: <strong>${money(tot)}</strong>
</p>
<p><strong>Shipping address</strong><br/>${addressBlockHtml(shipping)}</p>
<p class="small">We will notify you when your order status updates.</p>`;

		try {
			await transporter.sendMail({
				from,
				to: String(customerEmail).trim(),
				subject: subj,
				text,
				html,
			});
		} catch (e) {
			console.error('[sendOrderEmails] Customer mail failed:', e.message || e);
		}
	}

	// —— Admin ——
	if (!adminList.length) {
		console.warn('[sendOrderEmails] No admin email: set ADMIN_ORDER_EMAIL or ADMIN_EMAIL.');
		return;
	}

	const custEmailLine = customerEmail ? `Customer email: ${customerEmail}` : 'Customer email: (not provided — guest)';
	const subjAdmin = `New order received — #${orderId} — ${money(tot)}`;
	const textAdmin = `A new order was placed.

${userLabel}
${custEmailLine}
Customer name (shipping): ${shipping?.name || customerName || '—'}

Order id: ${orderId}
Placed: ${created}
Payment: ${pay}

Items:
${linesItemsText(items)}

Subtotal: ${money(sub)}
${disc ? `Discount: -${money(disc)}` : ''}
Total: ${money(tot)}

Shipping / delivery address:
${addressBlock(shipping)}
`;

	const htmlAdmin = `<p><strong>New order received</strong></p>
<p>
  ${escapeHtml(userLabel)}<br/>
  ${escapeHtml(custEmailLine)}<br/>
  <strong>Shipping name:</strong> ${escapeHtml(shipping?.name || customerName || '—')}
</p>
<p>
  <strong>Order id:</strong> ${escapeHtml(orderId)}<br/>
  <strong>Placed:</strong> ${escapeHtml(created)}<br/>
  <strong>Payment:</strong> ${escapeHtml(String(pay))}
</p>
${linesItemsHtml(items)}
<p>
  Subtotal: <strong>${money(sub)}</strong><br/>
  ${disc ? `Discount: <strong>-${money(disc)}</strong><br/>` : ''}
  Total: <strong>${money(tot)}</strong>
</p>
<p><strong>Address</strong><br/>${addressBlockHtml(shipping)}</p>
`;

	for (const to of adminList) {
		try {
			await transporter.sendMail({ from, to, subject: subjAdmin, text: textAdmin, html: htmlAdmin });
		} catch (e) {
			console.error(`[sendOrderEmails] Admin mail failed (${to}):`, e.message || e);
		}
	}
}

/**
 * Resolves customer email / display name for emails (shipping.email, else users collection).
 */
export async function resolveOrderCustomerEmail(db, order) {
	let customerEmail = typeof order?.shipping?.email === 'string' ? order.shipping.email.trim() : '';
	let customerName = (typeof order?.shipping?.name === 'string' && order.shipping.name.trim()) || '';
	if (order?.userId) {
		const u = await db.collection('users').findOne({ id: String(order.userId) });
		if (u) {
			if (!customerEmail && u.email) customerEmail = String(u.email).trim();
			if (!customerName && u.name) customerName = String(u.name).trim() || customerName;
		}
	}
	return { customerEmail: customerEmail || null, customerName };
}

/**
 * When an order is canceled (by customer or admin), notify customer and admin inboxes.
 * @param {object} options.canceledBy - { role: 'user'|'admin', name?: string }
 */
export async function sendOrderCanceledEmails({ order, canceledBy, customerEmail, customerName, userId }) {
	const transporter = createSmtpTransporter();
	const from = getMailFrom();
	if (!transporter || !from) {
		console.warn('[sendOrderCanceled] Skipped: same SMTP env as signup OTP (SMTP_USER, SMTP_PASS, MAIL_FROM).');
		return;
	}

	const byAdmin = canceledBy?.role === 'admin';
	const byLabel = byAdmin ? 'Store admin' : 'Customer';
	const actorName = (canceledBy && canceledBy.name) || (byAdmin ? 'Admin' : 'User');
	const orderId = order?.id || '—';
	const created = order?.createdAt ? new Date(order.createdAt).toLocaleString() : '—';
	const pay = order?.paymentMethod || '—';
	const sub = order?.subtotal;
	const disc = order?.discount;
	const tot = order?.total;
	const items = order?.items || [];
	const shipping = order?.shipping || {};
	const uid = userId || order?.userId;
	const userLabel = uid ? `User id: ${uid}` : 'Guest order';

	const adminList = (process.env.ADMIN_ORDER_EMAIL || process.env.ADMIN_EMAIL || '')
		.split(/[,;]/)
		.map((s) => s.trim())
		.filter(Boolean);

	const userMessage = byAdmin
		? 'The store has canceled this order. If you did not expect this, please contact us.'
		: 'We have recorded your cancellation. Any payment will be handled per our store policy.';

	// —— Customer ——
	if (customerEmail) {
		const greet = customerName ? `Hi ${customerName}` : 'Hi';
		const subj = `Order canceled — #${orderId}`;
		const whoLine = byAdmin
			? `This order was canceled by the store (${actorName}).`
			: 'You requested to cancel this order.';

		const text = `${greet},

${whoLine}

${userMessage}

Order id: ${orderId}
Originally placed: ${created}
Payment: ${pay}
Order total (before cancel): ${money(tot)}

Items:
${linesItemsText(items)}

Subtotal: ${money(sub)}
${disc ? `Discount: -${money(disc)}` : ''}
Total: ${money(tot)}

Shipping address:
${addressBlock(shipping)}

— The store team`;

		const html = `<p>${escapeHtml(greet)},</p>
<p><strong>Order canceled</strong> — #${escapeHtml(orderId)}</p>
<p>${escapeHtml(whoLine)}</p>
<p>${escapeHtml(userMessage)}</p>
<p>
  <strong>Originally placed:</strong> ${escapeHtml(created)}<br/>
  <strong>Payment:</strong> ${escapeHtml(String(pay))}<br/>
  <strong>Order total:</strong> ${money(tot)}
</p>
${linesItemsHtml(items)}
<p>
  Subtotal: <strong>${money(sub)}</strong><br/>
  ${disc ? `Discount: <strong>-${money(disc)}</strong><br/>` : ''}
  Total: <strong>${money(tot)}</strong>
</p>
<p><strong>Shipping address</strong><br/>${addressBlockHtml(shipping)}</p>`;

		try {
			await transporter.sendMail({
				from,
				to: String(customerEmail).trim(),
				subject: subj,
				text,
				html,
			});
		} catch (e) {
			console.error('[sendOrderCanceled] Customer mail failed:', e.message || e);
		}
	}

	// —— Admin ——
	if (!adminList.length) {
		return;
	}

	const custEmailLine = customerEmail ? `Customer email: ${customerEmail}` : 'Customer email: (not on file)';
	const subjAd = byAdmin
		? `Order canceled by admin — #${orderId} (${actorName})`
		: `Order canceled by customer — #${orderId}`;

	const textAd = `An order was canceled.

Canceled by: ${byLabel} (${actorName})
${userLabel}
${custEmailLine}
Customer name (shipping): ${shipping?.name || customerName || '—'}

Order id: ${orderId}
Originally placed: ${created}
Payment: ${pay}

Items:
${linesItemsText(items)}

Subtotal: ${money(sub)}
${disc ? `Discount: -${money(disc)}` : ''}
Total: ${money(tot)}

Address:
${addressBlock(shipping)}
`;

	const htmlAd = `<p><strong>Order canceled</strong></p>
<p>
  <strong>Canceled by:</strong> ${escapeHtml(byLabel)} — ${escapeHtml(String(actorName))}<br/>
  ${escapeHtml(userLabel)}<br/>
  ${escapeHtml(custEmailLine)}<br/>
  <strong>Shipping name:</strong> ${escapeHtml(shipping?.name || customerName || '—')}
</p>
<p>
  <strong>Order id:</strong> ${escapeHtml(orderId)}<br/>
  <strong>Originally placed:</strong> ${escapeHtml(created)}<br/>
  <strong>Payment:</strong> ${escapeHtml(String(pay))}
</p>
${linesItemsHtml(items)}
<p>
  Subtotal: <strong>${money(sub)}</strong><br/>
  ${disc ? `Discount: <strong>-${money(disc)}</strong><br/>` : ''}
  Total: <strong>${money(tot)}</strong>
</p>
<p><strong>Address</strong><br/>${addressBlockHtml(shipping)}</p>
`;

	for (const to of adminList) {
		try {
			await transporter.sendMail({
				from,
				to,
				subject: subjAd,
				text: textAd,
				html: htmlAd,
			});
		} catch (e) {
			console.error(`[sendOrderCanceled] Admin mail failed (${to}):`, e.message || e);
		}
	}
}
