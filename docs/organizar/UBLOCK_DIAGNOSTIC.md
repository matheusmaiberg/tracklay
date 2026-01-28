# uBlock Origin Diagnostic Guide

## Immediate Action Required

### Step 1: Open uBlock Origin Logger (CRITICAL)

This will show EXACTLY what uBlock is blocking and why:

1. Click uBlock Origin icon in browser toolbar
2. Click "Open the logger" (⏱️ icon)
3. Refresh the page `suevich.com`
4. Look for entries containing:
   - `cdn.suevich.com`
   - `b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f`
   - `/cdn/g/`

**What to look for:**
- 🔴 Red entries = blocked by filter
- 🟢 Green entries = allowed
- Filter name shows which rule blocked it

### Step 2: Check Network Tab

Open DevTools → Network tab:

1. Filter by "suevich" or "cdn.suevich.com"
2. Refresh page
3. Look for these requests:

**Expected Script Load:**
```
GET https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?c=MJ7DW8H
Type: script
Status: 200 or blocked?
```

**Expected Tracking Requests:**
```
GET https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?v=2&tid=G-XXXXX...
Type: xhr or fetch
Status: 200 or blocked?
```

### Step 3: Check Console for JavaScript Errors

Look for errors like:
- `Failed to load resource` - means script/request blocked
- `GTM initialization error` - means GTM failed to start
- `CORS error` - means CORS headers issue (should be fixed)

## Diagnosis Decision Tree

### Scenario A: Script Load Shows as Blocked
**Symptoms:** uBlock logger shows script load blocked, Network tab shows red/failed request

**Root Cause:** uBlock filter pattern matches script URL

**Likely Filter Patterns Matching:**
```
/cdn/g/*$script
?c=$script,1p
/cdn/*?c=*$script
```

**Solution:** Change obfuscation strategy:
1. Remove query parameter: Use `/cdn/assets/js-{UUID}.js` instead
2. Change path pattern: Use `/static/lib/{UUID}` instead of `/cdn/g/`
3. Use different domain: `assets.suevich.com` instead of `cdn.suevich.com`

### Scenario B: Script Loads, But Tracking Blocked
**Symptoms:** Script load succeeds (200), but tracking requests don't appear or are blocked

**Root Cause:** uBlock filter blocks tracking fetch/XHR requests

**Likely Filter Patterns Matching:**
```
?v=2&tid=$xhr,1p
?_p=$xhr
/cdn/g/*?v=2$xhr
```

**Solution:** Change tracking request format:
1. Use POST instead of GET
2. Change query parameter names
3. Use different path for tracking vs script loading

### Scenario C: Nothing Appears (Current State)
**Symptoms:** No script load visible, no tracking visible, nothing in Network tab

**Root Cause:** Either script blocked before loading OR GTM not initializing

**Immediate Verification Needed:**
1. Check uBlock logger (will show if blocked)
2. Check if GTM container loads at all
3. Verify Shopify Custom Pixel is loading GTM script

### Scenario D: JavaScript Errors
**Symptoms:** Script loads, but console shows GTM errors

**Root Cause:** GTM initialization fails (possibly due to sandboxed context)

**Solution:** Check CORS, CSP, and sandboxed iframe compatibility

## Testing Commands

### Test 1: Verify Worker Endpoint (with uBlock disabled)
```bash
# From browser console (uBlock OFF):
fetch('https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?c=MJ7DW8H')
  .then(r => r.text())
  .then(t => console.log(t.length + ' bytes loaded'));

# Expected: Should show script size (e.g., "31000 bytes loaded")
```

### Test 2: Verify Worker Endpoint (with uBlock enabled)
```bash
# From browser console (uBlock ON):
fetch('https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?c=MJ7DW8H')
  .then(r => r.text())
  .then(t => console.log(t.length + ' bytes loaded'))
  .catch(e => console.error('Blocked:', e));

# Expected: Either loads successfully or shows "Blocked" error
```

### Test 3: Check GTM Data Layer
```bash
# From browser console:
console.log(window.dataLayer);
console.log(window.google_tag_manager);

# Expected: Should show dataLayer array and GTM object
# If undefined: GTM not initialized
```

## Expected vs Current Behavior

### Expected with uBlock DISABLED ✅
- ✅ GTM script loads from Worker (`cdn.suevich.com`)
- ✅ Tracking hits go to Worker endpoint
- ✅ All requests show in Network tab

### Expected with uBlock ENABLED (target) 🎯
- ✅ GTM script loads from Worker (first-party should pass)
- ✅ Tracking hits go to Worker (first-party should pass)
- ✅ All requests successful (no Google domains)
- ✅ ~95% ad-blocker bypass

### Current Reality with uBlock ENABLED ❌
- ❓ GTM script: Unknown if loading or blocked
- ❌ Tracking hits: Not visible in console
- ❌ Network tab: No Worker requests visible
- ❌ Status: Not working, needs diagnosis

## Potential Solutions by Scenario

### If Path Pattern `/cdn/g/` Is Detected:

**Option 1: Change to generic path**
```javascript
// Current:
/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f

// New:
/static/js/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f.js
```

**Option 2: Remove UUID, use hash**
```javascript
// Current:
/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f

// New:
/cdn/lib/7f8d5b0c.js  // Short hash
```

### If Query Parameter `?c=` Is Detected:

**Option 1: Remove query parameter**
```javascript
// Current:
?c=MJ7DW8H

// New: Embed in path
/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f/MJ7DW8H
```

**Option 2: Use generic parameter**
```javascript
// Current:
?c=MJ7DW8H

// New:
?v=MJ7DW8H  // Generic version parameter
```

### If Tracking Parameters Are Detected:

**Option 1: Use POST for tracking**
```javascript
// Current: GET with query params
GET /cdn/g/UUID?v=2&tid=G-XXX&_p=123

// New: POST with body
POST /cdn/g/UUID
Body: { v: 2, tid: "G-XXX", _p: 123 }
```

**Option 2: Change parameter names**
```javascript
// Current (detectable):
?v=2&tid=G-XXX&_p=123

// New (obfuscated):
?x=2&y=G-XXX&z=123
```

## Critical Finding: GTM Container Config

I found the Worker URL **hardcoded in the GTM container data**:

```javascript
"vtp_value":"https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f"
```

This suggests:
1. ✅ Manual GTM configuration is active (server_container_url set)
2. ✅ This is GOOD - means transport_url is configured
3. ⚠️ BUT might indicate automatic injection is redundant

**Verification Needed:**
- Check GTM Web Container settings
- Verify if `server_container_url` variable exists
- Confirm if automatic injection is needed or if manual config is sufficient

## Next Steps

1. **RUN uBlock Origin Logger** - This is CRITICAL to understand blocking
2. **Check Network Tab** - Verify if script loads or is blocked
3. **Test in Console** - Run fetch commands to test Worker endpoint
4. **Report findings** - Share uBlock logger output and Network tab screenshots

## Quick Win: Temporary Disable for Testing

To isolate the issue:
1. Disable uBlock Origin completely
2. Verify tracking works
3. Enable uBlock Origin
4. Check logger to see what gets blocked
5. Adjust obfuscation strategy based on logger output

This will show EXACTLY which filters are matching and why.
