# 部署指南 — AI Agent 课程网站

本项目是一个带付费订阅的 AI Agent 教学网站，技术栈：Next.js 16 + Tailwind CSS v4 + Prisma (SQLite) + NextAuth + Stripe。

---

## 快速部署（本地 + Cloudflare Tunnel 公网访问）

### 1. 克隆项目

```bash
git clone https://github.com/when2buy/agent-design-course.git
cd agent-design-course
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.production
```

编辑 `.env.production`，填入以下变量（详见下文各节）：

```env
DATABASE_URL="file:/absolute/path/to/prisma/dev.db"
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="https://your-tunnel-url.trycloudflare.com"
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."
```

### 3. 初始化数据库

```bash
npx prisma db push
```

### 4. 构建 & 启动

```bash
npm run build
npm start -- -p 4000
```

### 5. 配置 Cloudflare Tunnel（获得公网 HTTPS 地址）

```bash
# 安装 cloudflared
curl -L -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared

# 启动 tunnel（会打印随机 HTTPS URL）
./cloudflared tunnel --url http://localhost:4000
```

复制打印出的 `https://xxxx.trycloudflare.com`，填回 `.env.production` 的 `NEXTAUTH_URL`，然后**重新 build + start**。

> ⚠️ Quick Tunnel URL 每次重启会变。固定域名请用 Cloudflare Zero Trust 配置持久 Tunnel。

---

## Stripe 配置详解

### Step 1：创建 Stripe 账号

前往 [dashboard.stripe.com](https://dashboard.stripe.com) 注册并完成 KYC 认证。

### Step 2：获取 API Keys

Dashboard → Developers → API Keys

| 变量 | 值 |
|------|----|
| `STRIPE_SECRET_KEY` | Secret key（`sk_live_...`） |
| `STRIPE_PUBLISHABLE_KEY` | Publishable key（`pk_live_...`） |

> 开发阶段建议先用 **Test keys**（`sk_test_...` / `pk_test_...`），不产生真实扣款。

### Step 3：创建订阅产品

Dashboard → Product Catalog → Add Product

- Name: `AI Agent 设计课 Pro`（可自定义）
- Pricing: Recurring，¥299 / year（或按需调整）
- 保存后复制 **Price ID**（格式：`price_xxxxxxxx`）→ 填入 `STRIPE_PRICE_ID`

### Step 4：配置 Webhook

Dashboard → Developers → Webhooks → Add endpoint

- **Endpoint URL**：`https://your-tunnel-url/api/stripe/webhook`
- **监听事件**（必选这 5 个）：
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- 保存后复制 **Signing secret**（`whsec_...`）→ 填入 `STRIPE_WEBHOOK_SECRET`

> ⚠️ 每次 Tunnel URL 变化都要更新 Webhook endpoint URL（Dashboard → Webhooks → 编辑）。

### Step 5：本地测试 Webhook（可选）

安装 Stripe CLI 后：

```bash
stripe login
stripe listen --forward-to http://localhost:4000/api/stripe/webhook
# 打印出本地 webhook secret，填入 .env
stripe trigger checkout.session.completed
```

---

## 环境变量完整说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | SQLite 文件路径，建议用绝对路径 |
| `NEXTAUTH_SECRET` | ✅ | 随机字符串：`openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | 公网可访问的 HTTPS URL |
| `STRIPE_SECRET_KEY` | ✅ | Stripe 后端密钥（不要提交到 Git！） |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe 前端公钥 |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe Webhook 签名密钥 |
| `STRIPE_PRICE_ID` | ✅ | 订阅产品的 Price ID |

---

## 内容管理

所有课程内容在 `content/` 目录下，以 Markdown 文件形式存储。添加新文章无需改代码。

详见 [CONTENT-GUIDE.md](./CONTENT-GUIDE.md)。

---

## 项目结构

```
agent-design-course/
├── content/           # 课程内容（Markdown）
│   ├── fundamentals/
│   ├── tools/
│   ├── memory/
│   ├── planning/
│   ├── multi-agent/
│   ├── practice/
│   └── production/
├── src/
│   ├── app/           # Next.js App Router
│   │   ├── api/       # API 路由（auth、stripe）
│   │   ├── learn/     # 课程页面
│   │   ├── dashboard/ # 用户仪表板
│   │   └── pricing/   # 订阅页面
│   ├── components/    # React 组件
│   └── lib/           # 工具函数（content、auth、db、stripe）
├── prisma/
│   └── schema.prisma  # 数据库 schema
├── .env.example       # 环境变量模板（安全，可提交）
└── .env.production    # 实际配置（不提交到 Git！）
```

---

## 常见问题

**Q: 支付成功但用户没升级为 Pro？**
A: 检查 Webhook 是否正确配置，Stripe Dashboard → Webhooks → 查看事件日志。

**Q: 登录后跳转失败？**
A: 确认 `NEXTAUTH_URL` 与实际访问地址完全一致（包含 https://）。

**Q: 本地开发时如何绕过支付？**
A: 访问 `/api/subscribe`（POST），可以直接将当前用户升级为 Pro（仅用于测试，生产环境应删除此路由）。

**Q: 数据库在哪里？**
A: SQLite 文件，默认路径 `prisma/dev.db`。迁移到生产时建议换成 PostgreSQL（改 `DATABASE_URL` 和 `schema.prisma` 中的 provider）。
