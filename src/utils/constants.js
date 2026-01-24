// ============================================================
// CONSTANTS - CONSTANTES DO SISTEMA
// ============================================================
// RESPONSABILIDADE:
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
