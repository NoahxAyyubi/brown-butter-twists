import nodemailer from 'nodemailer';

export function hasEmailConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
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
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const ownerEmail = process.env.OWNER_EMAIL;
  const bakeryName = process.env.BAKERY_NAME || 'Brown Butter Twists';
  const items = Array.isArray(order.requestedItems)
    ? order.requestedItems.map((item) => `- ${item.name}`).join('\n')
    : order.requestedItem;

  return transporter.sendMail({
    from: process.env.SMTP_FROM || `${bakeryName} <${ownerEmail}>`,
    to: ownerEmail,
    replyTo: order.email,
    subject: `New ${order.requestType} request from ${order.customerName}`,
    text: [
      `Bakery: ${bakeryName}`,
      `Request type: ${order.requestType}`,
      `Name: ${order.customerName}`,
      `Email: ${order.email}`,
      `Phone: ${order.phone}`,
      `Ready by/requested date: ${new Date(order.requestedDate).toLocaleDateString()}`,
      `Requested items:`,
      items,
      `Notes: ${order.notes || 'None'}`
    ].filter(Boolean).join('\n')
  });
}
