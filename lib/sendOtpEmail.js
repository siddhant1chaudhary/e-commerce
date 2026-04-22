import { createSmtpTransporter, getMailFrom } from './mailTransporter';

export async function sendOtpEmail({ to, otp, expiresInSeconds, name }) {
	const transporter = createSmtpTransporter();
	const mailFrom = getMailFrom();
	if (!transporter || !mailFrom) {
		throw new Error('Missing SMTP_USER, SMTP_PASS, or MAIL_FROM (same as order emails).');
	}

	const expiresMins = Math.max(1, Math.ceil((Number(expiresInSeconds) || 0) / 60));

	const subject = 'Your verification code';
	const text = `Hi${name ? ' ' + name : ''},\n\nYour OTP verification code is: ${otp}\n\nIt expires in about ${expiresMins} minutes.\n\nIf you didn't request this, you can ignore this message.\n`;
	const html = `<p>Hi${name ? ' ' + String(name) : ''},</p>
<p>Your OTP verification code is:</p>
<h2 style="margin:8px 0">${otp}</h2>
<p>It expires in about ${expiresMins} minutes.</p>
<p>If you didn't request this, you can ignore this message.</p>`;

	return transporter.sendMail({
		from: mailFrom,
		to: String(to),
		subject,
		text,
		html
	});
}

