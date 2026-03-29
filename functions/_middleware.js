/**
 * Cloudflare Pages Middleware — 全局认证拦截
 *
 * 环境变量（在 Cloudflare Dashboard 通过 wrangler secret put 配置）：
 *   AUTH_PASSWORD  — 访问密码
 *   AUTH_SECRET    — 签名 Cookie 的随机密钥
 *
 * 流程：
 *   GET  /__login         → 显示登录页
 *   GET  /__login?logout=1 → 清除 Cookie 并重定向到登录页
 *   POST /__login         → 验证密码，成功后写 Cookie 并跳转
 *   其他路径              → 验证 Cookie，未登录则跳转 /__login
 */

const LOGIN_PATH = '/__login';
const COOKIE_NAME = 'cf_auth_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

// ────────────────────────────────────────────────────────────
// 密码工具（HMAC-SHA256 签名，使用 Web Crypto API）
// ────────────────────────────────────────────────────────────

async function sign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function verifySignature(message, signature, secret) {
  return (await sign(message, secret)) === signature;
}

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').find(c => c.trim().startsWith(name + '='));
  return match ? match.trim().slice(name.length + 1) : null;
}

async function isAuthenticated(request, secret) {
  const token = getCookie(request.headers.get('Cookie'), COOKIE_NAME);
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  return verifySignature(payload, sig, secret);
}

function makeCookie(token, maxAge) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// ────────────────────────────────────────────────────────────
// 主中间件入口
// ────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const password = env.AUTH_PASSWORD || 'changeme';
  const secret   = env.AUTH_SECRET   || 'default-secret-please-change-in-production';

  // ── 退出登录 ────────────────────────────────────────────
  if (path === LOGIN_PATH && url.searchParams.get('logout') === '1') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: LOGIN_PATH,
        'Set-Cookie': makeCookie('', 0),
      },
    });
  }

  // ── 登录页 GET ──────────────────────────────────────────
  if (path === LOGIN_PATH && request.method === 'GET') {
    const redirect = url.searchParams.get('redirect') || '/';
    return htmlResponse(loginPage(redirect, false), 200);
  }

  // ── 登录表单 POST ───────────────────────────────────────
  if (path === LOGIN_PATH && request.method === 'POST') {
    let formData;
    try { formData = await request.formData(); } catch { formData = new FormData(); }

    const inputPassword = formData.get('password') || '';
    const redirect      = formData.get('redirect')  || '/';

    if (inputPassword === password) {
      const payload   = btoa(JSON.stringify({ ts: Date.now() }));
      const signature = await sign(payload, secret);
      const token     = `${payload}.${signature}`;
      return new Response(null, {
        status: 302,
        headers: {
          Location: redirect,
          'Set-Cookie': makeCookie(token, COOKIE_MAX_AGE),
        },
      });
    }

    // 密码错误
    return htmlResponse(loginPage(redirect, true), 401);
  }

  // ── 静态资源放行（避免拦截 favicon 等）─────────────────
  if (path.startsWith('/favicon') || path.startsWith('/__cf')) {
    return next();
  }

  // ── 所有其他请求：验证 Cookie ───────────────────────────
  if (await isAuthenticated(request, secret)) {
    return next();
  }

  // 未登录 → 跳转登录页
  const loginUrl = new URL(LOGIN_PATH, url.origin);
  loginUrl.searchParams.set('redirect', path + url.search);
  return new Response(null, { status: 302, headers: { Location: loginUrl.toString() } });
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ────────────────────────────────────────────────────────────
// 登录页面 HTML
// ────────────────────────────────────────────────────────────

function loginPage(redirect = '/', error = false) {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In — Documentation</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0b0e11;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    }

    /* Ambient glow background */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 60% at 15% 40%, rgba(0,192,135,0.13) 0%, transparent 55%),
        radial-gradient(ellipse 60% 80% at 85% 65%, rgba(0,120,80,0.10) 0%, transparent 55%);
      pointer-events: none;
      z-index: 0;
    }

    .card {
      position: relative;
      z-index: 1;
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(0,192,135,0.18);
      border-radius: 24px;
      padding: 52px 44px 44px;
      width: min(440px, calc(100vw - 32px));
      backdrop-filter: blur(24px);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.04),
        0 24px 48px -8px rgba(0,0,0,0.5),
        0 0 80px rgba(0,192,135,0.05);
      animation: rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(20px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }

    /* Logo row */
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 36px;
    }

    .logo-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #00C087 0%, #007a55 100%);
      display: grid;
      place-items: center;
      font-size: 22px;
      flex-shrink: 0;
      box-shadow: 0 6px 20px rgba(0,192,135,0.35);
    }

    .logo-text {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.4px;
    }

    /* Headings */
    .heading {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.6px;
      margin-bottom: 10px;
    }

    .subheading {
      font-size: 14px;
      color: rgba(255,255,255,0.42);
      line-height: 1.6;
      margin-bottom: 36px;
    }

    /* Error banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 16px;
      background: rgba(255, 72, 72, 0.1);
      border: 1px solid rgba(255, 72, 72, 0.22);
      border-radius: 10px;
      color: #ff8080;
      font-size: 13.5px;
      font-weight: 500;
      margin-bottom: 22px;
      animation: shake 0.35s ease;
    }

    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-5px); }
      60%     { transform: translateX(5px); }
    }

    /* Form fields */
    .field { position: relative; margin-bottom: 22px; }

    label {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 9px;
    }

    .input-wrap { position: relative; }

    input[type="password"],
    input[type="text"] {
      width: 100%;
      padding: 14px 48px 14px 16px;
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
    }

    input[type="password"]:focus,
    input[type="text"]:focus {
      border-color: rgba(0,192,135,0.55);
      background: rgba(0,192,135,0.06);
      box-shadow: 0 0 0 3px rgba(0,192,135,0.14);
    }

    input::placeholder { color: rgba(255,255,255,0.2); }

    .eye-toggle {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: rgba(255,255,255,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .eye-toggle:hover { color: rgba(255,255,255,0.7); }

    /* Submit button */
    .submit-btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #00C087 0%, #009a6e 100%);
      color: #000;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.1px;
      cursor: pointer;
      box-shadow: 0 5px 24px rgba(0,192,135,0.32);
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      margin-top: 4px;
    }

    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 32px rgba(0,192,135,0.42);
    }

    .submit-btn:active {
      transform: translateY(0);
      opacity: 0.9;
    }

    /* Footer */
    .footer {
      text-align: center;
      font-size: 12px;
      color: rgba(255,255,255,0.2);
      margin-top: 28px;
      padding-top: 22px;
      border-top: 1px solid rgba(255,255,255,0.055);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">📚</div>
      <span class="logo-text">Documentation</span>
    </div>

    <p class="heading">Sign In</p>
    <p class="subheading">This documentation is private.<br>Enter the access password to continue.</p>

    ${error ? `
    <div class="error-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Incorrect password — please try again.
    </div>` : ''}

    <form method="POST" action="${LOGIN_PATH}" id="loginForm">
      <input type="hidden" name="redirect" value="${redirect}" />
      <div class="field">
        <label for="password">Access Password</label>
        <div class="input-wrap">
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Enter your password"
            autocomplete="current-password"
            autofocus
            required
          />
          <button type="button" class="eye-toggle" id="eyeToggle" aria-label="Show password">
            <svg id="eyeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>
      <button type="submit" class="submit-btn">Sign In →</button>
    </form>

    <div class="footer">🔒 Protected by Cloudflare Pages Functions</div>
  </div>

  <script>
    (function () {
      var input = document.getElementById('password');
      var btn   = document.getElementById('eyeToggle');
      var icon  = document.getElementById('eyeIcon');
      var EYE_OPEN = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
      var EYE_OFF  = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
      btn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        icon.innerHTML = show ? EYE_OFF : EYE_OPEN;
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        input.focus();
      });
    })();
  </script>
</body>
</html>`;
}
