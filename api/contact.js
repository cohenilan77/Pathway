import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, program, message } = req.body || {};

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    // Dev mode: log and return success so UI works without credentials
    console.log('[Contact inquiry]', { name, email, phone, program, message });
    return res.status(200).json({ success: true });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Pathway Admissions" <${user}>`,
      to: 'cohenilan@gmail.com',
      subject: 'Pathway Elite Strategy — Upgrade Inquiry',
      html: `
        <h2 style="color:#16233f;font-family:Georgia,serif">New Upgrade Inquiry</h2>
        <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600">Name</td><td>${name}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600">Email</td><td>${email}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600">Phone</td><td>${phone || '—'}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600">Program</td><td>${program || '—'}</td></tr>
        </table>
        <p style="font-family:Arial,sans-serif;font-size:14px;margin-top:16px"><strong>Message:</strong><br>${(message || '').replace(/\n/g, '<br>')}</p>
        <hr style="margin-top:24px;border-color:#eee"/>
        <p style="font-family:Arial,sans-serif;font-size:11px;color:#999">Sent via Pathway Private Office</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
