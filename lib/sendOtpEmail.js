import nodemailer from 'nodemailer';

function requireEnv(name) {
	const v = process.env[name];
	if (!v) throw new Error(`Missing environment variable: ${name}`);
	return v;
}

export async function sendOtpEmail({ to, otp, expiresInSeconds, name }) {
	const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
	const smtpPort = Number(process.env.SMTP_PORT || 587);
	const smtpUser = requireEnv('SMTP_USER');
	const smtpPass = requireEnv('SMTP_PASS'); // For Gmail: use an App Password
	const mailFrom = requireEnv('MAIL_FROM');

	const secure = smtpPort === 465;
	const transporter = nodemailer.createTransport({
		host: smtpHost,
		port: smtpPort,
		secure,
		auth: { user: smtpUser, pass: smtpPass }
	});

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

