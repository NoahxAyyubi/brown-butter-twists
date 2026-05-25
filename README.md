# Brown Butter Twists

A simple home bakery website with a public menu, order request form, admin menu manager, Express API, Prisma, and PostgreSQL.

## First Files To Build

1. `prisma/schema.prisma` defines menu items and order requests.
2. `server/index.js` exposes the menu, order, admin, and health-check API endpoints.
3. `server/email.js` sends owner notification emails.
4. `client/src/main.jsx` renders the public menu, order form, and admin portal.
5. `client/src/styles.css` controls the light brown and light pink UI.

## Architecture

The app is one Node.js service. Express serves `/api/*` routes and also serves the built React frontend from `dist/`. Prisma is the database layer and reads `DATABASE_URL`, which should point to Railway Postgres. The frontend fetches live menu data from `/api/menu`; admin changes write through `/api/admin/menu`, so the public menu updates after the next fetch or page refresh.

## Database Schema

- `MenuItem`: name, price in cents, description, optional uploaded image data or image URL, availability, archive status, timestamps.
- `OrderRequest`: request type, customer contact info, ready-by date, selected items, notes, timestamp.

Uploaded images are stored as data URLs in the database for now, and seeded items can use external image URLs. This keeps deployment simple for a small menu. Later, move images to Cloudinary, S3, or Railway volumes if the bakery needs larger media storage.

## Email

The simplest production email method is SMTP via a provider like Resend, Postmark, SendGrid, or Gmail App Passwords. Set these variables:

```bash
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Brown Butter Twists <orders@example.com>"
OWNER_EMAIL=orders@example.com
```

For Railway, prefer Brevo's HTTPS API because some hosts block outbound SMTP ports. Set `BREVO_API_KEY`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, and `OWNER_EMAIL`. If `BREVO_API_KEY` is missing, the app falls back to SMTP variables. If all email variables are missing, requests are still saved to the database and the server logs the skipped email.

## Request Validation

The backend uses local JavaScript rules to reject bad requests before they save or email. It does not spend AI tokens. It requires a common-provider email, a US-style phone number, at least 10 characters of additional details, and blocks profanity, links, hostile language, or spam-like wording.

## Local Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:push
npm run seed
npm run dev
```

For local development, set `DATABASE_URL` to a local or hosted Postgres database. The frontend dev server runs on `http://localhost:5173`; the API server runs on `http://localhost:3000`.

## API

- `GET /api/health`: basic app, database, email, and menu-data check.
- `GET /api/config`: public bakery display settings.
- `GET /api/menu`: public menu data.
- `POST /api/orders`: validates contact info and message content, then saves an order or catering request and emails the owner.
- `POST /api/admin/login`: returns a temporary admin token.
- `GET /api/admin/orders`: recent order requests.
- `GET /api/admin/menu`: current and previous menu items.
- `POST /api/admin/menu`: add an item.
- `PUT /api/admin/menu/:id`: edit an item.
- `DELETE /api/admin/menu/:id`: archive an item into previous items.
- `DELETE /api/admin/menu/:id/permanent`: permanently delete an archived item.
- `POST /api/admin/menu/:id/repost`: repost a previous item.

## Railway Deployment

1. Push this folder to GitHub.
2. Create a Railway project and deploy the GitHub repo.
3. Add a Railway PostgreSQL database service.
4. In the app service variables, add `DATABASE_URL` as a reference to the Postgres service, usually `${{Postgres.DATABASE_URL}}`.
5. Add these app variables:

```bash
BAKERY_NAME="Brown Butter Twists"
OWNER_EMAIL="[OWNER_EMAIL]"
OWNER_PHONE="[OWNER_PHONE]"
ADMIN_USERNAME="Sarabakes"
ADMIN_PASSWORD="Bismillah"
SESSION_SECRET="choose-a-random-secret"
BREVO_API_KEY="your-brevo-v3-api-key"
SMTP_FROM_EMAIL="verified-sender@example.com"
SMTP_FROM_NAME="Brown Butter Twists"
SMTP_HOST="your-email-host"
SMTP_PORT="587"
SMTP_USER="your-email-user"
SMTP_PASS="your-email-password"
SMTP_FROM="Brown Butter Twists <[OWNER_EMAIL]>"
RAILWAY_URL="[RAILWAY_URL]"
```

6. Railway should detect this as a Node app. The `start` script runs `prisma db push` and then starts Express.
7. Set the health-check path to `/api/health`.
8. After deploy, visit `[RAILWAY_URL]/api/health`, `[RAILWAY_URL]/`, and `[RAILWAY_URL]/admin`.

Railway injects `PORT`; the server uses that automatically.
