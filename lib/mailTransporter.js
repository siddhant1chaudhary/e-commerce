import nodemailer from 'nodemailer';

/**
 * Single SMTP configuration for signup OTP, order confirmation, and admin notifications.
 * Set: SMTP_HOST (optional, default smtp.gmail.com), SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 */
export function createSmtpTransporter() {
	const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
	const smtpPort = Number(process.env.SMTP_PORT || 587);
	const smtpUser = process.env.SMTP_USER;
	const smtpPass = process.env.SMTP_PASS;
	if (!smtpUser || !smtpPass) {
		return null;
	}
	const secure = smtpPort === 465;
	return nodemailer.createTransport({
		host: smtpHost,
		port: smtpPort,
		secure,
		auth: { user: smtpUser, pass: smtpPass },
	});
}

export function getMailFrom() {
	const v = process.env.MAIL_FROM;
	return v ? String(v).trim() : null;
}

export function isSmtpConfigured() {
	return !!(createSmtpTransporter() && getMailFrom());
}
