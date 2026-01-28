# 🧪 Teste de Comunicação Theme ↔ Pixel

Scripts para validar quais canais de comunicação realmente funcionam entre o Theme (contexto normal) e o Custom Pixel (sandbox).

---

## 📁 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `test/test-communication-inline.js` | ⭐ Versão inline (colar no console) |
| `test/test-communication.min.js` | Versão minificada (uma linha) |
| `test/test-communication.js` | Versão modular (para CDN) |
| `test/test-communication.liquid` | Template Shopify (.liquid) |

### Diferença: HTML vs Liquid

- **.html** → Arquivo estático (funciona em qualquer servidor)
- **.liquid** → Template Shopify (para usar no tema da loja)

Na Shopify:
- Templates de página → `.liquid`
- Assets estáticos (JS, CSS) → podem ser `.js`, `.css`, `.html` na pasta `assets/`

---

## 🚀 Como Usar

### Método 1: Copiar e Colar no Console (Recomendado)

#### No Tema

1. Acesse sua loja Shopify (ex: `/products/produto-teste`)
2. Abra DevTools (F12) → Console
3. Cole o conteúdo de `test/test-communication-inline.js`
4. Pressione Enter
5. Copie os resultados

#### No Custom Pixel

1. Vá para o checkout da sua loja
2. Abra DevTools (F12) → Console  
3. Cole o mesmo código
4. Pressione Enter
5. Compare os resultados com o tema

---

### Método 2: Como Template Shopify (.liquid)

Se quiser uma página dedicada no seu tema:

1. **Copie o arquivo** `test/test-communication.liquid` para:
   ```
   templates/page.test-communication.liquid
   ```

2. **No Shopify Admin:**
   - Online Store → Pages → Add page
   - Title: "Teste de Comunicação"
   - Theme template: `page.test-communication`
   - Save

3. **Acesse a página** criada e veja as instruções

---

### Método 3: Via CDN

Se você hospedar os arquivos em um CDN:

```javascript
// No console do tema ou pixel
fetch('https://cdn.seustore.com/tracklay/test-communication.min.js')
  .then(r => r.text())
  .then(code => eval(code));
```

---

## 📊 O Que o Teste Verifica

| Canal | O que testa |
|-------|-------------|
| **Contexto** | Detecta se está no Theme ou Pixel |
| **Origin** | Mostra a URL de origem atual |
| **Parent Access** | Verifica se consegue acessar o parent (top frame) |
| **BroadcastChannel** | Testa envio/recebimento local |
| **localStorage** | Testa leitura/escrita e isolamento |
| **sessionStorage** | Testa leitura/escrita |
| **IndexedDB** | Testa abertura de banco |
| **Cookies (Lax)** | Testa cookies SameSite=Lax |
| **Cookies (None)** | Testa cookies SameSite=None; Secure |
| **Service Worker** | Verifica disponibilidade |
| **postMessage** | Testa comunicação iframe ↔ parent |

---

## 🎯 Resultados Esperados

### No Theme (`loja.myshopify.com`)

```
✅ Funcionando:
   - Contexto: THEME
   - Origin: https://loja.myshopify.com
   - Parent Access: TOP_FRAME
   - BroadcastChannel: WORKING_LOCAL
   - localStorage: WORKING_LOCAL (ISOLADO)
   - sessionStorage: WORKING
   - IndexedDB: WORKING_LOCAL (isolado)
   - Cookies (Lax): WORKING_LOCAL
   - Cookies (None+Secure): WORKING_LOCAL
   - Service Worker: WORKING (ou NO_REGISTRATION)

❌ Bloqueados:
   - (nenhum)
```

### No Custom Pixel (`shopify.com/.../sandbox`)

```
✅ Funcionando:
   - Contexto: PIXEL_SANDBOX
   - Origin: https://shopify.com/[...]/sandbox (DIFERENTE!)
   - Parent Access: SANDBOXED
   - BroadcastChannel: WORKING_LOCAL
   - localStorage: WORKING_LOCAL (ISOLADO)
   - sessionStorage: WORKING
   - IndexedDB: WORKING_LOCAL (isolado)
   - Cookies (Lax): WORKING_LOCAL
   - Cookies (None+Secure): WORKING_LOCAL

❌ Bloqueados:
   - Service Worker: BLOCKED
```

---

## 🔑 Conclusões dos Testes

### Canais que FUNCIONAM para comunicação:

```
✅ Cookies com SameSite=None; Secure
   → Único canal que compartilha dados entre iframe e parent

⚠️  postMessage (com limitações)
   → Funciona mas requer CORS configurado
```

### Canais que NÃO funcionam:

```
❌ BroadcastChannel
   → Origens diferentes: loja.myshopify.com ≠ shopify.com

❌ localStorage
   → Isolado por origem

❌ IndexedDB  
   → Isolado por origem

❌ Service Worker
   → Indisponível no Custom Pixel
```

---

## 🛠️ Usando os Resultados

Após executar o teste em ambos os contextos, você terá certeza absoluta de:

1. **Quais APIs estão disponíveis** em cada contexto
2. **Se as origens são diferentes** (spoiler: são!)
3. **Qual canal usar** para comunicação cross-context

### Recomendação Final

Com base nos testes:

```javascript
// NO PIXEL: Enviar para o theme
function sendToTheme(event) {
  // 1. Cookies (funciona sempre)
  document.cookie = `_tracklay_event=${JSON.stringify(event)}; SameSite=None; Secure; path=/`;
  
  // 2. postMessage (opcional, se souber o parent)
  window.parent.postMessage({ source: 'tracklay-pixel', event }, '*');
}

// NO THEME: Receber do pixel
function receiveFromPixel() {
  // 1. Polling de cookies
  setInterval(() => {
    const match = document.cookie.match(/_tracklay_event=([^;]+)/);
    if (match) {
      const event = JSON.parse(decodeURIComponent(match[1]));
      // Processa evento...
      // Limpa cookie
      document.cookie = '_tracklay_event=; expires=0; path=/';
    }
  }, 200);
  
  // 2. Listener de postMessage
  window.addEventListener('message', (e) => {
    if (e.data.source === 'tracklay-pixel') {
      // Processa evento...
    }
  });
}
```

---

## 🐛 Debug

Se os testes falharem:

1. **Verifique se está no contexto correto**
   - Theme: URL deve ser `loja.myshopify.com/*`
   - Pixel: Checkout, DevTools deve mostrar iframe sandbox

2. **Verifique bloqueadores**
   - Ad blockers podem bloquear cookies
   - Modo anônimo pode ter restrições extras

3. **Verifique consentimento de cookies**
   - Shopify requer consentimento para tracking
   - Sem consentimento, cookies podem ser bloqueados

---

**Nota:** Execute o teste em ambos os contextos para ter certeza absoluta do comportamento na sua loja específica.
