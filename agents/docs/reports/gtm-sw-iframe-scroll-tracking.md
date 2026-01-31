# Como Funciona o Tracking de Rolagem (Scroll) com sw_iframe.html

## Resumo

Quando o GTM usa o **sw_iframe.html** (Service Worker), o tracking de rolagem/scroll funciona de forma **diferente** do modo tradicional. Aqui está o que acontece:

---

## 🔄 Arquitetura de Comunicação

### Modo Normal (Sem Service Worker)
```
Página Principal
    ↓ (scroll event)
GTM na página
    ↓
Evento gtm.scrollDepth dispara
    ↓
Tag GA4/PageView é enviada diretamente
```

### Modo Service Worker (Com sw_iframe)
```
Página Principal
    ↓ (scroll event)
GTM na página detecta scroll
    ↓ (postMessage)
sw_iframe.html (invisível)
    ↓ (comunicação interna)
sw.js (Service Worker)
    ↓ (fetch/XHR)
Servidor de tracking (sGTM)
```

---

## 📊 Como o Scroll é Detectado

### 1. Eventos de Scroll na Página Principal

O GTM sempre escuta eventos de scroll na **página principal**, não no iframe:

```javascript
// Na página principal - GTM escuta scroll nativo
window.addEventListener('scroll', function() {
  // Calcula profundidade de scroll
  var scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  
  // Dispara evento para dataLayer
  dataLayer.push({
    'event': 'gtm.scrollDepth',
    'scrollDepthThreshold': scrollPercent,
    'scrollDepthUnits': 'percent'
  });
});
```

**Importante:** O scroll é sempre detectado na página principal, independente do Service Worker.

---

## 🚀 Fluxo de Dados do Scroll com Service Worker

### Passo a Passo:

#### 1. Usuário Rola a Página
```
Usuário scrolla ↓
    ↓
Evento nativo 'scroll' é disparado na página principal
```

#### 2. GTM Detecta o Scroll
```javascript
// Trigger de Scroll Depth do GTM é ativado
// Variáveis são preenchidas:
// - {{Scroll Depth Threshold}} = 50 (por exemplo)
// - {{Scroll Depth Units}} = "percent"
// - {{Scroll Direction}} = "vertical"
```

#### 3. Tag GA4 Prepara o Hit
```javascript
// Tag GA4 Event monta o payload:
{
  "event_name": "scroll",
  "event_params": {
    "percent_scrolled": "50",
    "page_location": "https://sualoja.com/produto",
    "page_title": "Nome do Produto"
  }
}
```

#### 4. Comunicação com Service Worker
```javascript
// O GTM verifica se deve usar Service Worker
if (serviceWorkerState === 2) {  // Se SW estiver pronto
    // Envia via postMessage para sw_iframe.html
    swIframe.contentWindow.postMessage({
        type: 'GA4_HIT',
        payload: hitData,
        endpoint: 'https://metrics.sualoja.com/g/collect'
    }, '*');
} else {
    // Fallback: envia diretamente da página
    fetch(endpoint, { body: hitData });
}
```

#### 5. Service Worker Processa
```javascript
// Dentro do sw_iframe.html → sw.js
self.addEventListener('message', function(event) {
    if (event.data.type === 'GA4_HIT') {
        // Envia o hit para o servidor
        fetch(event.data.endpoint, {
            method: 'POST',
            body: event.data.payload,
            // ... configurações
        });
    }
});
```

---

## ⚡ Diferenças no Comportamento

### 1. **Timing de Envio**

| Aspecto | Sem SW | Com SW |
|---------|--------|--------|
| Latência | Direta (~10-50ms) | Via postMessage (~50-100ms) |
| Confiabilidade | Padrão | Melhor (retry automático) |
| Durante unload | Pode perder | Mais confiável |

### 2. **Visibilidade no DevTools**

**Sem Service Worker:**
- Eventos aparecem na aba Network da página principal
- Fácil debug

**Com Service Worker:**
- Eventos **NÃO** aparecem na aba Network da página principal
- Aparecem na aba Network do **Service Worker** (separado)
- Requer inspeção do sw_iframe para ver os hits

### 3. **Tag Assistant**

**Problema:** O Tag Assistant mostra o sw_iframe.html como uma "página fantasma" separada.

**Por que acontece:**
- O Tag Assistant detecta todos os iframes
- O sw_iframe.html é um iframe real (embora invisível)
- Ele mostra como uma instância separada do container

---

## 🔍 Como Verificar se Scroll Está Funcionando

### Método 1: Console na Página Principal
```javascript
// Execute no console da página principal
dataLayer.push({'event': 'gtm.scrollDepth', 'scrollDepthThreshold': 50});

// Verifique se aparece no Tag Assistant
```

### Método 2: Inspecionar o Service Worker
```javascript
// 1. Abra DevTools → Application → Service Workers
// 2. Clique em "inspect" no Service Worker ativo
// 3. Vá para a aba Network deste SW
// 4. Execute scroll na página principal
// 5. Verifique se os hits aparecem lá
```

### Método 3: Verificar postMessage
```javascript
// Adicione na página principal para debug
window.addEventListener('message', function(event) {
    console.log('[SW Debug] Mensagem recebida:', event.data);
});
```

---

## 🐛 Problemas Comuns

### Problema 1: Scroll Event Não Dispara

**Sintoma:** O evento de scroll não aparece no Tag Assistant

**Causas possíveis:**
1. O trigger de Scroll Depth não está configurado corretamente
2. A página é muito curta (não tem scroll suficiente)
3. O GTM ainda não carregou completamente

**Solução:**
```javascript
// Verifique se o GTM está pronto
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
    'event': 'gtm.scrollDepth',
    'scrollDepthThreshold': 25,
    'scrollDepthUnits': 'percent'
});
```

### Problema 2: Hits de Scroll Não Aparecem no Network

**Sintoma:** O evento dispara no Tag Assistant mas não aparece na aba Network

**Causa:** O Service Worker está interceptando o hit

**Solução:**
```javascript
// 1. Vá para Application → Service Workers
// 2. Marque "Show all" para ver todos os SW
// 3. Encontre o SW do seu domínio
// 4. Clique em "Inspect" para abrir DevTools do SW
// 5. Vá para a aba Network do SW
```

### Problema 3: Duplicação de Eventos

**Sintoma:** O mesmo evento de scroll aparece 2x

**Causa:** Bug conhecido do Service Worker do GTM (março 2025)

**Explicação:**
- O GTM envia para o SW
- O SW deveria confirmar recebimento
- Se a confirmação falha, o GTM envia novamente

**Solução temporária:**
```javascript
// No sGTM, filtre eventos duplicados
// Verifique o parâmetro 'timestamp' ou 'event_id'
```

---

## 🎯 Impacto no Tracking de Scroll

### O Scroll Funciona Normalmente?

**SIM!** O tracking de scroll funciona **exatamente da mesma forma**:

1. ✅ O evento de scroll é detectado na página principal
2. ✅ O trigger de Scroll Depth dispara normalmente
3. ✅ As variáveis (Scroll Depth Threshold, etc.) são preenchidas
4. ✅ A tag é executada

**A única diferença é:** O hit é enviado via Service Worker em vez de diretamente.

---

## 🧪 Teste Prático

### Para confirmar que scroll está funcionando:

1. **Abra o Tag Assistant**
2. **Navegue para uma página longa** (com scroll)
3. **Role a página até 25%, 50%, 75%, 90%, 100%**
4. **Verifique no Tag Assistant:**
   - Evento `gtm.scrollDepth` deve aparecer
   - Variáveis devem estar populadas
   - Tag GA4 deve disparar

5. **Verifique no GA4 DebugView:**
   - Os eventos de scroll devem aparecer em tempo real

---

## 📋 Resumo Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    PÁGINA PRINCIPAL                          │
│                                                              │
│   ┌─────────────────┐        ┌──────────────────────────┐   │
│   │  Usuário rola   │───────▶│  GTM Scroll Listener     │   │
│   │  a página       │        │  (nativo, sempre ativo)  │   │
│   └─────────────────┘        └──────────┬───────────────┘   │
│                                         │                    │
│                              ┌──────────▼──────────┐        │
│                              │  dataLayer.push({   │        │
│                              │    event:           │        │
│                              │    'gtm.scrollDepth'│        │
│                              │  })                 │        │
│                              └──────────┬──────────┘        │
│                                         │                    │
│   ┌─────────────────────────────────────▼──────┐           │
│   │         GTM Container                      │           │
│   │  ┌───────────────────────────────────────┐ │           │
│   │  │  Trigger: Scroll Depth (25,50,75,90)  │ │           │
│   │  └──────────────────┬────────────────────┘ │           │
│   │                     │                      │           │
│   │  ┌──────────────────▼────────────────────┐ │           │
│   │  │  Tag: GA4 Event - scroll              │ │           │
│   │  └──────────────────┬────────────────────┘ │           │
│   └─────────────────────┼──────────────────────┘           │
│                         │                                   │
│                         │ postMessage                       │
│                         ▼                                   │
│   ┌──────────────────────────────────────────────┐         │
│   │  IFRAME INVISÍVEL: sw_iframe.html            │         │
│   │  ┌────────────────────────────────────────┐  │         │
│   │  │  Service Worker (sw.js)               │  │         │
│   │  │  Recebe mensagem via postMessage      │  │         │
│   │  │  Envia hit para servidor sGTM         │  │         │
│   │  └────────────────────────────────────────┘  │         │
│   └──────────────────────────────────────────────┘         │
│                         │                                   │
│                         │ fetch/XHR                         │
│                         ▼                                   │
│   ┌──────────────────────────────────────────────┐         │
│   │  SERVIDOR: sGTM (Server-Side GTM)            │         │
│   │  Processa hit e envia para GA4               │         │
│   └──────────────────────────────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Conclusão

**O tracking de scroll funciona normalmente com sw_iframe.html!**

**O que muda:**
- ❌ Nada na detecção do scroll (ainda é na página principal)
- ❌ Nada nos triggers e tags do GTM
- ✅ Apenas o **mecanismo de envio** do hit (via SW ao invés de direto)

**Recomendação:**
Não se preocupe com o sw_iframe.html afetar seu tracking de scroll. Ele só muda como o hit é enviado, não como o scroll é detectado.

Se precisar debugar, use:
1. Tag Assistant (para ver eventos)
2. GA4 DebugView (para ver dados em tempo real)
3. DevTools do Service Worker (para ver hits de rede)

---

*Documentação criada em: Janeiro 2026*
*Baseada na análise do código GTM proxyado via Tracklay*
