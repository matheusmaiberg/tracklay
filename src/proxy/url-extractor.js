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

  // Google Ads & Conversion
  'googleadservices.com',
  'googlesyndication.com',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  'www.google.com',
  'google.com',
  'cct.google',

  // Facebook/Meta
  'facebook.com',
  'connect.facebook.net',
  'graph.facebook.com',

  // Microsoft
  'clarity.ms',
  'bat.bing.com',

  // Other tracking platforms
  'tiqcdn.com',
  'segment.com',
  'cdn.segment.com',
  's.yimg.com',
  'ct.pinterest.com',
  'snap.licdn.com',
  'static.ads-twitter.com',
  'analytics.twitter.com',
  'cdn.heapanalytics.com',
  'cdn.mxpnl.com',
  'cdn.amplitude.com',
  'doubleclick.net',
  'ads.linkedin.com',
  'px.ads.linkedin.com',
  'tr.snapchat.com',
  'sc-static.net'
];

const URL_PATTERNS = [
  /https?:\/\/[^\s\'"\`\)]+/g,
  /\/\/[a-zA-Z0-9][-a-zA-Z0-9]*\.[^\s\'"\`\)]+/g,
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

/**
 * @param {string} scriptContent
 * @returns {string[]}
 */
export function extractUrls(scriptContent) {
  if (!scriptContent || typeof scriptContent !== 'string') {
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
 * @returns {string[]}
 */
export const filterTrackableUrls = (urls) => urls?.filter(isTrackableUrl) ?? [];

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

function cleanUrl(url) {
  if (!url) return null;

  let cleaned = url
    .replace(/^[\'"\`\(]+/, '')
    .replace(/[\'"\)]+$/, '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");

  if (cleaned.startsWith('//')) {
    cleaned = `https:${cleaned}`;
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

/**
 * Rewrites URLs in script content with proxied paths
 * @param {string} scriptContent - Original script content
 * @param {Map<string, {uuid: string, proxyPath: string}>} urlMappings - URL to proxy info
 * @returns {string} Script with URLs replaced
 */
export function rewriteScriptUrls(scriptContent, urlMappings) {
  if (!scriptContent || !urlMappings || urlMappings.size === 0) {
    return scriptContent;
  }

  let rewrittenContent = scriptContent;

  // Sort by length descending (replace longer URLs first to avoid partial matches)
  const sortedUrls = Array.from(urlMappings.keys())
    .sort((a, b) => b.length - a.length);

  for (const originalUrl of sortedUrls) {
    const mapping = urlMappings.get(originalUrl);
    if (!mapping?.proxyPath) continue;

    const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedUrl, 'g');
    rewrittenContent = rewrittenContent.replace(pattern, mapping.proxyPath);
  }

  Logger.debug('Script URLs rewritten', {
    urlsReplaced: urlMappings.size,
    lengthBefore: scriptContent.length,
    lengthAfter: rewrittenContent.length
  });

  return rewrittenContent;
}
