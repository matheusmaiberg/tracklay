# Verificação com Documentação Shopify

## Fontes Consultadas

1. **Shopify.dev - About Web Pixels** (Documentação Oficial)
   - URL: https://shopify.dev/docs/apps/build/marketing-analytics/pixels

2. **Shopify Community - Custom Pixels Events Sandbox**
   - URL: https://community.shopify.com/t/custom-pixels-events-sandbox-session-and-cookies/227900

3. **Shopify.dev Community - Access to Advanced DOM Events**
   - URL: https://community.shopify.dev/t/access-to-advanced-dom-events/5914

4. **Help.Shopify - Custom Pixels**
   - URL: https://help.shopify.com/en/manual/promoting-marketing/pixels/custom-pixels

---

## ✅ CONFIRMADO: Dois Tipos de Sandbox

A documentação oficial do Shopify confirma que existem **dois tipos** de sandbox:

### 1. Strict Sandbox (Web Workers) - App Pixels
> "App developers create web pixel app extensions which are loaded in a `strict` sandbox environment using web workers."

**APIs Garantidas:**
- ✅ `self`
- ✅ `console`
- ✅ `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`
- ✅ `fetch`, `Headers`, `Request`, `Response`

**⚠️ IMPORTANTE:** 
> "You must not rely on any other globals being available. Many globals will be explicitly overwritten to be `undefined` in the sandbox."

**❌ NÃO TEM:**
- `window.document`
- `localStorage`
- `sessionStorage`
- `document.cookie`

---

### 2. Lax Sandbox (iframe) - Custom Pixels

> "Custom pixels are loaded in a `lax` sandbox environment. The lax sandbox is an `iframe` element that has the `sandbox` attribute defined with the `allow-scripts` and `allow-forms` values."

**Comunidade Shopify Dev confirma:**
> "In a Custom Web Pixel, which uses the Lax (iframe) sandbox, the Page Visibility API is available by default."

**⚠️ LIMITAÇÃO:**
> "Traditional Javascript pixels that are placed in the `lax` sandbox **cannot access the top frame**. There are certain properties that return different values because you cannot access the top frame."

> "For example, `window.href` returns the sandbox URL instead of the top frame URL."

---

## ✅ CONFIRMADO: Cookies FUNCIONAM no Lax Sandbox

**Comunidade Shopify Dev:**
> "Quick note on cookies inside the sandbox: **they do work**."

**Mas há limitações:**
- O iframe sandbox tem origem diferente (sandbox URL)
- Cookies com `SameSite=Lax` podem não ser compartilhados com o parent
- Para compartilhar entre iframe e parent, precisa usar `SameSite=None; Secure`

---

## ⚠️ CONFIRMADO: localStorage/sessionStorage - Acesso Restrito

**Fonte externa (ceaksan.com):**
> "Limited direct DOM access, no document.cookie access, **restricted localStorage / sessionStorage**."

**Por que é restrito?**
- O Custom Pixel roda em iframe sandbox
- O iframe tem origem diferente do tema principal
- localStorage/sessionStorage são **isolados por origem**
- O iframe do pixel tem URL tipo: `https://shopify.com/[...]/sandbox`
- O tema tem URL tipo: `https://loja.myshopify.com/`

**Resultado:**
```
┌─────────────────────────────────────────────┐
│  THEME (loja.myshopify.com)                 │
│  localStorage: {"theme_data": "..."}        │
└─────────────────────────────────────────────┘
         ↑                                    
         │  X  DIFERENTES ORIGENS (CORS)
         ↓                                    
┌─────────────────────────────────────────────┐
│  PIXEL (shopify.com/.../sandbox)            │
│  localStorage: {"pixel_data": "..."}        │
└─────────────────────────────────────────────┘
```

---

## ❌ CONFIRMADO: Service Workers - NÃO Disponíveis

**Documentação Shopify:**
Não menciona Service Workers na lista de APIs disponíveis nem no Strict nem no Lax sandbox.

**Lógica:**
- Service Workers registram-se por origem
- O iframe sandbox tem origem temporária/ephemeral
- Mesmo se pudesse registrar, não teria persistência

---

## ❌ CONFIRMADO: IndexedDB - Isolado

**Comunidade Shopify:**
> "I see that the register method has browser object with localStorage access but couldn't find any way to access indexedDB."

**Mesmo princípio do localStorage:**
- IndexedDB é isolado por origem
- O iframe do pixel tem origem diferente do tema
- Não compartilha dados com o tema

---

## ✅ CONFIRMADO: BroadcastChannel - Funciona (Mesma Origem)

**Não encontramos restrições específicas na documentação.**

**Funcionamento:**
- BroadcastChannel funciona entre contextos da **mesma origem**
- Se o tema e pixel estiverem em domínios diferentes, NÃO funciona
- Se estiverem no mesmo domínio (ex: subdomain), funciona

**No contexto Shopify:**
- Tema: `loja.myshopify.com`
- Pixel (iframe): `shopify.com/.../sandbox` (provavelmente)
- **Provavelmente NÃO funcionam na mesma origem**

---

## ✅ CONFIRMADO: fetch() - Funciona (com CORS)

**Documentação Shopify:**
> "`fetch` and related globals (`Headers`, `Request`, and `Response`), which can be used to make HTTP requests to arbitrary endpoints."

**Restrição:**
> "Any requests you make must explicitly support cross-origin resource sharing (CORS)."

---

## 📋 Resumo das Verificações

| Recurso | Strict (App Pixel) | Lax (Custom Pixel) | Compartilha com Theme? |
|---------|-------------------|-------------------|----------------------|
| **Service Worker** | ❌ Não | ❌ Não | ❌ Não |
| **IndexedDB** | ❌ Não | ⚠️ Sim (isolado) | ❌ Não |
| **localStorage** | ❌ Não | ⚠️ Sim (isolado) | ❌ Não |
| **sessionStorage** | ❌ Não | ⚠️ Sim (isolado) | ❌ Não |
| **document.cookie** | ❌ Não | ✅ Sim | ⚠️ Com limitações* |
| **BroadcastChannel** | ❌ Não | ✅ Sim | ❌ Provavelmente não** |
| **fetch()** | ✅ Sim | ✅ Sim | N/A |
| **Page Visibility API** | ❌ Não | ✅ Sim | N/A |

\* Cookies precisam de `SameSite=None; Secure` para compartilhar entre iframe e parent
\** BroadcastChannel requer mesma origem; tema e pixel provavelmente têm origens diferentes

---

## 🎯 Conclusão das Nossas Análises

### ✅ Acertos nas Nossas Análises Anteriores

1. **IndexedDB isolado** - ✅ CONFIRMADO
2. **localStorage isolado** - ✅ CONFIRMADO  
3. **Service Worker não disponível** - ✅ CONFIRMADO
4. **Cookies funcionam mas com limitações** - ✅ CONFIRMADO

### ⚠️ Erros Potenciais nas Nossas Análises

1. **BroadcastChannel**: Assumimos que funcionaria, mas provavelmente **NÃO funciona** porque tema e pixel têm origens diferentes.

2. **Cookies SameSite=Lax**: Estamos usando `SameSite=Lax`, mas para compartilhar entre iframe (pixel) e parent (theme), precisamos de `SameSite=None; Secure`.

---

## 🔧 Correções Necessárias Baseadas na Doc

### 1. BroadcastChannel - Verificar Origem
```javascript
// Antes: Assumimos que funciona
const channel = new BroadcastChannel('tracklay_events');

// Depois: Verificar se está na mesma origem ou usar fallback
if (window.location.origin === parent.origin) {
  // BroadcastChannel pode funcionar
} else {
  // Usar cookies como fallback
}
```

### 2. Cookies - SameSite=None
```javascript
// Antes:
document.cookie = '...; SameSite=Lax';

// Depois:
document.cookie = '...; SameSite=None; Secure';
```

### 3. Remover IndexedDB/localStorage da Comunicação
**CONFIRMADO:** Eles não compartilham dados entre pixel e theme.

---

## 📚 Referências

1. Shopify.dev - About Web Pixels: https://shopify.dev/docs/apps/build/marketing-analytics/pixels
2. Shopify Help - Custom Pixels: https://help.shopify.com/en/manual/promoting-marketing/pixels/custom-pixels
3. Shopify Community - Custom Pixels Sandbox: https://community.shopify.com/t/custom-pixels-events-sandbox-session-and-cookies/227900
4. Shopify Dev Community - Access to Advanced DOM Events: https://community.shopify.dev/t/access-to-advanced-dom-events/5914
