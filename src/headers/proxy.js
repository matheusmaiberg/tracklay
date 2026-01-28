// ============================================================
// PROXY HEADERS - BUILD HEADERS PARA UPSTREAM
// ============================================================
// RESPONSIBILITY:
// - buildProxyHeaders(request, preserveHeaders) → Headers
// - Se preserveHeaders=false: apenas User-Agent, Accept-Encoding
// - Se preserveHeaders=true: TODOS headers críticos (18+)
//   - User-Agent, Referer, Accept-Language, CF-IPCountry
//   - Client Hints (sec-ch-ua-*)
//   - GTM headers (X-Client-Data, X-Requested-With)
//   - IP headers (X-Forwarded-For, X-Real-IP)

// FUNCTIONS:
// - buildProxyHeaders(request, preserveHeaders) → Headers
// - getCriticalHeaders() → string[] (lista de headers)

/**
 * Constrói headers para requisições proxy
 * @param {Request} request - Request original
 * @param {boolean} preserveHeaders - Se true, preserva todos headers críticos
 * @returns {Headers} Headers para upstream
 */
export function buildProxyHeaders(request, preserveHeaders = false) {
  const headers = new Headers();
  const { headers: requestHeaders } = request;

  if (!preserveHeaders) {
    // Apenas headers básicos para scripts
    const userAgent = requestHeaders.get('User-Agent');
    if (userAgent) headers.set('User-Agent', userAgent);

    const acceptEncoding = requestHeaders.get('Accept-Encoding');
    if (acceptEncoding) headers.set('Accept-Encoding', acceptEncoding);

    return headers;
  }

  // Preservar TODOS headers críticos para EMQ 9+
  // OTIMIZAÇÃO: usar Set para lookup O(1) em vez de array
  const criticalHeaders = new Set([
    'User-Agent',
    'Accept',
    'Accept-Language',
    'Accept-Encoding',
    'Referer', // CRÍTICO para Event Match Quality
    'Origin',
    'Content-Type',
    'Cookie',
    // GTM headers
    'X-Client-Data',
    'X-Requested-With',
    // Client Hints modernos
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'sec-ch-ua-platform-version',
    'sec-ch-ua-arch',
    'sec-ch-ua-model',
    'sec-ch-ua-bitness',
    'sec-ch-ua-full-version-list',
  ]);

  // Copiar headers críticos usando for...of
  for (const header of criticalHeaders) {
    const value = requestHeaders.get(header);
    if (value) headers.set(header, value);
  }

  // Preservar IP do cliente (CRÍTICO para Event Match Quality)
  const clientIP = requestHeaders.get('CF-Connecting-IP');
  if (clientIP) {
    headers.set('X-Forwarded-For', clientIP);
    headers.set('X-Real-IP', clientIP);
  }

  // País (para geo-targeting)
  const country = requestHeaders.get('CF-IPCountry');
  if (country) {
    headers.set('X-Country', country);
  }

  return headers;
}
