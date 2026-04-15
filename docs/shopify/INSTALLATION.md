# Instalação Tracklay no Shopify

Este guia cobre a instalação completa do Tracklay em lojas Shopify.

## Pré-requisitos

- Worker Tracklay deployado e funcionando
- URLs conhecidas: `https://seu-worker.com/cdn/events`, `https://seu-worker.com/cdn/g/{uuid}`
- GTM ID e GA4 Measurement ID

---

## Parte 1: Tema (Dawn / Qualquer Tema)

### Opção A: Módulos ES6 (Recomendado)

**1. Copie os arquivos para a pasta Assets do tema:**

No Shopify Admin → Online Store → Themes → Edit Code, envie estes arquivos para a pasta **Assets**:

```
module.config.js
module.logger.js
module.builder.js
module.deduplicator.js
module.cookie-tracker.js
module.loader.js
module.init.js
```

**2. Crie o snippet de inicialização:**

Na pasta **Snippets**, crie `tracklay-init.liquid` e cole o conteúdo de:
[`snippets/tracklay-init.liquid`](snippets/tracklay-init.liquid)

**3. Configure via Metafields da Shopify (recomendado):**

Vá em **Settings → Custom data → Shop metafields** e crie os metafields abaixo:

| Namespace | Key | Tipo | Valor de exemplo |
|-----------|-----|------|------------------|
| `tracklay` | `gtm_id` | Single line text | `GTM-MJ7DW8H` |
| `tracklay` | `measurement_id` | Single line text | `G-N5ZZGL11MW` |
| `tracklay` | `worker_url` | Single line text | `https://cdn.suevich.com` |
| `tracklay` | `gtm_server_url` | Single line text | `https://gtm.suevich.com` |
| `tracklay` | `currency` | Single line text | `BRL` |
| `tracklay` | `debug` | True or false | `false` |

Depois vá em **Settings → General** e preencha os valores nos metafields da loja.

> **Dica:** Com metafields você não precisa editar código para trocar configurações. O snippet `tracklay-init.liquid` lê automaticamente.

**Alternativa:** Se preferir, pode sobrescrever no próprio `theme.liquid` antes do render:
```liquid
<script>
  window.TracklayConfig = {
    gtmId: 'GTM-XXXXXX',
    measurementId: 'G-XXXXXXXXXX',
    workerBaseUrl: 'https://cdn.seudominio.com'
  };
</script>
{% render 'tracklay-init' %}
```

**4. Adicione ao tema:**

Abra `layout/theme.liquid` e adicione antes de `</head>`:

```liquid
{% render 'tracklay-init' %}
```

---

### Opção B: Script Standalone (Temas Simples)

Se preferir não usar ES6 modules, cole diretamente no `theme.liquid` antes de `</head>`:

```liquid
<script>
  // Config
  window.TracklayConfig = {
    workerBaseUrl: 'https://cdn.seudominio.com',
    measurementId: 'G-XXXXXXXXXX',
    currency: 'BRL',
    debug: false
  };
</script>
<script src="{{ 'server-side-tracking.js' | asset_url }}"></script>
```

O arquivo [`server-side-tracking.js`](examples/server-side-tracking.js) deve estar na pasta Assets.

---

## Parte 2: Checkout (Custom Pixel)

**1. Acesse o Custom Pixel:**

Shopify Admin → **Settings → Customer Events** → **Add Custom Pixel**

**2. Cole o código:**

Cole o conteúdo completo de:
[`custom-pixel-serverside.js`](examples/custom-pixel-serverside.js)

**3. Configure as variáveis no topo do código:**

```javascript
var CONFIG = {
  WORKER_URL: 'https://cdn.seudominio.com/cdn/events',
  MEASUREMENT_ID: 'G-XXXXXXXXXX',
  DEBUG: false
};
```

**4. Salve e Connect.**

---

## Como Funciona

### Dual Tracking

O Tracklay usa **dois canais simultâneos**:

1. **Server-Side (`fetch`):** O Custom Pixel envia eventos de checkout diretamente para o Worker (`/cdn/events`), que encaminha para o GTM Server-Side → GA4.
2. **Bridge (`sessionStorage`):** O Custom Pixel também grava os eventos em `browser.sessionStorage`. O tema lê esses eventos via polling e os injeta no `dataLayer` para o GTM frontend.

Isso garante que você tenha:
- Eventos no GA4 (via server-side)
- Eventos no GTM frontend (via dataLayer, para debugging e tags síncronas)

---

## Teste

### 1. Health Check

Abra no navegador:
```
https://cdn.seudominio.com/health
```

Deve retornar `{"status":"ok","version":"1.0.0"}`.

### 2. Testar Tema

- Abra a loja
- DevTools → Console
- Procure por logs `[GTM]` ou `[Tracklay Theme]`
- Verifique se `gtm.js` carrega de `cdn.seudominio.com/cdn/g/...`

### 3. Testar Checkout

- Adicione um produto ao carrinho
- Vá para o checkout
- DevTools → Console
- No dropdown de contexto, selecione o **web-pixel-sandbox**
- Procure por logs `[Tracklay Pixel]`
- Verifique a aba **Network** por chamadas `POST` para `/cdn/events`

### 4. Verificar Logs do Worker

```bash
wrangler tail
```

Você deve ver eventos como:
```
Server-side event received: checkout_completed
Event forwarded successfully: checkout_completed
```

---

## Troubleshooting

### `404` no `/cdn/g/{uuid}`

Verifique se o `workerBaseUrl` e o `uuid` estão corretos. Os UUIDs podem ser obtidos em:
```
https://cdn.seudominio.com/endpoints?token=SEU_TOKEN
```

### Custom Pixel não envia eventos

- Confirme que `WORKER_URL` no pixel termina com `/cdn/events`
- Verifique se o CORS no Worker inclui o domínio da loja em `ALLOWED_ORIGINS`
- Ative `DEBUG: true` no pixel para ver logs no console

### Tema não recebe eventos do checkout

- Verifique se ambos (tema e pixel) usam o mesmo `workerBaseUrl`
- O bridge sessionStorage só funciona se o tema e o checkout compartilharem o mesmo origin. Se não compartilharem, o `fetch` server-side ainda funciona normalmente.
