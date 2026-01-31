/**
 * @fileoverview URL Extractor - Extracts URLs from JavaScript scripts
 */

import { Logger } from '../core/logger.js';

const TRACKABLE_DOMAINS = [
  // Google Analytics & Tag Manager
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'ssl.google-analytics.com',
  'region1.google-analytics.com',
  'region2.google-analytics.com',
  'tagassistant.google.com',

  // Google Ads & Conversion
  'googleadservices.com',
  'googlesyndication.com',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  'adservice.google.com.br',
  'www.google.com',
  'google.com',
  'cct.google',

  // Google DoubleClick
  'doubleclick.net',
  'fls.doubleclick.net',
  'stats.g.doubleclick.net',
  'ad.doubleclick.net',

  // YouTube (Google-owned)
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'ytimg.com',
  'i.ytimg.com',

  // Facebook/Meta
  'facebook.com',
  'www.facebook.com',
  'connect.facebook.net',
  'graph.facebook.com',
  'pixel.facebook.com',
  'fbcdn.net',

  // Instagram (Meta-owned)
  'instagram.com',
  'cdninstagram.com',

  // Microsoft
  'clarity.ms',
  'bat.bing.com',
  'bing.com',

  // TikTok
  'analytics.tiktok.com',
  'tiktok.com',

  // Twitter/X
  'static.ads-twitter.com',
  'analytics.twitter.com',
  't.co',

  // LinkedIn
  'ads.linkedin.com',
  'px.ads.linkedin.com',
  'snap.licdn.com',

  // Pinterest
  'ct.pinterest.com',
  'pinimg.com',

  // Snapchat
  'tr.snapchat.com',
  'sc-static.net',

  // Other tracking platforms
  'tiqcdn.com',
  'segment.com',
  'cdn.segment.com',
  'api.segment.io',
  's.yimg.com',
  'cdn.heapanalytics.com',
  'cdn.mxpnl.com',
  'cdn.amplitude.com',
  'hotjar.com',
  'script.hotjar.com',
  'static.hotjar.com',
  'plausible.io',
  'cdn.usefathom.com'
];

const URL_PATTERNS = [
  // Standard URLs
  /https?:\/\/[^\s\'"\`\)]+/g,
  // Protocol-relative URLs
  /\/\/[a-zA-Z0-9][-a-zA-Z0-9]*\.[^\s\'"\`\)]+/g,
  // Escaped URLs (common in minified JS): https:\/\/example.com\/path
  /https?:\\?\/\\?\/[^\s\'"\`\)]+/g,
  // Template literals
  /\$\{[^}]*\}/g,
];

const IGNORE_PATTERNS = [
  /^data:/i,
  /^blob:/i,
  /^javascript:/i,
  /^mailto:/i,
  /^tel:/i,
  /^#/,
  /\.svg$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.woff2?$/i,
  /\.ttf$/i,
  /\.eot$/i,
  /{[\w-]+}/,
];

const MAX_SCRIPT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * @param {string} scriptContent
 * @returns {string[]}
 */
export function extractUrls(scriptContent) {
  if (!scriptContent || typeof scriptContent !== 'string') {
    return [];
  }
  if (scriptContent.length > MAX_SCRIPT_SIZE) {
    Logger.warn('Script too large, skipping URL extraction', { 
      size: scriptContent.length 
    });
    return [];
  }

  const urls = new Set();

  for (const pattern of URL_PATTERNS) {
    const matches = scriptContent.match(pattern);
    if (matches) {
      for (const match of matches) {
        const cleanedUrl = cleanUrl(match);
        if (cleanedUrl && isValidUrl(cleanedUrl)) {
          urls.add(cleanedUrl);
        }
      }
    }
  }

  const concatenationUrls = extractConcatenationUrls(scriptContent);
  for (const url of concatenationUrls) {
    if (isValidUrl(url)) {
      urls.add(url);
    }
  }

  const result = Array.from(urls);
  
  Logger.debug('URLs extracted from script', {
    totalFound: result.length,
    urls: result.slice(0, 10)
  });

  return result;
}

/**
 * @param {string[]} urls
 * @param {boolean} filterEnabled - If false, returns all URLs (no filtering)
 * @returns {string[]}
 */
export const filterTrackableUrls = (urls, filterEnabled = false) => {
  if (!filterEnabled) {
    // Proxy ALL external URLs (recommended for maximum bypass)
    return urls?.filter(url => isExternalUrl(url)) ?? [];
  }
  return urls?.filter(isTrackableUrl) ?? [];
};

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isTrackableUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const lowerUrl = url.toLowerCase();

  return TRACKABLE_DOMAINS.some(domain => lowerUrl.includes(domain.toLowerCase()));
}

/**
 * Check if URL is external (not relative or same-origin placeholder)
 * @param {string} url
 * @returns {boolean}
 */
function isExternalUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Must start with http:// or https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  // Skip localhost and local IPs
  if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0')) {
    return false;
  }

  return true;
}

function cleanUrl(url) {
  if (!url) return null;

  let cleaned = url
    // Remove quotes and brackets at start/end
    .replace(/^[\'"\`\(]+/, '')
    .replace(/[\'"\)]+$/, '')
    // Unescape slashes (common in minified JS)
    .replace(/\\\//g, '/')
    // Unescape dots (common in regex literals)
    .replace(/\\\./g, '.')
    // Unescape quotes
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    // Remove trailing punctuation that's not part of URL
    .replace(/[,;]+$/, '');

  if (cleaned.startsWith('//')) {
    cleaned = `https:${cleaned}`;
  }

  // Reject URLs that still contain backslashes (likely from regex literals)
  // These are not valid URLs and shouldn't be proxied
  if (cleaned.includes('\\')) {
    return null;
  }

  return cleaned;
}

function isValidUrl(url) {
  if (!url || url.length < 10) {
    return false;
  }

  if (IGNORE_PATTERNS.some(pattern => pattern.test(url))) {
    return false;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  const withoutProtocol = url.replace(/^https?:\/\//, '');
  if (!withoutProtocol.includes('.')) {
    return false;
  }

  if (url.includes(' ')) {
    return false;
  }

  return true;
}

function extractConcatenationUrls(content) {
  const urls = [];
  
  const domainPatterns = [
    /["']https:\/\/www\.google-analytics\.com["']/g,
    /["']https:\/\/ssl\.google-analytics\.com["']/g,
    /["']https:\/\/www\.googletagmanager\.com["']/g,
    /["']https:\/\/region\d\.google-analytics\.com["']/g,
  ];

  for (const pattern of domainPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        const url = cleanUrl(match);
        if (url) urls.push(url);
      }
    }
  }

  return urls;
}

/**
 * @param {string} url
 * @returns {string}
 */
export function normalizeUrl(url) {
  if (!url) return '';

  try {
    const { protocol, hostname, pathname } = new URL(url);
    return `${protocol}//${hostname}${pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}


