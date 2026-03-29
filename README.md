<div align="center">
  <h1>🔒 Docs Private Frame</h1>
  <p><strong>A modern, privacy-first documentation framework built on top of Docusaurus 3.</strong></p>
  <p>Seamlessly deployable to Cloudflare Pages with built-in password protection via Pages Functions.</p>

  <p>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-00C087.svg?style=for-the-badge" alt="License: MIT" /></a>
    <a href="https://docusaurus.io/"><img src="https://img.shields.io/badge/Built_with-Docusaurus_3-2E8555?style=for-the-badge&logo=docusaurus" alt="Docusaurus 3" /></a>
    <a href="https://pages.cloudflare.com/"><img src="https://img.shields.io/badge/Deployed_on-Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare" alt="Cloudflare Pages" /></a>
  </p>
</div>

---

## ✨ Features

- **📝 Markdown / MDX First** — Write docs using standard Markdown or embed React components via MDX.
- **🔒 Private By Default** — Secure Cloudflare Pages Functions middleware intercepts all requests; unauthenticated users are redirected cleanly to a beautiful login screen.
- **🔑 Secure Sessions** — Built using HMAC-SHA256 signed HttpOnly + Secure cookies with a default 7-day expiration.
- **🔍 Offline Local Search** — Integrated `@easyops-cn/docusaurus-search-local` for instant, privacy-respecting offline search without third-party services.
- **🌗 Dark Mode Ready** — Native light/dark theme toggle out of the box.
- **☁️ 1-Click Deployment** — Includes `deploy-cf.sh` to seamlessly build and deploy the framework.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18.0
- [npm](https://www.npmjs.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (Required for deployment)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server (No auth interception)
npm start
```

> **Note:** Running `npm start` **does not** trigger the Cloudflare authentication middleware. You can access the site directly at `http://localhost:3000`.
> 
> To test the complete login flow locally, run:
> ```bash
> npm run cf:preview   # Builds production static files & runs wrangler pages dev
> ```

---

## 📂 Project Structure

```text
docs-private-frame/
├── docs/                    # Markdown content (sidebar is auto-generated)
├── src/
│   ├── css/custom.css       # Global styles (Brand color: #00C087)
│   └── theme/               # Docusaurus theme overrides
├── static/                  # Static assets (images, favicon)
├── functions/
│   └── _middleware.js       # ⭐ Cloudflare Pages Authentication Middleware
├── docusaurus.config.js     # Docusaurus core configuration
├── sidebars.js              # Sidebar structure configuration
├── wrangler.toml            # Cloudflare Pages configuration
└── deploy-cf.sh             # 1-Click deployment script
```

---

## 🔒 Authentication System

The entire login logic is handled natively by `functions/_middleware.js`. **No external database or services are required**.

| Route | Behavior |
|------|------|
| `GET /__login` | Renders the beautiful auth screen. |
| `POST /__login` | Validates the password and issues a secure session cookie. |
| `GET /__login?logout=1` | Destroys the cookie and processes logout. |
| All other paths | Validates the cookie payload. Redirects to `/__login` if missing or invalid. |

### Environment Variables

| Variable | Description |
|------|------|
| `AUTH_PASSWORD` | The master password to access your documentation. |
| `AUTH_SECRET` | Secret key used to sign session cookies (Recommended: 48+ chars random string). |

> [!WARNING]
> **Never hardcode passwords in your source base!** Inject them securely via Cloudflare Secrets:
>
> ```bash
> wrangler pages secret put AUTH_PASSWORD --project-name=docs-private-frame
> wrangler pages secret put AUTH_SECRET   --project-name=docs-private-frame
> ```
> *(Tip: Generate a strong secret by running `openssl rand -base64 48`)*

---

## ☁️ Deployment (Cloudflare Pages)

### Method 1: The Deployment Script

We've bundled a convenient bash script that handles building and uploading:

```bash
chmod +x deploy-cf.sh
./deploy-cf.sh
```

### Method 2: Manual Deployment

```bash
# 1. Build the production static bundle
npm run build

# 2. Deploy to Cloudflare Pages (Deploying the static bundle + Functions)
wrangler pages deploy build --project-name=docs-private-frame
```

### Post-Deployment Checklist

After your first successful deployment, you **must set your production `.env` variables** so the authentication middleware works properly.  
You can configure these directly in your Cloudflare dashboard:  
**Cloudflare Dashboard → Pages → `docs-private-frame` → Settings → Environment variables**

---

## 🛠️ Common Commands

| Command | Description |
|------|------|
| `npm start` | Local development server (No login interception). |
| `npm run build` | Builds the static site for production. |
| `npm run cf:preview` | Local preview simulating the full Cloudflare Pages environment (includes auth). |
| `npm run serve` | Serves the built static files locally. |
| `./deploy-cf.sh` | Compiles and deploys the project to Cloudflare. |

---

## 📄 License

This framework is open-sourced under the [MIT License](./LICENSE).
