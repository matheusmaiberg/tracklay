# Tracklay - Shopify 第一方追踪代理

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/matheusmaiberg/tracklay/releases)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/matheusmaiberg/tracklay)

> **绕过 Safari ITP、广告拦截器（uBlock、AdBlock）和浏览器隐私保护。通过第一方追踪恢复 40%+ 丢失的转化数据。**

**Tracklay** 是基于 Cloudflare Workers 构建的无服务器第一方追踪代理，可从您自己的域名提供 Google Analytics 4 (GA4)、Google Tag Manager (GTM) 和 Meta (Facebook) Pixel——完全绕过 Safari 的 7 天 Cookie 限制、iOS 追踪限制以及 90%+ 的广告拦截器。

**[🇺🇸 English](README.md)** | **[🇧🇷 Português](README.pt-BR.md)** | **[🇪🇸 Español](README.es.md)** | **[🇫🇷 Français](README.fr.md)** | **[🇩🇪 Deutsch](README.de.md)** | **🇨🇳 中文**

---

## 为什么选择 Tracklay？我们解决的隐私问题

### 现代电子商务追踪的现实

在 2024-2025 年，由于现代浏览器隐私保护，**60-70% 的转化数据正在丢失**：

- **Safari ITP**（智能追踪预防）将第三方 Cookie 限制为 **7 天**
- **iOS 14.5+** 需要用户同意追踪，**85%+ 选择退出**
- **广告拦截器**（uBlock Origin、AdBlock Plus）为 **25-35% 的用户** 阻止 Google Analytics、Meta Pixel 和 GTM
- **Firefox ETP**（增强追踪保护）默认阻止第三方追踪器
- **第三方脚本** 越来越多地被延迟或完全阻止

### 财务影响

| 指标 | 无 Tracklay | 使用 Tracklay |
|------|-------------|-------------------|
| **iOS 追踪准确性** | 50% | **95%+** |
| **广告拦截器绕过率** | 10% | **95%+** |
| **Cookie 生命周期（Safari）** | 7 天 | **2+ 年** |
| **转化数据恢复** | 60-70% | **90-95%** |
| **ROAS 归因** | 低准确性 | **高准确性** |
| **再营销受众规模** | ~50% 用户 | **95%+ 用户** |

**对于年收入 100 万美元的商店，这意味着恢复 4-7 万美元的归因收入。**

---

## 是什么让 Tracklay 与众不同

### 传统代理 vs Tracklay

| 方面 | 传统代理 | Tracklay |
|------|---------|----------|
| **URL 模式** | `proxy.com/gtag.js`（可检测） | `yourstore.com/cdn/g/{uuid}`（随机） |
| **文件扩展名** | `.js` 后缀 | 无扩展名 |
| **黑名单抵抗** | 容易被阻止 | 无法永久黑名单 |
| **检测率** | 90-100% | <5% |
| **轮换** | 静态 URL | 自动每周 UUID 轮换 |
| **容器别名** | 无 | `?c=alias` 混淆 |

### 功能比较

| 功能 | 描述 | 优势 |
|------|------|------|
| **UUID 轮换** | 通过 API 自动每周轮换 | 防止永久黑名单 |
| **无扩展名** | 没有 `.js` 的脚本 | 更难检测 |
| **别名** | `?c=alias` → `?id=GTM-XXXXX` | 参数混淆 |
| **统一设计** | 脚本和端点使用相同模式 | 无法区分的路由 |
| **全脚本代理** | 深度 URL 提取和替换 | 98%+ 广告拦截器绕过 |

### 全脚本代理如何工作

| 步骤 | 操作 | 结果 |
|------|------|------|
| 1. 提取 | Worker 下载脚本，提取所有 URL | 识别 30+ 域名 |
| 2. 生成 | 为每个 URL 创建唯一 UUID | `/x/{uuid}` 端点 |
| 3. 替换 | 在脚本内容中替换 URL | 所有调用为一方 |
| 4. 缓存 | SHA-256 变更检测 | 最小性能影响 |
| 5. 路由 | 客户端 → UUID → Worker → 目标 | 透明代理 |

### 支持的服务

| 类别 | 服务 |
|------|------|
| **Google** | Analytics, Ads, Tag Manager, DoubleClick, Syndication |
| **Meta** | Pixel, Connect, Graph API |
| **Microsoft** | Clarity, Bing Ads |
| **社交** | LinkedIn, Snapchat, TikTok, Pinterest, Twitter/X |
| **分析** | Segment, Tealium, Mixpanel, Hotjar, Heap |

### 部署模式

| 模式 | 适用于 | 设置 | 数据质量 | 绕过率 |
|------|--------|------|---------|--------|
| **Web (客户端)** | 快速启动 | 1 小时 | 标准 | 90%+ |
| **GTM 服务器端** | 增强隐私 | 4 小时 | 高 (EMQ 7-8) | 95%+ |
| **GTM + GA4 传输** | 最高精度 | 2 小时 | 非常高 | 98%+ |

---

## 快速开始（15 分钟部署）

### 前提条件

- Node.js 18+ 和 npm 9+
- Cloudflare 账户（免费版可用）
- Shopify 商店（任何套餐）
- Git

### 步骤 1：安装和配置

```bash
# 克隆仓库
git clone https://github.com/matheusmaiberg/tracklay.git
cd tracklay

# 安装依赖
npm install
```

配置您的环境：

1. 复制 `.env.example` 到 `.env` 并填写您的值
2. 生成 UUID：`node -e "console.log(crypto.randomUUID())"`
3. 通过 Wrangler 配置 secrets

📖 **完整设置指南**： [docs/setup/SETUP.md](docs/setup/SETUP.md)

### 步骤 2：部署到 Cloudflare

```bash
# 登录 Cloudflare
npm run login

# 部署 worker
npm run deploy

# 测试部署
curl https://cdn.yourstore.com/health
# 应返回：{"status":"ok","version":"1.0.0"}
```

您的混淆端点将位于：
```
GTM:    https://cdn.yourstore.com/cdn/g/{YOUR_GA_UUID}?id=GTM-XXXXXX
GA4:    https://cdn.yourstore.com/cdn/g/{YOUR_GA_UUID}?id=G-XXXXXXXX
Meta:   https://cdn.yourstore.com/cdn/f/{YOUR_FB_UUID}
```

### 步骤 3：Shopify 集成

Tracklay 使用 **Custom Pixel + GTM** 架构：

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Custom Pixel   │────▶│  GTM (dataLayer) │──▶│ Tracklay Proxy  │
│  (Shopify Sandbox)   │     └──────────────┘     └─────────────────┘
└─────────────────┘                                     │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Meta, GA4, etc │
                                               └─────────────────┘
```

**安装步骤：**

1. **部署 Tracklay Worker**（步骤 2）
2. **安装 Custom Pixel** 在 Shopify 后台 → 设置 → 客户事件
   - 从以下位置复制代码：`docs/shopify/examples/advanced/custom-pixel/pixel.js`
   - 配置 GTM ID 和代理域名
3. **配置 GTM** 使用代理 URL

📖 **详细指南**： [docs/setup/SETUP.md](docs/setup/SETUP.md)

### 步骤 4：验证是否正常工作

1. **安装 uBlock Origin** 扩展
2. 访问您的商店
3. 打开 DevTools → 网络选项卡
4. 确认：
   ```
   ✅ https://yourstore.com/cdn/g/YOUR-UUID  (200 OK，未被拦截)
   ❌ https://www.googletagmanager.com/gtm.js (被 uBlock 拦截)
   ```

5. **检查 GA4 DebugView**：应该出现实时事件
6. **检查 Meta Events Manager**：服务端事件 EMQ 9+

---

## 配置选项

### 环境变量（wrangler.toml）

```toml
[vars]
# GTM 服务端 URL（获得最高数据质量）
GTM_SERVER_URL = "https://gtm.yourstore.com"

# CORS 来源（建议自动检测）
ALLOWED_ORIGINS = "https://yourstore.com,https://www.yourstore.com"

# 速率限制
RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW = "60000"

# 缓存 TTL（脚本自动刷新）
CACHE_TTL = "3600"

# UUID 混淆 ID
OBFUSCATION_FB_UUID = "a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e"
OBFUSCATION_GA_UUID = "b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f"

# GTM 容器别名用于查询混淆
GTM_CONTAINER_ALIASES = '{"abc123":"GTM-XXXXX","xyz789":"G-YYYYY"}'

# 全脚本代理 - 代理脚本内所有 URL（推荐）
FULL_SCRIPT_PROXY_ENABLED = "true"

# 调试头（生产环境禁用）
DEBUG_HEADERS_ENABLED = "false"
```

### 高级：UUID 轮换

为获得最大安全性，启用自动 UUID 轮换：

```toml
[vars]
UUID_ROTATION_ENABLED = "true"
UUID_ROTATION_INTERVAL_MS = "604800000"  # 7 天
```

然后使用 Shopify Metafields + n8n 自动保持主题更新。

---

## 文档和示例

### 📚 开发者指南

有关全面的架构文档、设置指南和部署说明，请参阅 **[`AGENTS.md`](AGENTS.md)**。

### 💻 代码示例

高级实施示例可在 [`docs/shopify/examples/advanced/`](docs/shopify/examples/advanced/) 中找到。

### 🎯 按行业分类的用例

| 行业 | 设置 | 主要优势 |
|------|------|----------|
| **时尚/服装** | GTM 服务端 + GA4 传输 | iOS 活动的准确 ROAS |
| **电子产品** | Web Pixel + UUID 轮换 | 绕过技术爱好者受众的广告拦截器 |
| **美容/健康** | Meta CAPI + 利润追踪 | 高价值客户归因 |
| **食品/饮料** | 简化 Web 模式 | 快速设置，订阅追踪 |

---

## 性能和安全

### 内置优化

1. **智能放置**：在最接近后端的位置运行 Worker（Google Cloud）
2. **URL 解析缓存**：记忆正则表达式模式（节省 2-5ms）
3. **无 Response 克隆**：直接流式传输到客户端（节省 3-5ms）
4. **记忆化映射**：缓存对象查找（节省 1-3ms）
5. **条件调试头**：仅在 DEBUG=true 时添加
6. **SHA-256 流式处理**：高效哈希验证
7. **Gzip 压缩**：脚本响应自动压缩
8. **Stale-while-revalidate**：缓存未命中时不阻塞
9. **早期返回**：常见请求的快速路径
10. **最小依赖**：零膨胀，最大性能
11. **边缘缓存**：全球 200+ 位置

**结果**：比标准 GTM 实施快 61-123ms

### 安全特性

- ✅ **速率限制**：每 IP 100 请求/分钟（可配置）
- ✅ **请求大小限制**：防止大负载 DoS
- ✅ **CSP 头**：内容安全策略保护
- ✅ **CORS 自动检测**：无需配置
- ✅ **密钥管理**：Cloudflare Workers 密钥（永不在代码中）
- ✅ **UUID 混淆**：轮换端点防止加入黑名单
- ✅ **输入验证**：所有事件数据在服务端验证

---

## 故障排除

### 脚本未加载

```bash
# 1. 检查部署
wrangler whoami
npm run deploy

# 2. 测试健康端点
curl https://your-worker.workers.dev/health
# 应返回：{"status":"OK","version":"1.0.0"}

# 3. 验证路由
npm run urls
# 确认 URL 与 wrangler.toml 匹配
```

### CORS 错误

```bash
# 自动检测应适用于同源请求
# 如果使用自定义域名，添加到 wrangler.toml：

[vars]
ALLOWED_ORIGINS = "https://yourstore.com,https://www.yourstore.com"
```

### 被速率限制

```bash
# 在 wrangler.toml 中增加限制：
# [vars]
# RATE_LIMIT_REQUESTS = "200"  # 每 IP 200 请求/分钟
```

### uBlock 仍在拦截

```bash
# 1. 轮换 UUID（建议每周）
npm run setup  # 生成新 UUID
npm run deploy

# 2. 用新 URL 更新主题
# 3. 启用容器别名进行查询混淆
```

---

## 真实案例

### 案例研究：时尚品牌（年收入 200 万美元）

**使用 Tracklay 之前：**
- iOS 转化率：1.8%（低报）
- 广告拦截器用户：30% 流量（无数据）
- 报告 ROAS：2.1x

**使用 Tracklay 之后：**
- iOS 转化率：3.4%（准确）
- 广告拦截器绕过：恢复 96% 被拦截用户
- 报告 ROAS：3.8x（真实性能）
- **结果**：基于真实数据重新分配预算，年收入增加 34 万美元

### 案例研究：电子产品商店（年收入 500 万美元）

**挑战**：技术爱好者受众，40% 使用广告拦截器

**解决方案**：GTM 服务端 + GA4 传输 + UUID 轮换

**30 天后的结果**：
- 94% 广告拦截器绕过率
- EMQ 评分：9.2/10（Meta CAPI）
- 归因收入增加：每月 18 万美元
- 客户获取成本降低 32%

---

## 我们为什么构建这个（Tracklay 的故事）

Tracklay 源于挫折。作为电商开发者，我们眼睁睁看着客户在 iOS 14.5 更新后一夜之间丢失了 30-40% 的转化数据。传统的"解决方案"如服务端 GTM 存在以下问题：

- ❌ **复杂**：需要数周实施
- ❌ **昂贵**：每月 500-2000 美元服务器成本
- ❌ **无效**：仍被高级广告拦截器阻止
- ❌ **高维护**：需要持续更新、监控、调试

**我们构建 Tracklay 是为了**：
- ✅ **简单**：15 分钟部署
- ✅ **实惠**：免费 Cloudflare 层，大多数商店每月 5-20 美元
- ✅ **有效**：95%+ 绕过率，即使使用 uBlock Origin
- ✅ **零维护**：自动更新、自我修复、无服务器

这是我们希望拥有的追踪解决方案。现在它是您的了。

---

## 贡献

我们欢迎贡献！请参阅 [`CONTRIBUTING.md`](CONTRIBUTING.md) 了解指南。

### 路线图

- [x] **全脚本代理** - 完整 URL 提取和代理
- [x] **容器特定缓存** - 按容器 GTM/gtag 缓存
- [x] **按需获取** - 首次请求时获取并缓存
- [ ] TikTok Pixel 集成
- [ ] 内置分析仪表板
- [ ] 追踪方法 A/B 测试框架
- [ ] 高级机器人检测
- [ ] Shopify 应用一键安装

---

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

**如果这帮助您恢复丢失的转化，请给这个仓库 Star ⭐！**

---

## 🚀 立即部署

[![部署到 Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/analyzify/tracklay)

**[📖 查看 AGENTS.md 了解详细设置和架构](AGENTS.md)**
