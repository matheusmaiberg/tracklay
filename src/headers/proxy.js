// ============================================================
// PROXY HEADERS - BUILD HEADERS PARA UPSTREAM
// ============================================================
// RESPONSABILIDADE:
// - buildProxyHeaders(request, preserveHeaders) → Headers
// - Se preserveHeaders=false: apenas User-Agent, Accept-Encoding
// - Se preserveHeaders=true: TODOS headers críticos (18+)
//   - User-Agent, Referer, Accept-Language, CF-IPCountry
//   - Client Hints (sec-ch-ua-*)
//   - GTM headers (X-Client-Data, X-Requested-With)
//   - IP headers (X-Forwarded-For, X-Real-IP)

// FUNÇÕES:
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

  if (!preserveHeaders) {
    // Apenas headers básicos para scripts
    const userAgent = request.headers.get('User-Agent');
    if (userAgent) headers.set('User-Agent', userAgent);

    const acceptEncoding = request.headers.get('Accept-Encoding');
    if (acceptEncoding) headers.set('Accept-Encoding', acceptEncoding);

    return headers;
  }

  // Preservar TODOS headers críticos para EMQ 9+
  const criticalHeaders = [
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
    'sec-ch-ua-full-version-list'
  ];

  // Copiar headers críticos
  for (const header of criticalHeaders) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }

  // Preservar IP do cliente (CRÍTICO para Event Match Quality)
  const clientIP = request.headers.get('CF-Connecting-IP');
  if (clientIP) {
    headers.set('X-Forwarded-For', clientIP);
    headers.set('X-Real-IP', clientIP);
  }

  // País (para geo-targeting)
  const country = request.headers.get('CF-IPCountry');
  if (country) {
    headers.set('X-Country', country);
  }

  return headers;
}
