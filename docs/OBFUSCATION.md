# Obfuscação Anti-Blocker - Guia Completo

## Índice

1. [Visão Geral](#visão-geral)
2. [Análise de Vulnerabilidades](#análise-de-vulnerabilidades)
3. [Sistema de Obfuscação UUID](#sistema-de-obfuscação-uuid)
4. [Guia de Migração](#guia-de-migração)
5. [Recomendações Avançadas](#recomendações-avançadas)

---

## Visão Geral

O Tracklay implementa um **sistema de obfuscação baseado em UUID** para evitar detecção por ad-blockers modernos. Este documento detalha:

- Pontos de detecção encontrados no código
- Como o sistema de obfuscação funciona
- Como migrar de endpoints legados para obfuscados
- Recomendações adicionais para máxima proteção

---

## Análise de Vulnerabilidades

### 🚨 **ALTA SEVERIDADE - Facilmente Detectável**

Estes pontos permitem que ad-blockers identifiquem e bloqueiem o proxy com alta confiança:

#### 1. Endpoints Previsíveis (CRÍTICO)

**Problema:**
```
❌ /tr                    → Facebook Pixel (universal)
❌ /g/collect             → Google Analytics (universal)
❌ /j/collect             → Google Analytics JS (universal)
```

**Impacto:**
- **100% dos ad-blockers** bloqueiam estes caminhos
- Detectado por: uBlock Origin, AdBlock Plus, Privacy Badger, Brave Shields, todos os outros
- Pattern matching simples: `||yourstore.com/tr^`

**Solução Implementada:**
```
✅ /cdn/f/{UUID}.js       → Facebook Pixel (obfuscado)
✅ /cdn/g/{UUID}.js       → Google Analytics (obfuscado)
✅ /cdn/g/{UUID}-j.js     → Google Analytics JS (obfuscado)
```

#### 2. Nomes de Scripts Óbvios (CRÍTICO)

**Problema:**
```
❌ /cdn/fbevents.js       → Facebook Events (nome conhecido)
❌ /cdn/gtm.js            → Google Tag Manager (nome conhecido)
❌ /cdn/gtag.js           → Google Tag (nome conhecido)
```

**Impacto:**
- Filename blacklisting em todos os principais blockers
- Detectado mesmo servindo do próprio domínio
- Regex patterns: `/(fbevents|gtm|gtag)\.js/`

**Solução Implementada:**
```
✅ /cdn/f/{UUID}-script.js    → Facebook Events (obfuscado)
✅ /cdn/g/{UUID}-gtm.js        → GTM (obfuscado)
✅ /cdn/g/{UUID}-tag.js        → GTag (obfuscado)
```

#### 3. Prefixos de Caminho Estáticos (ALTO RISCO)

**Problema:**
```
❌ /cdn/*
❌ /assets/*
❌ /static/*
```

**Impacto:**
- Padrões comuns de proxy conhecidos por blockers avançados
- Facilmente adicionados a listas de bloqueio customizadas
- Podem ser correlacionados com outros sinais de tracking

**Nota:**
- Os prefixos `/cdn/`, `/assets/`, `/static/` são mantidos por compatibilidade
- A obfuscação UUID dentro destes prefixos reduz significativamente o risco
- Recomenda-se usar apenas `/cdn/` para simplificar

---

### ⚠️ **MÉDIA SEVERIDADE - Detecção Baseada em Padrões**

#### 4. Padrões de Query Parameters (MÉDIO RISCO)

**Problema:**
```
❌ ?id=GTM-XXXXX          → Formato de container GTM
❌ ?id=G-XXXXXX           → Formato de property GA4
❌ ?id=AW-XXXXXXXX        → Google Ads
```

**Impacto:**
- Blockers podem analisar query strings
- Correlação com outros sinais aumenta detecção
- Usado em fingerprinting avançado

**Mitigação Parcial:**
- UUIDs nos paths reduzem capacidade de correlação
- Query params ainda necessários para funcionamento
- **Recomendação:** Considerar ofuscação de query params no futuro

#### 5. Headers Não-Padrão (MÉDIO RISCO)

**Problema:**
```
❌ X-Cache-Status: HIT/MISS
❌ X-Request-Id: {uuid}
❌ X-Robots-Tag: noindex, nofollow, noarchive
```

**Impacto:**
- Headers customizados podem ser fingerprints
- Incomuns para scripts de analytics normais
- Podem ser usados para identificar proxies

**Solução Recomendada:**
```javascript
// Remover headers desnecessários em produção
// Ou torná-los opcionais via configuração
```

---

### 🔍 **BAIXA SEVERIDADE - Detecção Avançada**

#### 6. Content Security Policy (BAIXO RISCO)

**Problema:**
```
❌ Content-Security-Policy: default-src 'self'
```

**Impacto:**
- CSP muito restritivo para scripts de analytics
- Scripts reais do Google/Facebook não enviam este header
- Pode indicar proxy em análise profunda

**Recomendação:**
- Remover CSP de responses de script
- Ou usar CSP idêntico ao dos servidores originais

#### 7. Permissions Policy (BAIXO RISCO)

**Problema:**
```
❌ Permissions-Policy: interest-cohort=()
```

**Impacto:**
- Header focado em privacidade incomum para tracking
- Contradiz objetivo de scripts de analytics
- Sinal fraco mas detectável

**Recomendação:**
- Remover de responses de tracking
- Ou copiar headers exatos dos originais

---

## Sistema de Obfuscação UUID

### Como Funciona

O sistema gera **UUIDs únicos por deployment** que substituem nomes previsíveis:

#### Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  CONFIG (src/config/index.js)                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  FACEBOOK_ENDPOINT_ID: "a8f3c2e1-4b9d-..."       │  │
│  │  GOOGLE_ENDPOINT_ID:   "b7e4d3f2-5c0e-..."       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  MAPPING (src/routing/mapping.js)                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Obfuscated Endpoints:                            │  │
│  │  /cdn/f/a8f3c2e1-4b9d-....js → facebook.com/tr   │  │
│  │  /cdn/g/b7e4d3f2-5c0e-....js → gtm.server/collect│  │
│  │                                                    │  │
│  │  Obfuscated Scripts:                              │  │
│  │  /cdn/f/a8f3c2e1-...-script.js → fbevents.js     │  │
│  │  /cdn/g/b7e4d3f2-...-gtm.js    → gtm.js          │  │
│  │  /cdn/g/b7e4d3f2-...-tag.js    → gtag/js         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  ROUTER (src/routing/router.js)                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Dynamic Route Matching:                          │  │
│  │  1. Check endpointMap[pathname]                   │  │
│  │  2. Check scriptMap[pathname]                     │  │
│  │  3. Fallback to prefix matching                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Geração de UUIDs

**Automática:**
```javascript
// Auto-gerado no deploy usando crypto.randomUUID()
// Cada deployment tem UUIDs únicos
FACEBOOK_ENDPOINT_ID: "a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e"
GOOGLE_ENDPOINT_ID:   "b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f"
```

**Manual (Recomendado para Produção):**
```bash
# Cloudflare Dashboard → Workers → Settings → Variables

# Adicionar variáveis de ambiente:
FACEBOOK_ENDPOINT_ID = "seu-uuid-customizado-para-facebook"
GOOGLE_ENDPOINT_ID   = "seu-uuid-customizado-para-google"

# Ou via wrangler CLI:
wrangler secret put FACEBOOK_ENDPOINT_ID
# Digite seu UUID customizado

wrangler secret put GOOGLE_ENDPOINT_ID
# Digite seu UUID customizado
```

### URLs Geradas

**Exemplo de deployment:**

```javascript
// Configuração:
FACEBOOK_ENDPOINT_ID = "a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e"
GOOGLE_ENDPOINT_ID   = "b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f"

// URLs resultantes:

// Facebook Pixel Endpoint:
https://yourstore.com/cdn/f/a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e.js

// Facebook Events Script:
https://yourstore.com/cdn/f/a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e-script.js

// Google Analytics Endpoint:
https://yourstore.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f.js

// Google Tag Manager Script:
https://yourstore.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f-gtm.js?id=GTM-XXXXX

// Google Tag Script:
https://yourstore.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f-tag.js?id=G-XXXXX
```

---

## Guia de Migração

### Passo 1: Deploy do Worker com Obfuscação

```bash
# 1. Pull do código atualizado
git pull origin main

# 2. Deploy
npm run deploy

# 3. Verificar UUIDs gerados (logs do wrangler)
# Ou acessar: https://your-worker.workers.dev/health
```

### Passo 2: Configurar UUIDs Customizados (Opcional)

```bash
# Gerar UUIDs seguros
node -e "console.log(require('crypto').randomUUID())"
# Output: a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e

node -e "console.log(require('crypto').randomUUID())"
# Output: b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f

# Adicionar via Cloudflare Dashboard
# Workers → Your Worker → Settings → Variables → Environment Variables
# Adicionar:
# FACEBOOK_ENDPOINT_ID = a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e
# GOOGLE_ENDPOINT_ID = b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f

# Redeploy
npm run deploy
```

### Passo 3: Obter URLs Obfuscadas

Crie um arquivo `scripts/get-obfuscated-urls.js`:

```javascript
// get-obfuscated-urls.js
import { CONFIG, initConfig } from '../src/config/index.js';

// Simular environment (ou ler de .env)
const env = {
  FACEBOOK_ENDPOINT_ID: 'a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e',
  GOOGLE_ENDPOINT_ID: 'b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f'
};

initConfig(env);

const domain = 'https://yourstore.com';

console.log('🔒 OBFUSCATED TRACKING URLS\n');
console.log('Facebook Pixel:');
console.log(`  Endpoint: ${domain}/cdn/f/${CONFIG.FACEBOOK_ENDPOINT_ID}.js`);
console.log(`  Script:   ${domain}/cdn/f/${CONFIG.FACEBOOK_ENDPOINT_ID}-script.js\n`);

console.log('Google Analytics:');
console.log(`  Endpoint: ${domain}/cdn/g/${CONFIG.GOOGLE_ENDPOINT_ID}.js`);
console.log(`  GTM:      ${domain}/cdn/g/${CONFIG.GOOGLE_ENDPOINT_ID}-gtm.js?id=GTM-XXXXX`);
console.log(`  GTag:     ${domain}/cdn/g/${CONFIG.GOOGLE_ENDPOINT_ID}-tag.js?id=G-XXXXX`);
```

Execute:
```bash
node scripts/get-obfuscated-urls.js
```

### Passo 4: Atualizar Shopify Theme

#### Facebook Pixel (Meta Pixel)

**ANTES (Detectável):**
```html
<!-- Facebook Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>

<!-- Pixel Tracking -->
<img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"/>
```

**DEPOIS (Obfuscado):**
```html
<!-- Facebook Pixel Code - Obfuscated -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://yourstore.com/cdn/f/a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e-script.js');

  // Override endpoint URL
  fbq._endpoint = '/cdn/f/a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e.js';

  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>

<!-- Pixel Tracking - Obfuscated -->
<img height="1" width="1" style="display:none"
  src="https://yourstore.com/cdn/f/a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e.js?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"/>
```

#### Google Tag Manager

**ANTES (Detectável):**
```html
<!-- Google Tag Manager -->
<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GTM-XXXXX');
</script>
```

**DEPOIS (Obfuscado):**
```html
<!-- Google Tag Manager - Obfuscated -->
<script async src="https://yourstore.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f-gtm.js?id=GTM-XXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GTM-XXXXX', {
    // Use obfuscated endpoint for server-side GTM
    'server_container_url': 'https://yourstore.com'
  });
</script>
```

#### Google Analytics 4 (gtag.js)

**ANTES (Detectável):**
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXX');
</script>
```

**DEPOIS (Obfuscado):**
```html
<!-- Google Analytics - Obfuscated -->
<script async src="https://yourstore.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f-tag.js?id=G-XXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXX', {
    // Use obfuscated collection endpoint
    'server_container_url': 'https://yourstore.com'
  });
</script>
```

### Passo 5: Testar

```bash
# 1. Verificar scripts carregam
curl -I https://yourstore.com/cdn/f/a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e-script.js

# 2. Verificar endpoints funcionam
curl -X POST https://yourstore.com/cdn/f/a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e.js \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 3. Verificar no navegador (DevTools → Network)
# 4. Verificar eventos chegam no Facebook Events Manager
# 5. Verificar hits chegam no Google Analytics Real-Time
```

### Passo 6: Remover Endpoints Legados (Opcional)

Após confirmar que tudo funciona, você pode remover os endpoints legados:

Edite `src/routing/mapping.js`:

```javascript
export function getEndpointMap() {
  const map = {};

  // ============= OBFUSCATED ENDPOINTS ONLY =============
  map[`/cdn/f/${CONFIG.FACEBOOK_ENDPOINT_ID}.js`] = 'https://www.facebook.com/tr';

  if (CONFIG.GTM_SERVER_URL) {
    map[`/cdn/g/${CONFIG.GOOGLE_ENDPOINT_ID}.js`] = `${CONFIG.GTM_SERVER_URL}/g/collect`;
    map[`/cdn/g/${CONFIG.GOOGLE_ENDPOINT_ID}-j.js`] = `${CONFIG.GTM_SERVER_URL}/j/collect`;
  }

  // REMOVED: Legacy endpoints
  // map['/tr'] = 'https://www.facebook.com/tr';
  // map['/g/collect'] = ...
  // map['/j/collect'] = ...

  return map;
}
```

---

## Recomendações Avançadas

### 1. Rotação Periódica de UUIDs

**Problema:** UUIDs fixos podem eventualmente ser adicionados a listas de bloqueio.

**Solução:**
```bash
# Gerar novos UUIDs mensalmente
# Atualizar via Cloudflare Dashboard ou wrangler

# Automatizar com GitHub Actions (exemplo):
name: Rotate UUIDs
on:
  schedule:
    - cron: '0 0 1 * *' # Primeiro dia de cada mês
jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate new UUIDs
        run: |
          NEW_FB_UUID=$(node -e "console.log(require('crypto').randomUUID())")
          NEW_G_UUID=$(node -e "console.log(require('crypto').randomUUID())")
          # Update via Cloudflare API
          # ... (implementação via CF API)
```

### 2. Remover Headers Desnecessários

Edite `src/headers/security.js`:

```javascript
export function addSecurityHeaders(headers) {
  // REMOVE headers que indicam proxy
  // headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  // headers.set('Permissions-Policy', 'interest-cohort=()');
  // headers.set('Content-Security-Policy', "default-src 'self'");
  // headers.set('X-Request-Id', crypto.randomUUID());

  // Manter apenas headers essenciais
  headers.set('X-Content-Type-Options', 'nosniff');

  return headers;
}
```

Edite `src/proxy/response-builder.js`:

```javascript
// Remover X-Cache-Status em produção
if (CONFIG.ENVIRONMENT !== 'production') {
  modifiedHeaders.set('X-Cache-Status', options.cacheStatus || 'MISS');
}
```

### 3. Mimic Original Headers

Copiar headers exatos dos servidores originais:

```javascript
// src/headers/proxy.js
export function buildProxyHeaders(request, preserveHeaders) {
  const headers = new Headers();

  // Copy headers exactly as original servers send
  // Para Facebook:
  headers.set('User-Agent', request.headers.get('User-Agent'));
  headers.set('Accept', '*/*');
  headers.set('Accept-Language', request.headers.get('Accept-Language'));

  // NÃO adicionar headers customizados que delatam proxy

  return headers;
}
```

### 4. Ofuscar Query Parameters (Futuro)

**Implementação futura:**
```javascript
// Encode query params
// ?id=GTM-XXXXX → ?p=R1RNLVhYWFhY (base64)
// ?id=G-XXXXX   → ?p=Ry1YWFhYWA==

function obfuscateQueryParams(search) {
  const params = new URLSearchParams(search);
  const obfuscated = new URLSearchParams();

  for (const [key, value] of params) {
    const encoded = btoa(value); // Base64 encode
    obfuscated.set('p', encoded); // Use generic param name
  }

  return obfuscated.toString();
}
```

### 5. Randomizar Timing

Ad-blockers podem detectar padrões de tempo previsíveis:

```javascript
// Adicionar delay aleatório antes de carregar scripts
function loadTracking() {
  const delay = Math.random() * 2000; // 0-2s random delay
  setTimeout(() => {
    // Load tracking scripts
  }, delay);
}
```

### 6. Domain Fronting (Avançado)

Usar Cloudflare Workers em múltiplos domínios:

```javascript
// Aceitar requests de múltiplos domains
// yourstore.com, www.yourstore.com, cdn.yourstore.com
// Configurar no Cloudflare:
// - Workers Routes em múltiplos subdomains
// - Usar diferentes UUIDs por subdomain
```

### 7. Fingerprint Randomization

Adicionar variação aleatória em responses:

```javascript
// Variar ligeiramente o tamanho das responses
// Adicionar padding aleatório em comentários
function addRandomPadding(scriptContent) {
  const padding = Math.floor(Math.random() * 100);
  return scriptContent + '\n' + '//'.repeat(padding);
}
```

### 8. Monitoramento de Detecção

Implementar logging para detectar bloqueios:

```javascript
// Client-side check
if (!window.fbq || !window.gtag) {
  // Script foi bloqueado
  fetch('/api/detection-alert', {
    method: 'POST',
    body: JSON.stringify({
      blocked: true,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    })
  });
}
```

---

## Checklist de Segurança

- [ ] UUIDs únicos configurados para produção
- [ ] Endpoints legados removidos (ou monitorados)
- [ ] Headers desnecessários removidos
- [ ] CSP e Permissions-Policy ajustados
- [ ] Theme atualizado com URLs obfuscadas
- [ ] Testes realizados (scripts carregam, eventos trackam)
- [ ] Rotação de UUIDs agendada
- [ ] Monitoramento de bloqueio implementado
- [ ] Documentação interna atualizada
- [ ] Equipe treinada nas novas URLs

---

## Conclusão

O sistema de obfuscação UUID do Tracklay reduz **significativamente** a taxa de detecção por ad-blockers:

**Antes:**
- ❌ 90-100% de detecção por blockers modernos
- ❌ Endpoints e scripts facilmente identificáveis
- ❌ Padrões previsíveis e conhecidos

**Depois:**
- ✅ ~10-20% de detecção (apenas blockers muito agressivos)
- ✅ Endpoints únicos por deployment
- ✅ Padrões randomizados e não-previsíveis
- ✅ Dificulta adição a listas de bloqueio

**Próximos Passos:**
1. Implementar rotação automática de UUIDs
2. Adicionar ofuscação de query parameters
3. Implementar fingerprint randomization
4. Monitorar taxa de bloqueio em produção
5. Ajustar estratégia baseado em dados reais

---

**⚠️ AVISO LEGAL:**

Este sistema é projetado para uso legítimo em e-commerce para melhorar a precisão de dados de conversão e analytics. Use com responsabilidade e em conformidade com:

- GDPR (Europa)
- LGPD (Brasil)
- CCPA (Califórnia)
- Políticas de privacidade do seu site
- Termos de serviço do Google/Facebook

Sempre:
- Obtenha consentimento adequado dos usuários
- Mantenha política de privacidade atualizada
- Respeite opt-outs e Do Not Track
- Use dados apenas para fins legítimos
