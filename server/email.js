import nodemailer from 'nodemailer';

export function hasEmailConfig() {
  return Boolean(process.env.BREVO_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
}

export async function sendOrderEmail(order) {
  if (!hasEmailConfig()) {
    console.log('[email skipped] Missing SMTP settings. Order:', order);
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const ownerEmail = process.env.OWNER_EMAIL;
  const bakeryName = process.env.BAKERY_NAME || 'Brown Butter Twists';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM?.match(/<([^>]+)>/)?.[1] || ownerEmail;
  const fromName = process.env.SMTP_FROM_NAME || bakeryName;
  const items = Array.isArray(order.requestedItems)
    ? order.requestedItems.map((item) => `- ${item.name}`).join('\n')
    : order.requestedItem;
  const subject = `New ${order.requestType} request from ${order.customerName}`;
  const text = [
    `Bakery: ${bakeryName}`,
    `Request type: ${order.requestType}`,
    `Name: ${order.customerName}`,
    `Email: ${order.email}`,
    `Phone: ${order.phone}`,
    `Ready by/requested date: ${new Date(order.requestedDate).toLocaleDateString()}`,
    `Requested items:`,
    items,
    `Notes: ${order.notes || 'None'}`
  ].filter(Boolean).join('\n');

  if (process.env.BREVO_API_KEY) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: ownerEmail }],
        replyTo: { email: order.email, name: order.customerName },
        subject,
        textContent: text,
        htmlContent: `<pre>${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>`
      })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body.message || `Brevo API failed with status ${response.status}`;
      const error = new Error(message);
      error.code = `BREVO_${response.status}`;
      throw error;
    }

    console.log('[email sent]', {
      orderId: order.id,
      provider: 'brevo-api',
      to: ownerEmail,
      from: `${fromName} <${fromEmail}>`,
      messageId: body.messageId || null
    });

    return { messageId: body.messageId, response: 'Brevo API accepted message' };
  }

  const result = await transporter.sendMail({
    from: process.env.SMTP_FROM || `${bakeryName} <${ownerEmail}>`,
    to: ownerEmail,
    replyTo: order.email,
    subject,
    text
  });

  console.log('[email sent]', {
    orderId: order.id,
    to: ownerEmail,
    from: process.env.SMTP_FROM || `${bakeryName} <${ownerEmail}>`,
    messageId: result.messageId || null,
    response: result.response || null
  });

  return result;
}
