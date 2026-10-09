# Radhe Laser Studio — Cloudflare Worker API ⚡

Edge REST API built with **Hono** and **Cloudflare Workers** (100% Free Tier).

---

## 🚀 Features

- **Sub-millisecond Edge Response Times**: Runs on Cloudflare's global edge network across 300+ cities.
- **Ultra-lightweight Framework**: Powered by Hono.
- **REST Endpoints**:
  - `GET /api/health` — Edge health and latency check
  - `GET /api/portfolio` — Portfolio items and categories
  - `POST /api/enquiries` — Quote inquiry submission with validation and instant WhatsApp link generation
  - `POST /api/admin/login` — Constant-time admin authentication
  - `GET /api/admin/stats` — Quote analytics and counts
  - `GET /api/admin/verify` — Admin session verification
- **CORS Configured**: Pre-configured to accept requests from Cloudflare Pages (`*.pages.dev`) and local development.

---

## ⚙️ Automated CI/CD Deployment via GitHub Actions

This repository includes a pre-configured GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) that uses `cloudflare/wrangler-action@v3` to automatically build and deploy the Worker to Cloudflare on every push to the `main` branch.

### Required GitHub Repository Secrets

To enable automated deployment, add these two secrets to your GitHub repository:
**GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**:

1. **`CLOUDFLARE_API_TOKEN`**:
   - Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens).
   - Click **Create Token**.
   - Select the **Edit Cloudflare Workers** template.
   - Set **Account Resources** to your account.
   - Click **Continue to summary** → **Create Token**.
   - Copy the generated token and paste it as `CLOUDFLARE_API_TOKEN`.

2. **`CLOUDFLARE_ACCOUNT_ID`**:
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com).
   - Select **Workers & Pages** in the left sidebar.
   - On the right side of the page, copy your **Account ID** (a 32-character string).
   - Paste it as `CLOUDFLARE_ACCOUNT_ID`.

---

## 🛠️ Local Development

```bash
# Run local Cloudflare Workers simulator
npm run dev

# Deploy directly via Wrangler CLI
npm run deploy
```
