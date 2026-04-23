import { createSmtpTransporter, getMailFrom } from './mailTransporter';

function escapeHtml(s) {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Notifies store admins of a contact form submission. Same SMTP as OTP/orders
 * (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM).
 * Recipients: CONTACT_EMAIL, else ADMIN_ORDER_EMAIL or ADMIN_EMAIL (comma/semicolon separated).
 */
export async function sendContactFormEmail({ name, email, message }) {
	const transporter = createSmtpTransporter();
	const from = getMailFrom();
	if (!transporter || !from) {
		throw new Error('Email is not configured (SMTP_USER, SMTP_PASS, MAIL_FROM).');
	}

	const adminList = (process.env.CONTACT_EMAIL || process.env.ADMIN_ORDER_EMAIL || process.env.ADMIN_EMAIL || '')
		.split(/[,;]/)
		.map((s) => s.trim())
		.filter(Boolean);

	if (!adminList.length) {
		throw new Error('No contact recipient: set CONTACT_EMAIL, ADMIN_ORDER_EMAIL, or ADMIN_EMAIL.');
	}

	const safeName = String(name || '').trim() || '—';
	const safeEmail = String(email || '').trim();
	const safeMessage = String(message || '').trim();

	const subj = `Contact form: ${safeName.length > 80 ? safeName.slice(0, 80) + '…' : safeName}`;
	const text = `New message from the contact form

Name: ${safeName}
Email: ${safeEmail}

Message:
${safeMessage}
`;

	const html = `<p><strong>New message from the contact form</strong></p>
<p><strong>Name:</strong> ${escapeHtml(safeName)}<br/>
<strong>Email:</strong> <a href="mailto:${escapeHtml(safeEmail)}">${escapeHtml(safeEmail)}</a></p>
<p><strong>Message</strong></p>
<p style="white-space:pre-wrap;border-left:3px solid #007bff;padding-left:12px">${escapeHtml(
		safeMessage
	)}</p>`;

	for (const to of adminList) {
		await transporter.sendMail({
			from,
			to,
			replyTo: safeEmail,
			subject: subj,
			text,
			html,
		});
	}
}
