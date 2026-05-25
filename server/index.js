import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { prisma } from './db.js';
import { createSession, requireAdmin } from './auth.js';
import { validateRequest } from './requestValidation.js';
import { hasEmailConfig, sendOrderEmail } from './email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '3mb' }));

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function centsToDisplay(priceCents) {
  return `$${(priceCents / 100).toFixed(2)}`;
}

function parsePriceCents(price) {
  const value = Number(String(price).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function mapMenuItem(item) {
  return {
    ...item,
    imageSrc: item.imageData || item.imageUrl || '',
    price: centsToDisplay(item.priceCents)
  };
}

app.get('/api/health', asyncHandler(async (_req, res) => {
  const menuCount = await prisma.menuItem.count();
  res.json({
    ok: true,
    bakery: process.env.BAKERY_NAME || 'Brown Butter Twists',
    database: 'connected',
    emailConfigured: hasEmailConfig(),
    menuCount
  });
}));

app.get('/api/config', (_req, res) => {
  res.json({
    bakeryName: process.env.BAKERY_NAME || 'Brown Butter Twists',
    ownerPhone: process.env.OWNER_PHONE || '(555) 123-4567'
  });
});

app.get('/api/menu', asyncHandler(async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'desc' }
  });
  res.json(items.map(mapMenuItem));
}));

app.post('/api/orders', asyncHandler(async (req, res) => {
  const { customerName, email, phone, requestedDate, notes, menuItemId, requestedItem, requestedItems, requestType = 'order' } = req.body;
  const cleanItems = Array.isArray(requestedItems) ? requestedItems.filter((item) => item?.name) : [];
  const itemSummary = cleanItems.length ? cleanItems.map((item) => item.name).join(', ') : requestedItem;

  const validation = validateRequest({
    requestType,
    customerName,
    email,
    phone,
    requestedDate,
    requestedItems: cleanItems,
    requestedItem: itemSummary,
    notes
  });

  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
  }

  const order = await prisma.orderRequest.create({
    data: {
      requestType,
      customerName,
      email: validation.normalizedEmail,
      phone: validation.normalizedPhone,
      requestedDate: new Date(requestedDate),
      notes,
      requestedItem: itemSummary,
      requestedItems: cleanItems.length ? cleanItems : undefined,
      menuItemId: menuItemId || null
    }
  });

  let emailResult = null;
  let emailError = null;
  try {
    emailResult = await sendOrderEmail(order);
  } catch (error) {
    emailError = error;
    console.error('[email failed]', {
      orderId: order.id,
      code: error.code || null,
      command: error.command || null,
      message: error.message
    });
  }

  console.log('[order request saved]', {
    orderId: order.id,
    requestType: order.requestType,
    emailSent: Boolean(emailResult && !emailResult.skipped && !emailError),
    messageId: emailResult?.messageId || null
  });
  res.status(201).json({
    ok: true,
    orderId: order.id,
    emailSent: Boolean(emailResult && !emailResult.skipped && !emailError)
  });
}));

app.post('/api/admin/login', (req, res) => {
  const configuredUsername = process.env.ADMIN_USERNAME || 'Sarabakes';
  const configuredPassword = process.env.ADMIN_PASSWORD || 'Bismillah';
  if (!configuredPassword || req.body.username !== configuredUsername || req.body.password !== configuredPassword) {
    return res.status(401).json({ error: 'Invalid admin password.' });
  }

  res.json({ token: createSession() });
});

app.get('/api/admin/orders', requireAdmin, asyncHandler(async (_req, res) => {
  const orders = await prisma.orderRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(orders);
}));

app.get('/api/admin/menu', requireAdmin, asyncHandler(async (_req, res) => {
  const items = await prisma.menuItem.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json(items.map(mapMenuItem));
}));

app.post('/api/admin/menu', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const priceCents = parsePriceCents(req.body.price);
  if (!req.body.name || priceCents === null) {
    return res.status(400).json({ error: 'Name and price are required.' });
  }

  if (!req.file && !req.body.imageUrl) {
    return res.status(400).json({ error: 'Please add an image before posting this item.' });
  }

  const imageData = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;
  const item = await prisma.menuItem.create({
    data: {
      name: req.body.name,
      priceCents,
      description: req.body.description || '',
      available: req.body.available !== 'false',
      archived: req.body.archived === 'true',
      imageData,
      imageUrl: req.body.imageUrl || null
    }
  });

  res.status(201).json(mapMenuItem(item));
}));

app.put('/api/admin/menu/:id', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const priceCents = parsePriceCents(req.body.price);
  if (!req.body.name || priceCents === null) {
    return res.status(400).json({ error: 'Name and price are required.' });
  }

  const data = {
    name: req.body.name,
    priceCents,
    description: req.body.description || '',
    available: req.body.available !== 'false',
    archived: req.body.archived === 'true',
    imageUrl: req.body.imageUrl || null
  };

  if (req.file) {
    data.imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  }

  const item = await prisma.menuItem.update({ where: { id: req.params.id }, data });
  res.json(mapMenuItem(item));
}));

app.delete('/api/admin/menu/:id', requireAdmin, asyncHandler(async (req, res) => {
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { archived: true, available: false }
  });
  res.json(mapMenuItem(item));
}));

app.delete('/api/admin/menu/:id/permanent', requireAdmin, asyncHandler(async (req, res) => {
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

app.post('/api/admin/menu/:id/repost', requireAdmin, asyncHandler(async (req, res) => {
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { archived: false, available: true }
  });
  res.json(mapMenuItem(item));
}));

const clientDist = path.join(__dirname, '..', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error. Please check the Railway logs.' });
});

app.listen(port, () => {
  console.log(`Brown Butter Twists running on port ${port}`);
});
