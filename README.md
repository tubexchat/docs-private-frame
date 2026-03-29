# docs-private-frame

[![License: MIT](https://img.shields.io/badge/License-MIT-00C087.svg)](./LICENSE)

基于 [Docusaurus 3](https://docusaurus.io/) 构建的**私有化文档框架**，部署于 Cloudflare Pages，通过 Pages Functions 实现密码保护。

## ✨ 特性

- 📝 **Markdown / MDX** — 使用 Markdown 和 React 组件编写文档
- 🔒 **私有化访问** — Cloudflare Pages Functions 拦截所有请求，未登录自动跳转登录页
- 🔑 **Cookie 会话** — HMAC-SHA256 签名，HttpOnly + Secure，7 天有效期
- 🔍 **本地搜索** — 集成 `@easyops-cn/docusaurus-search-local`，无需第三方服务
- 🌗 **深色模式** — 原生浅色/深色主题切换
- ☁️ **一键部署** — `deploy-cf.sh` 完成构建 + 上传全流程

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18.0
- [npm](https://www.npmjs.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) （部署时需要）

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（不含登录保护）
npm start
```

> 本地开发时 (`npm start`) **不会触发**登录中间件，可直接访问 `http://localhost:3000`。
> 如需在本地测试完整的登录流程，使用：
>
> ```bash
> npm run cf:preview   # 构建 + wrangler pages dev
> ```

---

## 📂 项目结构

```
docs-private-frame/
├── docs/                    # Markdown 文档（侧边栏自动生成）
├── src/
│   ├── css/custom.css       # 全局样式（品牌色 #00C087）
│   └── theme/               # Docusaurus 主题覆盖
├── static/                  # 静态资源（图片、favicon）
├── functions/
│   └── _middleware.js       # ⭐ Cloudflare Pages 认证中间件
├── docusaurus.config.js     # Docusaurus 核心配置
├── sidebars.js              # 侧边栏结构
├── wrangler.toml            # Cloudflare Pages 配置
└── deploy-cf.sh             # 一键部署脚本
```

---

## 🔒 登录认证

认证逻辑完全由 `functions/_middleware.js` 实现，**无需额外服务**。

| 路由 | 行为 |
|------|------|
| `GET /__login` | 显示登录页面 |
| `POST /__login` | 验证密码，成功后写入 Cookie |
| `GET /__login?logout=1` | 清除 Cookie，退出登录 |
| 其他所有路径 | 验证 Cookie，未通过则跳转 `/__login` |

### 环境变量

| 变量 | 说明 |
|------|------|
| `AUTH_PASSWORD` | 访问密码 |
| `AUTH_SECRET` | Cookie 签名密钥（建议 48+ 字节随机字符串） |

> ⚠️ **不要把真实密码写在代码里！** 通过 Cloudflare Secret 注入：
>
> ```bash
> wrangler pages secret put AUTH_PASSWORD --project-name=docs-private-frame
> wrangler pages secret put AUTH_SECRET   --project-name=docs-private-frame
>
> # 生成强随机 AUTH_SECRET：
> openssl rand -base64 48
> ```

---

## ☁️ 部署到 Cloudflare Pages

### 方式一：一键脚本

```bash
chmod +x deploy-cf.sh
./deploy-cf.sh
```

### 方式二：手动

```bash
# 1. 构建静态文件
npm run build

# 2. 部署到 Cloudflare Pages（含 Functions）
wrangler pages deploy build --project-name=docs-private-frame
```

### 首次部署后

务必通过 Secret 设置生产密码（见上方环境变量说明）。  
在 Cloudflare Dashboard → Pages → `docs-private-frame` → Settings → Environment variables 中也可以可视化设置。

---

## 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `npm start` | 本地开发（无登录拦截） |
| `npm run build` | 构建生产静态文件 |
| `npm run cf:preview` | 本地完整预览（含 Pages Functions） |
| `npm run serve` | 本地预览构建产物 |
| `./deploy-cf.sh` | 构建并部署到 Cloudflare Pages |

---

## 📄 License

[MIT](./LICENSE)

