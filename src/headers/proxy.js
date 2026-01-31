/**
 * @fileoverview Proxy Headers - Build headers for upstream
 * @module headers/proxy
 */

/**
 * @param {Request} request - Original request
 * @param {boolean} preserveHeaders - If true, preserves all critical headers
 * @returns {Headers} Headers for upstream
 */
export function buildProxyHeaders(request, preserveHeaders = false) {
  const headers = new Headers();
  const { headers: requestHeaders } = request;

  if (!preserveHeaders) {
    const userAgent = requestHeaders.get('User-Agent');
    if (userAgent) headers.set('User-Agent', userAgent);

    const acceptEncoding = requestHeaders.get('Accept-Encoding');
    if (acceptEncoding) headers.set('Accept-Encoding', acceptEncoding);

    return headers;
  }

  const criticalHeaders = new Set([
    'User-Agent',
    'Accept',
    'Accept-Language',
    'Accept-Encoding',
    'Referer',
    'Origin',
    'Content-Type',
    'Cookie',
    'X-Client-Data',
    'X-Requested-With',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'sec-ch-ua-platform-version',
    'sec-ch-ua-arch',
    'sec-ch-ua-model',
    'sec-ch-ua-bitness',
    'sec-ch-ua-full-version-list',
  ]);

  for (const header of criticalHeaders) {
    const value = requestHeaders.get(header);
    if (value) headers.set(header, value);
  }

  const clientIP = requestHeaders.get('CF-Connecting-IP');
  if (clientIP) {
    headers.set('X-Forwarded-For', clientIP);
    headers.set('X-Real-IP', clientIP);
  }

  const country = requestHeaders.get('CF-IPCountry');
  if (country) {
    headers.set('X-Country', country);
  }

  return headers;
}
