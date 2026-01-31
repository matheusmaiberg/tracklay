# 📁 Custom Pixel Files

> ⚠️ **IMPORTANTE:** `pixel.js` está **FINALIZADO** e **NÃO DEVE SER MODIFICADO**.
> Copie o código diretamente para o Custom Pixel do Shopify.

---

## 🎯 Arquivo Principal

### ⭐ `pixel.js` (~11KB) - STANDALONE

**Características:**
- ✅ **Completo** - inclui tudo necessário (builders, utilitários, etc)
- ✅ **Standalone** - não depende de arquivos externos
- ✅ **ES5 Vanilla** - compatível com sandbox do Shopify
- ✅ **Finalizado** - não requer modificações

**Funcionalidades:**
- Captura todos os eventos do checkout via `analytics.subscribe('all_events')`
- Formata dados no padrão GA4 (função `buildGA4Body` embutida)
- Envia para o theme via **BroadcastChannel** (canal `_tracklay_events`)
- **Fallback** via Cookies quando BC não funciona

---

## 🚀 Instalação

### No Admin do Shopify:

**Settings → Customer events → Add custom pixel**

1. **Nome:** `Tracklay Checkout`
2. **Permissões:** `Lax`
3. **Cole o conteúdo de `pixel.js`** (código completo)
4. **Connect** para ativar

**Pronto!** Não requer configurações adicionais.

---

## 📊 Eventos Capturados

| Evento Shopify | Descrição |
|----------------|-----------|
| `checkout_started` | Início do checkout |
| `checkout_completed` | Pedido finalizado |
| `checkout_contact_entered` | Email adicionado |
| `checkout_address_info_submitted` | Endereço adicionado |
| `payment_info_submitted` | Pagamento adicionado |
| `cart_viewed` | Carrinho visualizado |
| ... e todos outros via `all_events` | |

---

## 🎨 Formato de Saída

O pixel envia eventos no formato:

```javascript
{
  type: 'pixel_event',
  event: {
    id: 'evt_1234567890',
    name: 'checkout_completed',
    data: { /* dados originais do Shopify */ },
    timestamp: 1234567890,
    ga4: {
      // Dados formatados no padrão GA4
      event: 'checkout_completed',
      transaction_id: 'ORDER-123',
      value: 299.90,
      currency: 'BRL',
      items: [...]
    }
  },
  _sentAt: 1234567890
}
```

---

## 🛠️ Configuração (Opcional)

Para alterar configs (canal, debug, etc), edite o objeto `CONFIG` no início do arquivo:

```javascript
var CONFIG = {
  DEBUG: false,                    // Desativa logs
  CHANNEL_NAME: '_meu_canal',      // Canal customizado
  COOKIE_PREFIX: '_meu_prefixo_',  // Prefixo cookies
  MAX_RETRIES: 5,                  // Tentativas de envio
  DEDUP_WINDOW: 10000              // Janela de dedup (ms)
};
```

---

## ⚠️ Limitações do Sandbox

O Custom Pixel roda em sandbox **Lax** (iframe restrito):

| Recurso | Status | Nota |
|---------|--------|------|
| BroadcastChannel | ✅ FUNCIONA | Comunicação com tema |
| Cookies | ✅ FUNCIONA | Fallback |
| fetch | ✅ FUNCIONA | APIs externas |
| IndexedDB | ❌ BLOCKED | "access denied" |
| Service Worker | ❌ BLOCKED | Sem acesso |
| localStorage | ✅ Local only | Isolado do tema |

---

## 🧪 Debug

Ative logs mudando no código:

```javascript
var CONFIG = {
  DEBUG: true,  // ← Altere aqui
  // ...
};
```

Logs esperados:
```
[Pixel] 🚀 Pixel Tracker - Inicializando
[Pixel] ✅ BroadcastChannel inicializado
[Pixel] ✅ Inscrito em all_events!
[Pixel] Evento recebido de all_events: checkout_completed
[Pixel] 📡 Enviado via BroadcastChannel: checkout_completed
```

---

## 🔗 Integração

Veja `../liquid/README.md` para o Theme que **recebe** os eventos.

---

## 📋 Checklist

- [ ] Copiei `pixel.js` completo para o Custom Pixel
- [ ] Permissão está como `Lax`
- [ ] Pixel está conectado/ativo
- [ ] Theme tracker instalado na loja
- [ ] Teste de checkout realizado
- [ ] Logs de debug verificados
