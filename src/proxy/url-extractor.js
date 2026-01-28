/**
 * @fileoverview URL Extractor - Extracts URLs from JavaScript scripts
 * @module proxy/url-extractor
 * 
 * @description
 * Extracts all URLs from JavaScript script content using regex patterns.
 * Supports HTTPS, HTTP, and protocol-relative URLs.
 * Filters URLs to identify trackable/analytics domains.
 * 
 * @example
 * import { extractUrls, filterTrackableUrls, isTrackableUrl } from './url-extractor.js';
 * 
 * const scriptContent = await fetch('https://example.com/script.js').then(r => r.text());
 * const allUrls = extractUrls(scriptContent);
 * const trackableUrls = filterTrackableUrls(allUrls);
 */

import { Logger } from '../core/logger.js';

/**
 * List of known tracking/analytics domains
 * @constant {string[]}
 * @private
 */
const TRACKABLE_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'googleadservices.com',
  'facebook.com',
  'connect.facebook.net',
  'clarity.ms',
  'tiqcdn.com',
  'segment.com',
  'analytics.google.com',
  'ssl.google-analytics.com',
  'www.google.com',
  'google.com',
  'region1.google-analytics.com',
  'region2.google-analytics.com',
  'bat.bing.com',
  's.yimg.com',
  'ct.pinterest.com',
  'snap.licdn.com',
  'static.ads-twitter.com',
  'analytics.twitter.com',
  'cdn.heapanalytics.com',
  'cdn.mxpnl.com',
  'cdn.amplitude.com',
  'cdn.segment.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com'
];

/**
 * Regex patterns for URL extraction
 * @constant {RegExp[]}
 * @private
 */
const URL_PATTERNS = [
  /https?:\/\/[^\s\'"\`\)]+/g,
  /\/\/[a-zA-Z0-9][-a-zA-Z0-9]*\.[^\s\'"\`\)]+/g,
  /\$\{[^}]*\}/g,
];

/**
 * Patterns to ignore (false positives)
 * @constant {RegExp[]}
 * @private
 */
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
 * Extracts all URLs from JavaScript script content
 * 
 * @param {string} scriptContent - The JavaScript content to parse
 * @returns {string[]} Array of unique URLs found in the script
 * 
 * @example
 * const content = 'fetch("https://example.com/api")';
 * const urls = extractUrls(content);
 * console.log(urls); // ['https://example.com/api']
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
 * Filters URLs to return only trackable/analytics domains
 * 
 * @param {string[]} urls - Array of URLs to filter
 * @returns {string[]} Filtered array containing only trackable URLs
 * 
 * @example
 * const urls = ['https://google-analytics.com/collect', 'https://example.com/image.png'];
 * const trackable = filterTrackableUrls(urls);
 * console.log(trackable); // ['https://google-analytics.com/collect']
 */
export const filterTrackableUrls = (urls) => urls?.filter(isTrackableUrl) ?? [];

/**
 * Checks if a URL belongs to a known tracking/analytics domain
 * 
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL is from a trackable domain
 * 
 * @example
 * const isTrackable = isTrackableUrl('https://google-analytics.com/collect');
 * console.log(isTrackable); // true
 */
export function isTrackableUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const lowerUrl = url.toLowerCase();
  
  return TRACKABLE_DOMAINS.some(domain => lowerUrl.includes(domain.toLowerCase()));
}

/**
 * Cleans extracted URL by removing quotes, parentheses, and normalizing protocol
 * 
 * @param {string} url - Raw extracted URL string
 * @returns {string|null} Cleaned URL or null if invalid
 * @private
 */
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

/**
 * Validates if a string is a valid URL for processing
 * 
 * @param {string} url - URL string to validate
 * @returns {boolean} True if URL is valid
 * @private
 */
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

/**
 * Extracts URLs from common concatenation patterns in tracking scripts
 * 
 * @param {string} content - Script content to analyze
 * @returns {string[]} Array of URLs found in concatenation patterns
 * @private
 */
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
 * Normalizes a URL for comparison by removing query params and hash
 * 
 * @param {string} url - Original URL
 * @returns {string} Normalized URL (protocol + hostname + pathname)
 * 
 * @example
 * const normalized = normalizeUrl('https://example.com/path?query=1#hash');
 * console.log(normalized); // 'https://example.com/path'
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
