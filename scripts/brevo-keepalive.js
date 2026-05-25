import 'dotenv/config';

const apiKey = process.env.BREVO_API_KEY;
const ownerEmail = process.env.OWNER_EMAIL;
const bakeryName = process.env.BAKERY_NAME || 'Brown Butter Twists';
const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM?.match(/<([^>]+)>/)?.[1] || ownerEmail;
const fromName = process.env.SMTP_FROM_NAME || bakeryName;

if (!apiKey) {
  console.error('BREVO_API_KEY is missing.');
  process.exit(1);
}

if (!ownerEmail || !fromEmail) {
  console.error('OWNER_EMAIL and SMTP_FROM_EMAIL are required.');
  process.exit(1);
}

const text = [
  `${bakeryName} email keepalive check.`,
  'This monthly message keeps the Brevo API key active.',
  'No customer order was created.'
].join('\n');

const response = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'api-key': apiKey,
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    sender: { email: fromEmail, name: fromName },
    to: [{ email: ownerEmail }],
    subject: `${bakeryName} email keepalive`,
    textContent: text,
    htmlContent: `<pre>${text}</pre>`
  })
});

const body = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error('Brevo keepalive failed:', body.message || response.status);
  process.exit(1);
}

console.log('Brevo keepalive sent:', body.messageId || 'accepted');
