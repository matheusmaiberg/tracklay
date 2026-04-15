# Mapeamento de Eventos Shopify → GA4

Este documento descreve como os eventos nativos da Shopify (Web Pixel API e tema Dawn) são traduzidos para os nomes de eventos oficiais do Google Analytics 4 (GA4) dentro do Tracklay.

## Por que isso é necessário

A **Tag do Google** (`googtag`) no GTM envia eventos do `dataLayer` para o GA4 **literalmente**.

Se você fizer:
```javascript
dataLayer.push({ event: 'checkout_completed' });
```

O GA4 recebe um evento personalizado chamado `checkout_completed`. Ele **não** será contabilizado como uma conversão de e-commerce no GA4, porque o nome reservado para isso é `purchase`.

Para que relatórios de monetização, funil de e-commerce e atribuição funcionem corretamente, é necessário traduzir os nomes dos eventos da Shopify para os nomes GA4 oficiais **antes** de enviá-los ao `dataLayer`.

## Onde acontece a tradução

A tradução é feita no arquivo:

```
docs/shopify/examples/advanced/dawn-theme/module.init.js
```

Dentro da função `resolveMappedEventName()`, que recebe o nome original do evento e retorna o nome GA4 correspondente.

## Tabela de Mapeamento

### Estrutura do código

O mapeamento usa um objeto onde:
- **A chave** é o nome oficial do evento no GA4
- **O valor** é um array com todos os nomes de entrada que devem ser mapeados para aquele evento

Isso permite compatibilidade com:
- Eventos da **Shopify Web Pixel API** (`checkout_completed`, `product_added_to_cart`, etc.)
- Eventos já emitidos pelo tema **Dawn** (`purchase`, `add_to_cart`, etc.)
- Outros scripts de terceiros que usem os nomes GA4 diretamente

### Mapeamentos atuais

| Evento GA4 (saída) | Eventos Shopify / Dawn (entradas) |
|---|---|
| `page_view` | `page_viewed`, `page_view` |
| `view_item` | `product_viewed`, `view_item` |
| `view_item_list` | `collection_viewed`, `view_item_list` |
| `add_to_cart` | `product_added_to_cart`, `add_to_cart` |
| `remove_from_cart` | `product_removed_from_cart`, `remove_from_cart` |
| `view_cart` | `cart_viewed`, `view_cart` |
| `begin_checkout` | `checkout_started`, `begin_checkout` |
| `add_shipping_info` | `checkout_address_info_submitted`, `checkout_shipping_info_submitted`, `add_shipping_info` |
| `add_payment_info` | `checkout_contact_info_submitted`, `payment_info_submitted`, `add_payment_info` |
| `purchase` | `checkout_completed`, `purchase` |
| `search` | `search_submitted`, `search` |
| `alert_displayed` | `alert_displayed` |
| `ui_extension_errored` | `ui_extension_errored` |

## Exemplo de funcionamento

```javascript
// Evento recebido do Custom Pixel Shopify
const eventFromShopify = {
  name: 'checkout_completed',
  data: { value: 299.90, currency: 'BRL' }
};

// Após passar por resolveMappedEventName()
const ga4EventName = resolveMappedEventName(eventFromShopify.name);
// Retorna: 'purchase'

// Enviado ao dataLayer
dataLayer.push({
  event: 'purchase',
  value: 299.90,
  currency: 'BRL'
});
```

## Como adicionar novos mapeamentos

Edite o objeto `EVENT_NAME_MAPPINGS` no `module.init.js`:

```javascript
var EVENT_NAME_MAPPINGS = {
  // ... mapeamentos existentes
  'purchase': ['checkout_completed', 'purchase'],
  'your_new_ga4_event': ['shopify_event_name', 'dawn_event_name']
};
```

Não é necessário alterar nada no GTM. A Tag do Google (`googtag`) enviará automaticamente o novo nome para o GA4.

## Nota sobre a lookup table no GTM

Você pode ter uma variável do tipo **Tabela de Consulta** no GTM chamada `MAP || Eventos Google`. No entanto, a **Tag do Google** (`googtag`) não possui um campo editável para "Nome do Evento" — ela sempre envia o nome literal do evento do `dataLayer`. Portanto, a lookup table do GTM **não é aplicável** nesta arquitetura. A tradução deve acontecer **no código do tema**, conforme documentado acima.
