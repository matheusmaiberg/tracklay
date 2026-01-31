#!/usr/bin/env node

/**
 * @fileoverview Config Validator - Validates Tracklay configuration before deploy
 * @module scripts/validate-config
 * 
 * This script checks:
 * - Required variables are set in wrangler.toml
 * - Secrets are configured via wrangler secret
 * - UUIDs are in valid format
 * - Domains/URLs are properly formatted
 * 
 * Usage: node scripts/validate-config.js
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

const REQUIRED_VARS = [
  'WORKER_BASE_URL',
  'ALLOWED_ORIGINS',
  'OBFUSCATION_FB_UUID',
  'OBFUSCATION_GA_UUID'
];

const REQUIRED_SECRETS = [
  'OBFUSCATION_SECRET',
  'ENDPOINTS_API_TOKEN'
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_REGEX = /^https:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*[a-zA-Z0-9]*\.[-a-zA-Z0-9.]+$/;

let errors = 0;
let warnings = 0;

function logError(msg) {
  console.log(`${RED}✗${RESET} ${msg}`);
  errors++;
}

function logSuccess(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function logWarning(msg) {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
  warnings++;
}

function logInfo(msg) {
  console.log(`${BLUE}ℹ${RESET} ${msg}`);
}

function parseWranglerToml() {
  try {
    const content = readFileSync('wrangler.toml', 'utf8');
    const vars = {};
    
    // Extract account_id
    const accountMatch = content.match(/account_id\s*=\s*"([^"]+)"/);
    if (accountMatch) {
      vars.account_id = accountMatch[1];
    }
    
    // Extract [vars] section
    const varsMatch = content.match(/\[vars\]([\s\S]*?)(?=\[|$)/);
    if (varsMatch) {
      const varsSection = varsMatch[1];
      const varMatches = varsSection.matchAll(/(\w+)\s*=\s*"([^"]*)"/g);
      for (const match of varMatches) {
        vars[match[1]] = match[2];
      }
    }
    
    return vars;
  } catch (err) {
    logError('Could not read wrangler.toml - did you copy wrangler.toml.example?');
    process.exit(1);
  }
}

function checkSecrets() {
  logInfo('Checking secrets...');
  
  for (const secret of REQUIRED_SECRETS) {
    try {
      // Try to get secret value
      execSync(`wrangler secret get ${secret} --name tracklay 2>/dev/null`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      logSuccess(`${secret} is configured`);
    } catch (err) {
      // Secret not found - check if we have placeholder in .env
      try {
        const envFile = readFileSync('.env', 'utf8');
        if (envFile.includes(`${secret}=`) && !envFile.includes(`${secret}=your-`) && !envFile.includes(`${secret}=xxxxxxxx-`)) {
          logWarning(`${secret} found in .env but not in Cloudflare secrets`);
          logInfo(`  Run: wrangler secret put ${secret}`);
        } else {
          logError(`${secret} is not configured`);
          logInfo(`  Set it with: wrangler secret put ${secret}`);
        }
      } catch {
        logError(`${secret} is not configured`);
        logInfo(`  Set it with: wrangler secret put ${secret}`);
      }
    }
  }
}

function validateUUID(value, name) {
  if (!value || value === 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx') {
    logError(`${name} is not set or is still the placeholder value`);
    logInfo(`  Generate with: node -e "console.log(require('crypto').randomUUID())"`);
    return false;
  }
  
  if (!UUID_REGEX.test(value)) {
    logError(`${name} is not a valid UUID format`);
    logInfo(`  Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    return false;
  }
  
  return true;
}

function validateURL(value, name) {
  if (!value || value.includes('yourstore.com')) {
    logError(`${name} is not set or still has example value`);
    logInfo(`  Update wrangler.toml [vars] section with your actual domain`);
    return false;
  }
  
  if (!URL_REGEX.test(value)) {
    logWarning(`${name} format looks unusual: ${value}`);
    logInfo(`  Expected format: https://cdn.yourdomain.com`);
    return false;
  }
  
  return true;
}

function validateOrigins(value) {
  if (!value || value.includes('yourstore.com')) {
    logError('ALLOWED_ORIGINS is not set or still has example value');
    logInfo('  Update wrangler.toml with your Shopify domain(s)');
    return false;
  }
  
  const origins = value.split(',').map(o => o.trim());
  let valid = true;
  
  for (const origin of origins) {
    if (!origin.startsWith('https://')) {
      logError(`Invalid origin (must use https): ${origin}`);
      valid = false;
    }
  }
  
  if (origins.length === 0) {
    logError('ALLOWED_ORIGINS is empty');
    valid = false;
  }
  
  return valid;
}

// ============================================================
// MAIN
// ============================================================

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  TRACKLAY - Configuration Validator                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const vars = parseWranglerToml();

// Check account_id
logInfo('Checking Cloudflare account...');
if (!vars.account_id || vars.account_id === 'your-account-id-here') {
  logError('account_id is not set in wrangler.toml');
  logInfo('  Get it from: wrangler whoami');
  logInfo('  Then uncomment and set: account_id = "your-id" in wrangler.toml');
} else {
  logSuccess(`account_id is set: ${vars.account_id.substring(0, 8)}...`);
}

// Check required vars
logInfo('\nChecking required variables...');

if (validateURL(vars.WORKER_BASE_URL, 'WORKER_BASE_URL')) {
  logSuccess('WORKER_BASE_URL is valid');
}

if (validateOrigins(vars.ALLOWED_ORIGINS)) {
  logSuccess(`ALLOWED_ORIGINS: ${vars.ALLOWED_ORIGINS}`);
}

if (validateUUID(vars.OBFUSCATION_FB_UUID, 'OBFUSCATION_FB_UUID')) {
  logSuccess('OBFUSCATION_FB_UUID is valid');
}

if (validateUUID(vars.OBFUSCATION_GA_UUID, 'OBFUSCATION_GA_UUID')) {
  logSuccess('OBFUSCATION_GA_UUID is valid');
}

// Check secrets
console.log('');
checkSecrets();

// Summary
console.log('\n╔════════════════════════════════════════════════════════════╗');
if (errors === 0 && warnings === 0) {
  console.log('║  ✅ All checks passed! Ready to deploy.                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nDeploy with: wrangler deploy\n');
  process.exit(0);
} else if (errors === 0 && warnings > 0) {
  console.log(`║  ⚠️  ${warnings} warning(s) found. Review before deploying.          ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nDeploy with: wrangler deploy\n');
  process.exit(0);
} else {
  console.log(`║  ❌ ${errors} error(s) and ${warnings} warning(s) found.               ║`);
  console.log('║     Fix errors before deploying.                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}
