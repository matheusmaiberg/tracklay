// ============================================================
// CONSTANTS - CONSTANTES DO SISTEMA
// ============================================================
// RESPONSIBILITY:
// - Exportar constantes reutilizáveis
// - HTTP status codes
// - Header names
// - Content types
// - Outros valores fixos

// EXPORTS:
// export const HTTP_STATUS = { OK: 200, ... };
// export const HEADERS = { CORS_ALLOW_ORIGIN: 'Access-Control-Allow-Origin', ... };
// export const CONTENT_TYPES = { JSON: 'application/json', ... };

export const HTTP_STATUS = {
  OK: 200,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

export const HEADERS = {
  CORS_ALLOW_ORIGIN: 'Access-Control-Allow-Origin',
  CORS_ALLOW_METHODS: 'Access-Control-Allow-Methods',
  CORS_ALLOW_HEADERS: 'Access-Control-Allow-Headers',
  CORS_MAX_AGE: 'Access-Control-Max-Age',
  CACHE_CONTROL: 'Cache-Control',
  X_CACHE_STATUS: 'X-Cache-Status',
  X_RATELIMIT_LIMIT: 'X-RateLimit-Limit',
  X_RATELIMIT_REMAINING: 'X-RateLimit-Remaining',
  X_RATELIMIT_RESET: 'X-RateLimit-Reset',
  X_ROBOTS_TAG: 'X-Robots-Tag',
  CONTENT_SECURITY_POLICY: 'Content-Security-Policy',
  X_CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
  X_FRAME_OPTIONS: 'X-Frame-Options',
  CONTENT_TYPE: 'Content-Type',
};

export const CONTENT_TYPES = {
  JSON: 'application/json',
  TEXT: 'text/plain',
  HTML: 'text/html',
};

// ============================================================
// ROUTING CONSTANTS
// ============================================================
// PATH PREFIXES for ultra-aggressive obfuscation
// Scripts and endpoints share the same paths, differentiated by:
// - HTTP method (Facebook: POST=endpoint, GET=script)
// - Query parameters (Google: v=2/tid=/_p=endpoint, c=/id=script)
export const PATH_PREFIXES = {
  FACEBOOK: '/cdn/f/',
  GOOGLE: '/cdn/g/',
  GTM_FALLBACK: '/g/collect'
};

// UPSTREAM URLs (CDN sources for tracking scripts and endpoints)
export const UPSTREAM_URLS = {
  FACEBOOK_SCRIPT: 'https://connect.facebook.net/en_US/fbevents.js',
  FACEBOOK_ENDPOINT: 'https://www.facebook.com/tr',
  GOOGLE_SCRIPT: 'https://www.googletagmanager.com/gtm.js',
  GTM_TRANSPORT_SUFFIX: '/g/transport'
};

// GOOGLE TRACKING PARAMS - Query parameters that indicate tracking event (vs script request)
// When present: route to tracking endpoint (handleEndpointProxy)
// When absent: route to script handler (handleScriptProxy)
// - v=2: GA4 version parameter (indicates tracking event)
// - tid=: Tracking ID parameter
// - _p=: Page ID or session parameter
export const GOOGLE_TRACKING_PARAMS = ['v=2', 'tid=', '_p='];
