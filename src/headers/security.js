// ============================================================
// SECURITY HEADERS - ADD SECURITY HEADERS
// ============================================================
// RESPONSIBILITY:
// - addSecurityHeaders(headers) → Headers (mutates)
// - X-Robots-Tag: noindex, nofollow, noarchive
// - Permissions-Policy: interest-cohort=()
// - Content-Security-Policy: default-src 'self'
// - X-Content-Type-Options: nosniff
// - X-Request-Id: crypto.randomUUID()

// FUNCTIONS:
// - addSecurityHeaders(headers) → Headers
// - getCSPDirectives() → string (helper, opcional)

export function addSecurityHeaders(headers) {
  // Não indexar proxy endpoints
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');

  // Política de permissões restritiva
  headers.set('Permissions-Policy', 'interest-cohort=()'); // Desabilitar FLoC

  // CSP para scripts
  headers.set('Content-Security-Policy', "default-src 'self'");

  // Prevenir MIME sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Request ID para debugging
  headers.set('X-Request-Id', crypto.randomUUID());

  return headers;
}
