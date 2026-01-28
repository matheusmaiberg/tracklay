# Tracklay Dual-Context Tracking Integration

Este guia explica como configurar o rastreamento completo em Shopify usando **duas partes** que se validam mutuamente:

1. **Theme Tracker** (tema.liquid) - GTM com first-party proxy
2. **Pixel Tracker** (Custom Pixel) - Acesso a eventos de checkout

## Por que dividir?

| Contexto | Acesso a Checkout | Acesso ao GTM | Sandbox |
|----------|-------------------|---------------|---------|
| Custom Pixel | ✅ Sim | ❌ Não (sandboxed) | ✅ Sim |
| Theme | ❌ Não | ✅ Sim | ❌ Não |

**Solução**: Os dois se comunicam via múltiplos canais (BroadcastChannel, localStorage, cookies, IndexedDB) com deduplicação automática.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│  CUSTOMER                                                       │
│  └── Navegação na loja                                          │
│      ├── Páginas de produto (theme)                             │
│      ├── Carrinho (theme)                                       │
│      └── Checkout (checkout.liquid - acessível só pelo pixel)   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │  CUSTOM PIXEL   │        │  THEME          │                │
│  │  (sandboxed)    │◄──────►│  (unsandboxed)  │                │
│  │                 │        │                 │                │
│  │  • Captura      │        │  • GTM carregado│                │
│  │    checkout     │        │  • dataLayer    │                │
│  │  • Deduplica    │        │  • Recebe do    │                │
│  │  • Envia para   │        │    pixel        │                │
│  │    tema         │        │                 │                │
│  └─────────────────┘        └─────────────────┘                │
│           │                          │                          │
│           │  4 canais de             │                          │
│           │  comunicação             │                          │
│           ▼                          ▼                          │
│  ┌─────────────────────────────────────────┐                   │
│  │  CANAIS DE COMUNICAÇÃO                  │                   │
│  │  1. BroadcastChannel (instantâneo)      │                   │
│  │  2. localStorage (cross-tab)            │                   │
│  │  3. IndexedDB (grandes volumes)         │                   │
│  │  4. Cookies (escape do sandbox)         │                   │
│  └─────────────────────────────────────────┘                   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────┐                   │
│  │  DEDUPLICAÇÃO CROSS-CONTEXT             │                   │
│  │  • Event ID único                       │                   │
│  │  • Fingerprint de conteúdo              │                   │
│  │  • Time window (5s)                     │                   │
│  │  • Origem (quem processou primeiro)     │                   │
│  └─────────────────────────────────────────┘                   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────┐                   │
│  │  GTM + GA4 (First-Party Proxy)          │                   │
│  └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos

| Arquivo | Descrição | Onde usar |
|---------|-----------|-----------|
| `storage-manager.js` | Gerencia todos os storages | Importado por todos |
| `deduplicator.js` | Deduplicação entre contexts | Importado por todos |
| `theme-tracker.js` | Parte do tema | `theme.liquid` |
| `pixel-tracker.js` | Parte do Custom Pixel | Shopify Admin > Customer Events |

---

## Instalação

### Passo 1: Upload dos arquivos

Faça upload dos 4 arquivos para sua CDN/Worker:

```
https://cdn.seustore.com/tracklay/storage-manager.js
https://cdn.seustore.com/tracklay/deduplicator.js
https://cdn.seustore.com/tracklay/theme-tracker.js
https://cdn.seustore.com/tracklay/pixel-tracker.js
```

### Passo 2: Configurar o Tema (theme.liquid)

Adicione antes do `</head>`:

```html
<!-- Tracklay Theme Tracker -->
<script type="module">
  import { ThemeTracker } from 'https://cdn.seustore.com/tracklay/theme-tracker.js';
  
  ThemeTracker.init({
    gtmId: 'GTM-XXXXX',
    workerDomain: 'https://cdn.seustore.com',
    googleUuid: 'b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f',
    facebookUuid: 'a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e',
    debug: false  // true para desenvolvimento
  });
</script>
```

### Passo 3: Configurar o Custom Pixel

No Shopify Admin:
1. Settings > Customer Events
2. Add custom pixel
3. Nome: "Tracklay Checkout Tracker"
4. Copie o código:

```javascript
// Tracklay Pixel Tracker
import { PixelTracker } from 'https://cdn.seustore.com/tracklay/pixel-tracker.js';

// Inicializa automaticamente
// Não precisa de configuração - comunicação é automática
```

5. Save
6. Connect > Checkout (conecte ao checkout)

---

## Como funciona a deduplicação?

### Cenário 1: Evento no tema

```
Usuário vê produto
    ↓
Shopify Analytics dispara "product_viewed"
    ↓
Theme Tracker captura
    ↓
Deduplicator: "Já vi este evento?" → Não
    ↓
Marca como "processado pelo tema"
    ↓
Envia para GTM
    ↓
Pixel Tracker tenta enviar também
    ↓
Deduplicator: "Já foi processado pelo tema?" → Sim
    ↓
Ignora (não duplica)
```

### Cenário 2: Evento no checkout

```
Usuário completa compra
    ↓
Checkout (só pixel tem acesso)
    ↓
Pixel Tracker captura "checkout_completed"
    ↓
Deduplicator: "Novo evento"
    ↓
Marca como "processado pelo pixel"
    ↓
Envia para TEMA via 4 canais
    ↓
Theme Tracker recebe
    ↓
Deduplicator: "Processado pelo pixel, mas eu ainda não enviei"
    ↓
Envia para GTM
```

### Cenário 3: Ambos tentam (race condition)

```
Evento ocorre
    ↓
Theme Tracker e Pixel Tracker capturam simultaneamente
    ↓
Ambos verificam deduplicator ao mesmo tempo
    ↓
Web Locks API garante ordem
    ↓
Quem chegar primeiro marca
    ↓
Segundo vê que já foi marcado e ignora
```

---

## Canais de Comunicação

### 1. BroadcastChannel (Primário)
- **Latência**: < 1ms
- **Limite**: Nenhum
- **Compatibilidade**: Chrome 54+, Firefox 38+, Safari 15.4+
- **Uso**: Envio instantâneo de eventos

### 2. localStorage (Secundário)
- **Latência**: ~5ms
- **Limite**: 5-10MB
- **Compatibilidade**: Todos os navegadores
- **Uso**: Cross-tab, persiste refresh

### 3. IndexedDB (Volume)
- **Latência**: ~20ms
- **Limite**: 50MB+
- **Compatibilidade**: Todos os navegadores
- **Uso**: Eventos grandes (compra com muitos itens)

### 4. Cookies (Escape)
- **Latência**: ~50ms
- **Limite**: 4KB
- **Compatibilidade**: Todos
- **Uso**: Último recurso para sair do sandbox

---

## Eventos Rastreados

### Todos os eventos Shopify:

| Evento | Origem | Prioridade |
|--------|--------|------------|
| `checkout_completed` | Pixel | 100 (mais alta) |
| `checkout_started` | Pixel | 90 |
| `payment_info_submitted` | Pixel | 85 |
| `product_added_to_cart` | Ambos | 60 |
| `cart_viewed` | Tema | 50 |
| `product_viewed` | Tema | 40 |
| `page_viewed` | Tema | 20 |

---

## Debug

### No Tema (DevTools Console):

```javascript
// Ver estatísticas
ThemeTracker.getStats();
// {
//   memoryCacheSize: 45,
//   byOrigin: { theme: 30, pixel: 15 },
//   gtmLoaded: true
// }

// Enviar evento manual
ThemeTracker.push('custom_event', { value: 100 });
```

### No Pixel:

```javascript
// Ver estatísticas
PixelTracker.getStats();
// {
//   initialized: true,
//   queuedEvents: 0,
//   processedFingerprints: 128
// }
```

---

## Testando a integração

### Teste 1: Eventos no tema

1. Abra DevTools > Console
2. Navegue em uma página de produto
3. Veja: `[ThemeTracker] Event pushed to dataLayer: product_viewed`

### Teste 2: Eventos no checkout

1. Adicione produto ao carrinho
2. Vá para checkout
3. Complete uma compra de teste
4. Veja no Console do tema (após voltar):
   `[ThemeTracker] Event pushed to dataLayer: checkout_completed from pixel`

### Teste 3: Deduplicação

1. Abra duas abas da loja
2. Navegue no mesmo produto em ambas
3. Verifique que o evento só foi enviado uma vez

---

## Fallbacks Automáticos

Se um canal falha, o sistema tenta automaticamente:

```
BroadcastChannel falhou?
  → localStorage
    → IndexedDB
      → Cookies
        → Queue para retry em 5s
```

---

## Vantagens desta abordagem

1. **Cobertura 100%**: Checkout + Navegação
2. **Zero duplicação**: Deduplicação em múltiplas camadas
3. **Resiliente**: 4 canais de comunicação
4. **Performance**: BroadcastChannel é instantâneo
5. **Fácil debug**: Logs detalhados em cada etapa
6. **Extensível**: Adicione novos canais facilmente

---

## Troubleshooting

### Eventos do checkout não aparecem

1. Verifique se Custom Pixel está conectado ao checkout
2. Verifique no Console: `[PixelTracker] Subscribed to all Shopify events`
3. Teste: `PixelTracker.getStats()`

### Eventos duplicados

1. Verifique versões dos arquivos (devem ser as mesmas)
2. Limpe storage: `localStorage.clear()` + cookies
3. Recarregue a página

### GTM não carrega

1. Verifique `workerDomain` e `googleUuid`
2. Teste URL: `https://cdn.seustore.com/cdn/g/[UUID]?id=GTM-XXXXX`
3. Verifique CORS headers no Worker
