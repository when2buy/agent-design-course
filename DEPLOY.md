# Deployment Guide — Agent Design Course

A subscription-gated AI Agent learning platform built with: Next.js 16 + Tailwind CSS v4 + Prisma (SQLite) + NextAuth.js + Stripe.

---

## Quick Deploy (Local + Cloudflare Tunnel for public HTTPS)

### 1. Clone the project

```bash
git clone <repo-url>
cd agent-design-course
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.production
```

Edit `.env.production` and fill in the variables listed below.

### 3. Initialize the database

```bash
npx prisma db push
npx prisma db seed   # creates demo accounts
```

### 4. Build & start

```bash
npm run build
npm start -p 4000
```

### 5. Set up Cloudflare Tunnel (get a public HTTPS URL)

```bash
# Download cloudflared
curl -sL -o ~/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x ~/bin/cloudflared

# Start tunnel (prints a random HTTPS URL)
~/bin/cloudflared tunnel --url http://localhost:4000
```

Copy the printed `https://xxxx.trycloudflare.com` URL, paste it into `NEXTAUTH_URL` in `.env.production`, then rebuild and restart.

> ⚠️ Quick Tunnel URLs change on every restart. For a persistent domain, use Cloudflare Zero Trust to set up a named tunnel.

---

## Stripe Configuration

### Step 1: Create a Stripe account

Go to [dashboard.stripe.com](https://dashboard.stripe.com) and complete KYC verification.

### Step 2: Get API Keys

Navigate to **Developers → API Keys**:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (or `sk_test_...` for testing) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (or `pk_test_...` for testing) |

> Use **Test keys** (`sk_test_...` / `pk_test_...`) during development — no real charges are made.

### Step 3: Create a subscription product

Go to **Products → Add product**:
- Name: `Agent Design Course Pro`
- Pricing: Recurring, $39 / year
- After saving, copy the **Price ID** (`price_xxxxxxxxxx`) → set as `STRIPE_PRICE_ID`

### Step 4: Configure Webhook

Go to **Developers → Webhooks → Add endpoint**:
- **Endpoint URL**: `https://<your-domain>/api/stripe/webhook`
- **Listen to** (select these 5 events):
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- After saving, copy the **Signing secret** (`whsec_...`) → set as `STRIPE_WEBHOOK_SECRET`

> ⚠️ Every time the Tunnel URL changes, update the Webhook endpoint URL in the Stripe Dashboard.

### Step 5: Test Webhooks locally (optional)

```bash
# Using Stripe CLI
stripe listen --forward-to localhost:4000/api/stripe/webhook
# Prints a local webhook secret — use it in .env.production for local testing
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | SQLite file path (absolute path recommended) |
| `NEXTAUTH_SECRET` | ✅ | Random string: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Publicly accessible HTTPS URL |
| `STRIPE_SECRET_KEY` | ✅ | Stripe backend secret key (never commit!) |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe frontend public key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | ✅ | Subscription product Price ID |

---

## Content Management

All course content lives in `content/` as Markdown files. Adding new articles requires zero code changes.

See [CONTENT-GUIDE.md](./CONTENT-GUIDE.md) for details.

---

## Project Structure

```
agent-design-course/
├── content/           # Course content (Markdown)
│   ├── microgpt/
│   ├── agent-principles/
│   ├── agent-patterns/
│   └── interviews/
├── src/
│   ├── app/
│   │   ├── api/       # API routes (auth, stripe)
│   │   ├── learn/     # Course pages
│   │   ├── dashboard/ # User dashboard
│   │   └── pricing/   # Subscription page
│   ├── components/    # React components
│   └── lib/           # Utilities (content, auth, db, stripe)
├── prisma/
│   └── schema.prisma  # Database schema
├── .env.example       # Environment template (safe to commit)
└── .env.production    # Actual config (DO NOT commit!)
```

---

## FAQ

**Q: Payment succeeded but user wasn't upgraded to Pro?**
A: Check the Webhook configuration. Go to Stripe Dashboard → Webhooks → view the event log.

**Q: Login redirect failing?**
A: Make sure `NEXTAUTH_URL` exactly matches the actual access URL (including `https://`).

**Q: How to bypass payment during local development?**
A: POST to `/api/subscribe` with `{ "plan": "pro" }` while logged in — this directly upgrades the current user to Pro. **Delete this route before going to production.**

**Q: Where is the database?**
A: SQLite file, default path `prisma/dev.db`. For production, consider switching to PostgreSQL (change `DATABASE_URL` and `provider` in `schema.prisma`).
