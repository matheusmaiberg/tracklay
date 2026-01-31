# Tracklay - Versão Simplificada

## Estrutura Original vs Simplificada

### Original (2458 linhas)
```
module.init.js       - 386 linhas
module.loader.js     - 293 linhas  
module.config.js     - 238 linhas
module.cookie-tracker.js - 914 linhas (!)
module.deduplicator.js - 171 linhas
module.logger.js     - 224 linhas
module.builder.js    - 232 linhas
```

### Simplificada (2 arquivos, ~400 linhas)
```
tracklay.minimal.js  - 170 linhas (tudo em um arquivo)
module.init.simple.js - 90 linhas (integração Custom Pixel)
```

---

## Opção 1: Arquivo Único (Recomendado)

Use apenas `tracklay.minimal.js`:

```html
<script src="tracklay.minimal.js"></script>
<script>
  // Pronto! GTM carrega automaticamente
  // Para enviar eventos manualmente:
  Tracklay.push({
    name: 'custom_event',
    data: { value: 100 }
  });
</script>
```

**Funcionalidades mantidas:**
- ✅ Carregamento GTM via proxy
- ✅ Envio de eventos para dataLayer
- ✅ Deduplicação simples
- ✅ BroadcastChannel básico
- ✅ Detecção de iframe

**Removido:**
- ❌ IndexedDB complexo
- ❌ Logger com estilos
- ❌ Retry exponencial
- ❌ Fingerprint de eventos
- ❌ Auto-init com polling

---

## Opção 2: Separado (Custom Pixel)

Use `module.init.simple.js` para integração com Custom Pixel:

```javascript
// No Custom Pixel do Shopify
importScripts('module.init.simple.js');

analytics.subscribe('checkout_completed', (event) => {
  Tracklay.push({
    name: 'checkout_completed',
    id: event.id,
    timestamp: event.timestamp,
    data: event.data
  });
});
```

---

## Configuração

Adicione no tema liquid ANTES do script:

```html
<script>
  window.TracklayConfig = {
    GTM_ID: 'GTM-MJ7DW8H',
    PROXY_DOMAIN: 'https://cdn.suevich.com/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f',
    TRANSPORT_URL: 'https://data.suevich.com/',
    CURRENCY: 'EUR',
    DEBUG: false
  };
</script>
```

---

## Migração

### Passo 1: Backup
Copie os arquivos antigos para uma pasta `backup/`.

### Passo 2: Substitua
- Delete todos os `module.*.js` antigos
- Copie `tracklay.minimal.js` e `module.init.simple.js`

### Passo 3: Atualize referências
```html
<!-- Antes -->
<script type="module" src="module.config.js"></script>
<script type="module" src="module.logger.js"></script>
<script type="module" src="module.init.js"></script>

<!-- Depois -->
<script src="tracklay.minimal.js"></script>
```

### Passo 4: Teste
Verifique no Tag Assistant se:
1. GTM carrega corretamente
2. Eventos chegam no dataLayer
3. Não há erros no console

---

## Diferenças de Comportamento

| Aspecto | Original | Simplificado |
|---------|----------|--------------|
| Linhas de código | 2458 | ~260 |
| Dedup | Fingerprint complexo | ID + timestamp |
| Retry | Exponencial (10x) | Nenhum |
| Logger | Níveis + estilos | Console simples |
| Cookie sync | IndexedDB + polling | BroadcastChannel |
| Init | Async com retry | Sync direto |

**Impacto:** Praticamente zero na funcionalidade real. A versão simplificada faz exatamente o que precisa.

---

## Quando usar a versão completa?

Use a versão original (complexa) apenas se precisar de:
- Dedup extremamente preciso (fingerprint de todos os campos)
- Retry em condições de rede instável
- Logging detalhado em produção
- Suporte a browsers antigos (IE11)

Para 99% dos casos, a **versão simplificada é suficiente**.
