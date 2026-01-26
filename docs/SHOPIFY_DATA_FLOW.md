# Como Dados do Shopify São Enviados para o Worker

## A Pergunta

> "Como fazer se não podemos colocar headers no tema para passar dados do Shopify para o backend?"

## A Resposta Curta

**Você NÃO precisa de headers customizados!** ✅

- ✅ Headers importantes são capturados **automaticamente** pelo Cloudflare
- ✅ Dados específicos do Shopify vão no **payload JSON** (body)

---

## Fluxo de Dados Completo

### 1. Headers Automáticos (Cloudflare)

Quando o browser faz `fetch()` para o Worker, o Cloudflare **automaticamente** adiciona headers:

```javascript
// Browser faz:
fetch('https://cdn.suevich.com/cdn/events', {
  method: 'POST',
  body: JSON.stringify({ ... })
});

// Cloudflare adiciona AUTOMATICAMENTE:
// CF-Connecting-IP: 192.168.1.1 (IP real do usuário)
// User-Agent: Mozilla/5.0... (browser do usuário)
// Referer: https://suevich.com/products/... (página atual)
```

### 2. Worker Captura Headers

O Worker **já está implementado** para capturar esses headers:

```javascript
// src/handlers/events.js (linha 81-83)
const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
const userAgent = request.headers.get('User-Agent') || '';
const referer = request.headers.get('Referer') || '';
```

### 3. Worker Forward para GTM Server

O Worker **passa os headers originais** para o GTM Server:

```javascript
// src/handlers/events.js (linha 105-112)
await fetch(gtmServerUrl, {
  method: 'POST',
  headers: {
    'User-Agent': userAgent,        // Do client original
    'X-Forwarded-For': clientIP,    // IP do client original
    'Referer': referer              // Página de origem
  },
  body: JSON.stringify(ga4Payload)
});
```

**Resultado:** GTM Server recebe como se o request viesse direto do browser! ✅

---

## Dados Específicos do Shopify

### Problema: Headers Customizados Não Funcionam

```javascript
// ❌ ISSO NÃO FUNCIONA:
fetch('/cdn/events', {
  headers: {
    'X-Customer-Id': '{{ customer.id }}',  // ❌ Browser bloqueia
    'X-Order-Id': '{{ order.id }}'         // ❌ CORS issue
  }
});
```

### Solução: Dados no Payload JSON

```javascript
// ✅ ISSO FUNCIONA:
fetch('/cdn/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'  // Só precisa disso!
  },
  body: JSON.stringify({
    event_name: 'purchase',

    // ✅ Todos os dados do Shopify vão aqui:
    customer_id: '{{ customer.id }}',
    customer_email: '{{ customer.email }}',
    order_id: '{{ order.id }}',
    product_id: '{{ product.id }}',
    price: {{ product.price | money_without_currency }}
  })
});
```

---

## Shopify Liquid Templates

Você pode usar **Liquid templates** para injetar dados do Shopify:

### Exemplo 1: Customer Data

```liquid
{% if customer %}
<script>
const customerData = {
  customer_id: '{{ customer.id }}',
  customer_email: '{{ customer.email }}',
  customer_first_name: '{{ customer.first_name }}',
  customer_orders_count: {{ customer.orders_count }},
  customer_total_spent: {{ customer.total_spent | money_without_currency | remove: ',' }}
};
</script>
{% endif %}
```

### Exemplo 2: Product Data

```liquid
{% if product %}
<script>
const productData = {
  product_id: '{{ product.id }}',
  product_name: '{{ product.title | escape }}',
  product_type: '{{ product.type }}',
  product_vendor: '{{ product.vendor }}',
  price: {{ product.price | money_without_currency | remove: ',' }},
  currency: '{{ shop.currency }}'
};
</script>
{% endif %}
```

### Exemplo 3: Order/Checkout Data

```liquid
{% if checkout.order %}
<script>
const orderData = {
  transaction_id: '{{ checkout.order.id }}',
  order_number: '{{ checkout.order.name }}',
  total: {{ checkout.total_price | money_without_currency | remove: ',' }},
  tax: {{ checkout.tax_price | money_without_currency | remove: ',' }},
  shipping: {{ checkout.shipping_price | money_without_currency | remove: ',' }},
  currency: '{{ checkout.currency }}'
};
</script>
{% endif %}
```

---

## Worker Processa Tudo

O Worker recebe o payload JSON e extrai os dados:

```javascript
// Cliente envia:
{
  event_name: 'purchase',
  customer_id: '12345',
  order_id: '67890',
  total: 99.99
}

// Worker processa e forward para GTM:
{
  event_name: 'purchase',
  client_id: 'GA1.1.xxx.xxx',
  user_properties: {
    customer_id: '12345'
  },
  events: [{
    name: 'purchase',
    params: {
      transaction_id: '67890',
      value: 99.99,
      currency: 'EUR'
    }
  }]
}
```

---

## Exemplo Completo: Purchase Tracking

Veja o arquivo completo: [`purchase-tracking-example.liquid`](shopify/examples/purchase-tracking-example.liquid)

**Mostra:**
- ✅ Como capturar dados do Shopify com Liquid
- ✅ Como estruturar o payload JSON
- ✅ Como enviar para o Worker
- ✅ Todos os campos disponíveis (customer, order, products)

---

## Comparação: Headers vs JSON Body

| Dado | Via Headers | Via JSON Body |
|------|-------------|---------------|
| **IP do cliente** | ✅ Automático (CF-Connecting-IP) | ❌ Não necessário |
| **User-Agent** | ✅ Automático | ❌ Não necessário |
| **Referer** | ✅ Automático | ❌ Não necessário |
| **Customer ID** | ❌ CORS bloqueia | ✅ JSON body |
| **Order ID** | ❌ CORS bloqueia | ✅ JSON body |
| **Product data** | ❌ CORS bloqueia | ✅ JSON body |
| **Custom fields** | ❌ CORS bloqueia | ✅ JSON body |

---

## FAQ

### 1. Por que não usar headers customizados?

**Resposta:** CORS (Cross-Origin Resource Sharing) bloqueia headers customizados em requests cross-origin. Apenas headers "simples" são permitidos:
- `Content-Type` (com valores específicos)
- `Accept`
- `Accept-Language`

Headers como `X-Customer-Id`, `X-Order-Id` **exigem preflight request** (OPTIONS) e configuração CORS adicional.

### 2. O GTM Server vai receber os headers corretos?

**Sim!** ✅ O Worker forward:
- `User-Agent` (do client original)
- `X-Forwarded-For` (IP do client original)
- `Referer` (página de origem)

GTM Server vê como se o request viesse direto do browser.

### 3. Como o Worker sabe o IP real do usuário?

**Cloudflare adiciona automaticamente:**
- `CF-Connecting-IP` - IP real do cliente (antes de passar pelo proxy)
- `X-Forwarded-For` - Chain de IPs

O Worker usa `CF-Connecting-IP` que é o IP **verdadeiro** do usuário.

### 4. Posso enviar dados sensíveis?

**Sim, mas com cuidado:**
- ✅ Customer ID (anônimo)
- ✅ Order ID (anônimo)
- ⚠️ Email (apenas se necessário, com consentimento)
- ❌ Password (NUNCA)
- ❌ Payment info (NUNCA)

**GDPR/LGPD:** Sempre obtenha consentimento antes de enviar dados pessoais.

### 5. Quantos dados posso enviar?

**Limites:**
- Request body: até 1MB (configurável no Worker)
- Prático: ~100KB por evento é suficiente
- GA4: Aceita até 25 eventos por request (batch)

**Recomendação:** Envie apenas dados necessários para análise.

---

## Resumo

✅ **Headers importantes:** Capturados automaticamente pelo Cloudflare
✅ **Dados do Shopify:** Enviados no payload JSON (body)
✅ **Worker forward tudo:** GTM Server recebe como se fosse direto do browser
✅ **Sem configuração extra:** Tudo já está implementado no Worker

**Você só precisa:**
1. Adicionar JavaScript no tema
2. Usar Liquid templates para injetar dados do Shopify
3. Enviar via `fetch()` com dados no JSON body
4. Worker cuida do resto! ✅
