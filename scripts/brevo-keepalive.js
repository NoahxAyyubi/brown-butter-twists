import 'dotenv/config';

const apiKey = process.env.BREVO_API_KEY;
const ownerEmail = process.env.OWNER_EMAIL;
const keepaliveEmail = process.env.KEEPALIVE_EMAIL || ownerEmail;
const bakeryName = process.env.BAKERY_NAME || 'Brown Butter Twists';
const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM?.match(/<([^>]+)>/)?.[1] || keepaliveEmail;
const fromName = process.env.SMTP_FROM_NAME || bakeryName;

if (!apiKey) {
  console.error('BREVO_API_KEY is missing.');
  process.exit(1);
}

if (!keepaliveEmail || !fromEmail) {
  console.error('KEEPALIVE_EMAIL or OWNER_EMAIL, plus SMTP_FROM_EMAIL, are required.');
  process.exit(1);
}

const text = [
  `${bakeryName} monthly email test.`,
  'This is just a monthly test email to make sure the email function is working correctly.',
  'No customer order was created.',
  '',
  "Sincerely, Noah's AI employee"
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
    to: [{ email: keepaliveEmail }],
    subject: `${bakeryName} monthly email test`,
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
