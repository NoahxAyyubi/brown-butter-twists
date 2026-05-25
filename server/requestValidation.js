const allowedEmailDomains = new Set([
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'aol.com',
  'proton.me',
  'protonmail.com'
]);

const blockedWords = [
  'bullshit',
  'fuck',
  'fucking',
  'shit',
  'bitch',
  'asshole',
  'idiot',
  'stupid',
  'dumbass',
  'scam',
  'spam'
];

const blockedPhrases = [
  'click here',
  'whatsapp me'
];

const spamSignals = [
  'crypto',
  'forex',
  'casino',
  'viagra',
  'telegram',
  'http://',
  'https://',
  'www.'
];

function normalizeForModeration(value = '') {
  return value
    .toLowerCase()
    .replaceAll('@', 'a')
    .replaceAll('$', 's')
    .replaceAll('0', 'o')
    .replaceAll('1', 'i')
    .replaceAll('!', 'i')
    .replaceAll('3', 'e')
    .replaceAll('5', 's')
    .replaceAll('7', 't')
    .replace(/(.)\1{2,}/g, '$1$1');
}

function containsBlockedLanguage(value = '') {
  const normalized = normalizeForModeration(value);
  const compact = normalized.replace(/[\s._-]+/g, '');
  const foundWords = blockedWords.filter((word) => {
    const wordPattern = new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, 'i');
    return wordPattern.test(normalized) || compact.includes(word);
  });
  const foundPhrases = blockedPhrases.filter((phrase) => normalized.includes(phrase));
  const foundSpam = spamSignals.filter((signal) => normalized.includes(signal));

  return {
    blocked: Boolean(foundWords.length || foundPhrases.length || foundSpam.length),
    matches: [...foundWords, ...foundPhrases, ...foundSpam]
  };
}

export function validateEmail(email = '') {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { valid: false, reason: 'Email is required.' };

  const basicShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  if (!basicShape) return { valid: false, reason: 'Email must include @ and a valid domain.' };

  const domain = trimmed.split('@').pop();
  if (!allowedEmailDomains.has(domain)) {
    return { valid: false, reason: 'Use a common email provider such as Gmail, iCloud, Yahoo, Outlook, Hotmail, AOL, or Proton.' };
  }

  return { valid: true, normalized: trimmed };
}

export function validatePhone(phone = '') {
  const trimmed = phone.trim();
  if (!trimmed) return { valid: false, reason: 'Phone number is required.' };

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return { valid: true, normalized: digits };
  if (digits.length === 11 && digits.startsWith('1')) return { valid: true, normalized: digits };

  return { valid: false, reason: 'Phone number must be a 10 digit US number, or 11 digits if it starts with 1.' };
}

export function validateRequest(order) {
  const errors = [];
  const emailCheck = validateEmail(order.email);
  const phoneCheck = validatePhone(order.phone);
  const details = (order.notes || '').trim();

  if (!order.customerName?.trim()) errors.push('Name is required.');
  if (!order.requestedDate) errors.push('Ready-by date is required.');
  if (!order.requestedItem?.trim()) errors.push('Please select at least one item or describe the catering request.');
  if (!emailCheck.valid) errors.push(emailCheck.reason);
  if (!phoneCheck.valid) errors.push(phoneCheck.reason);
  if (details.length < 10) errors.push('Additional details must be at least 10 characters.');

  const moderation = containsBlockedLanguage([
    order.customerName,
    order.requestedItem,
    details
  ].join(' '));

  if (moderation.blocked) {
    errors.push('Please remove profanity, hostile language, links, or spam-like wording from the request.');
  }

  return {
    valid: errors.length === 0,
    errors,
    normalizedEmail: emailCheck.normalized || '',
    normalizedPhone: phoneCheck.normalized || ''
  };
}
