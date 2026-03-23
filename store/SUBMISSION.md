# Chrome Web Store Submission Guide

Everything is prepared. This is a one-click checklist for the board to complete submission.

---

## Pre-submission checklist

### 1. Extension package

Pack the extension:
1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Pack extension**
4. **Extension root directory**: select `/Users/gorkolas/www/linkedin-translate/extension`
5. Leave **Private key file** empty for first pack (Chrome will generate a `.pem` — save it for future updates)
6. Click **Pack Extension**
7. Chrome creates `extension.crx` and `extension.pem` in the parent directory — keep the `.pem` somewhere safe

Alternatively, for CWS submission you upload the folder as a `.zip`:
```bash
cd /Users/gorkolas/www/linkedin-translate
zip -r extension.zip extension/ -x "*.DS_Store"
```
Upload the `.zip` directly — CWS does not need a `.crx`.

---

### 2. Screenshots (required: at least 1, max 5)

Open each HTML file in Chrome, set window to the exact size, and screenshot:

| File | Viewport | Output |
|------|----------|--------|
| `store/screenshots/01-translation-hover.html` | 1280×800 | `screenshot-1.png` |
| `store/screenshots/02-feed-overview.html` | 1280×800 | `screenshot-2.png` |
| `store/screenshots/03-popup.html` | 640×400 | `screenshot-3.png` |

**How to set exact viewport in Chrome:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Enter exact dimensions in the viewport fields
4. Use Cmd+Shift+P → "Capture screenshot" for pixel-perfect output

---

### 3. Promotional images (optional but recommended)

| File | Viewport | Output |
|------|----------|--------|
| `store/promo/small-440x280.html` | 440×280 | `promo-small.png` |
| `store/promo/large-920x680.html` | 920×680 | `promo-large.png` |

---

### 4. Privacy policy

Host `store/privacy-policy.html` at a public URL. Options:
- **GitHub Pages**: push to `gh-pages` branch, URL will be `https://spanishflu-est1918.github.io/linkedin-translate/privacy-policy.html`
- **Cloudflare Pages / Workers**: serve as a static file alongside the API
- Any public URL works

---

## Chrome Web Store developer account

URL: https://chrome.google.com/webstore/devconsole
One-time $5 developer fee if not already registered.

---

## Store listing fields

### Category
**Productivity**

### Language
English (United States)

### Short description (132 chars max)
```
Translates LinkedIn corporate speak into what people actually mean. Hover any post for an honest interpretation.
```

### Detailed description
See `store/description.txt` — copy the "DETAILED DESCRIPTION" section.

### Privacy policy URL
Your hosted URL for `store/privacy-policy.html`

### Homepage URL
`https://github.com/spanishflu-est1918/linkedin-translate`

---

## Permissions justification (required by CWS review)

When prompted, explain each permission:

| Permission | Justification |
|-----------|---------------|
| `storage` | Saves user's custom API URL preference via chrome.storage.sync |
| `host_permissions: linkedin.com` | Content script must run on LinkedIn to read post text for translation |

---

## What the review team checks

- ✅ manifest_version 3 (done)
- ✅ No remote code execution (no eval, no external scripts loaded)
- ✅ Minimal permissions — only `storage` and `linkedin.com`
- ✅ Single purpose — translate LinkedIn posts
- ✅ Privacy policy present
- ✅ Description matches actual functionality

Expected review time: 1–7 business days for new extensions.

---

## Post-submission

After the extension is live, update `content.js` line 1 with the production URL (already set to `https://linkedin-translate.spanishflu.workers.dev`). No changes needed.
