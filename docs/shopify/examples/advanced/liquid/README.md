# 📁 Liquid Theme Files

Arquivos para o **Tema Shopify** (`theme.liquid`).

---

## 🎯 Arquitetura (Único Dedup)

```
┌─────────────────────────────────────────┐
│  CUSTOM PIXEL (checkout)                │
│  └─ pixel.js                            │
│     ├─ Captura eventos                  │
│     ├─ Formata GA4                      │
│     └─ Envia (SEM dedup)                │
└──────────────┬──────────────────────────┘
               │ BroadcastChannel / Cookie
               ▼
┌─────────────────────────────────────────┐
│  TEMA (loja)                            │
│                                         │
│  ┌─ deduplicator.js  ◄──────────────────┐
│  │   └─ ÚNICO dedup no sistema          │
│  │                                       │
│  ├─ broadcast-receiver.js               │
│  │   └─ Recebe mensagens                │
│  │                                       │
│  ├─ cookie-poller.js                    │
│  │   └─ Fallback                         │
│  │                                       │
│  └─ theme-google-tag-manager.js  ⭐     │
│      └─ Orquestra + envia GTM           │
│                                         │
└─────────────────────────────────────────┘
```

**Dedup centralizado no tema** - Pixel apenas captura e envia.

---

## 🚀 Instalação

```liquid
<!-- No <head> do theme.liquid -->

<!-- 1. Dependências CDN -->
<script src="{{ 'deduplicator.js' | asset_url }}"></script>
<script src="{{ 'broadcast-receiver.js' | asset_url }}"></script>
<script src="{{ 'cookie-poller.js' | asset_url }}"></script>
<script src="{{ 'gtm-loader.js' | asset_url }}"></script>

<!-- 2. Script principal -->
<script src="{{ 'theme-google-tag-manager.js' | asset_url }}"></script>

<!-- 3. Configuração -->
<script>
  ThemeGTM.init({
    gtmId: 'GTM-XXXXXXX',  // Seu GTM ID
    debug: false           // Logs no console
  });
</script>
```

---

## 📦 Arquivos

| Arquivo | Tamanho | Função |
|---------|---------|--------|
| `theme-google-tag-manager.js` | ~5KB | **Orquestrador** - coordena tudo |
| `deduplicator.js` | ~8.7KB | **Dedup completo** (localStorage + memory) |
| `broadcast-receiver.js` | ~3KB | Recebe do Pixel via BroadcastChannel |
| `cookie-poller.js` | ~2.6KB | Fallback quando BC não funciona |

---

## 🔌 APIs dos Módulos

### Deduplicator

```javascript
// Verifica duplicado
if (!Deduplicator.isDuplicate(event)) {
  // Processa evento...
  
  // Marca como processado (para estatísticas)
  Deduplicator.markProcessed(event, 'theme');
}

// Estatísticas
var stats = Deduplicator.getStats();
// { memoryCacheSize: 42, byOrigin: { theme: 40, pixel: 2 } }

// Limpa tudo
Deduplicator.clear();
```

### BroadcastReceiver

```javascript
BroadcastReceiver.init({
  channel: '_tracklay_events',
  onEvent: function(event, rawData) {
    console.log('Recebido:', event.name);
  },
  debug: false
});
```

### CookiePoller

```javascript
CookiePoller.init({
  onEvent: function(event) {
    console.log('Via cookie:', event);
  },
  interval: 200,
  debug: false
});
```

### ThemeGTM (Principal)

```javascript
ThemeGTM.init({
  gtmId: 'GTM-XXXXX',   // Opcional
  debug: true
});
```

---

## 🧪 Debug

```
[ThemeGTM] 🚀 Theme GTM - Inicializando
[ThemeGTM] ✅ GTM inicializado: GTM-XXXXXXX
[BroadcastReceiver] ✅ Inicializado no canal: _tracklay_events
[ThemeGTM] ✅ Pronto!
[BroadcastReceiver] 📡 Mensagem recebida: {...}
[ThemeGTM]   ✅ Processando: checkout_completed
[ThemeGTM]   ✅ Enviado para tracklay
```

---

## 🔗 Integração

Veja `custom-pixel/README.md` para o Custom Pixel.
