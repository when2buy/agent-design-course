# Stripe 支付集成 — 交接文档

> 状态：**全部就绪 ✅ — Stripe 已配置，服务已上线**

---

## 当前配置（已填入 .env.production）

| 变量 | 值 |
|------|----|
| `STRIPE_SECRET_KEY` | `sk_live_51NKYsPEUK...` (aitist.ai 账号) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_51NKYsPEUK...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_Y5BnkazRuaj6...` (course 专属 endpoint) |
| `STRIPE_PRICE_ID` | `price_1T5DiMEUKKyCFBFhGlUwZUP0` |

产品：`prod_U3KNLtAsZ53eFi` — "AI Agent 设计课 Pro"  
价格：¥299/年（CNY，recurring yearly）  
Webhook Endpoint ID：`we_1T5DiZEUKKyCFBFhdOJDeukK`

> ⚠️ Tunnel URL 会随重启变化，需同步更新 Stripe webhook endpoint URL

---

## Steve 需要做的（5步）

### 第 1 步：创建 Stripe 账号并开通中国收款

登录 [Stripe Dashboard](https://dashboard.stripe.com) → 确保账号已完成 KYC 实名认证

### 第 2 步：创建订阅产品

1. Dashboard → Products → Add Product
2. 填写：
   - Name: `AI Agent 设计课 Pro`
   - Price: `¥ 299` / year（Currency: CNY，Billing: Recurring，Interval: Yearly）
3. 保存后复制 `Price ID`（格式：`price_xxxxxxxxxxxxxxxx`）

### 第 3 步：获取 API Keys

Dashboard → Developers → API Keys

| Key | 在哪找 |
|-----|------|
| `STRIPE_SECRET_KEY` | Secret key（`sk_live_...`） |
| `STRIPE_PUBLISHABLE_KEY` | Publishable key（`pk_live_...`） |

### 第 4 步：配置 Webhook

1. Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL：`https://<你的域名>/api/stripe/webhook`
3. 监听事件（勾选这5个）：
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. 保存后复制 `Signing secret`（`whsec_...`）

### 第 5 步：把 4 个 Key 发给 CTO Bot

把以下内容发给 Bot，它会自动填入并重启服务：

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

---

## 代码已实现的功能

### API 路由

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/stripe/checkout` | POST | 创建 Checkout Session，跳转 Stripe 托管支付页 |
| `/api/stripe/webhook` | POST | 处理 Stripe 回调，自动更新用户订阅状态 |
| `/api/stripe/portal` | POST | 跳转 Stripe 订阅管理页（取消/改套餐） |

### 支付流程

```
用户点击「升级 Pro」
  → POST /api/stripe/checkout
  → 跳转 Stripe Checkout（Stripe 托管，PCI 合规）
  → 支付成功
  → Stripe webhook → POST /api/stripe/webhook
  → 验证签名 → DB: subscriptionStatus = 'pro'
  → 跳转 /success 页面
```

### Webhook 处理事件

| 事件 | 处理 |
|------|------|
| `checkout.session.completed` | 激活 Pro，记录 subscriptionId |
| `invoice.paid` | 续费时延长到期时间 |
| `invoice.payment_failed` | 记录日志（不降级，给用户宽限） |
| `customer.subscription.updated` | 同步状态（含降级）|
| `customer.subscription.deleted` | 降级为 free |

### DB 字段（User 表）

```prisma
stripeCustomerId     String?  // Stripe Customer ID
stripeSubscriptionId String?  // 当前订阅 ID
stripePriceId        String?  // 当前 Price ID
subscriptionStatus   String   @default("free")  // "free" | "pro"
subscriptionEndsAt   DateTime? // 到期时间
```

---

## 测试（填入 Key 后）

```bash
# 测试 checkout（需要登录态）
curl -X POST http://localhost:4000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=..."

# 使用 Stripe CLI 本地测试 webhook
stripe listen --forward-to http://localhost:4000/api/stripe/webhook
stripe trigger checkout.session.completed
```

---

## 文件位置

```
src/
├── lib/stripe.ts                      # Stripe 初始化 + PLANS 配置
├── app/api/stripe/
│   ├── checkout/route.ts              # 创建 Checkout Session
│   ├── webhook/route.ts               # 处理 Stripe 回调
│   └── portal/route.ts               # 订阅管理门户
└── app/
    ├── pricing/page.tsx               # 价格页（含升级按钮）
    └── success/page.tsx               # 支付成功页
```

---

## 注意事项

- **Webhook 签名验证**已实现，不可跳过
- Stripe Keys **不要提交到 Git**（已在 `.gitignore` 里排除 `.env.production`）
- 当前 Demo 环境用 `/api/subscribe` 可跳过支付直接升级 Pro（测试用）
- 生产环境记得禁用或删除 `/api/subscribe` 路由

---

*由 CTO Bot 生成 — 2026-02-26*
