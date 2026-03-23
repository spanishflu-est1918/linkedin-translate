let API_URL = "https://linkedin-translate.spanishflu.workers.dev";
chrome.storage.sync.get("apiUrl", (data) => {
  if (data.apiUrl) API_URL = data.apiUrl;
});

// Cache: postText hash → translation (survives page navigations via session storage)
const CACHE_KEY = "lt-cache";
function getCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function setCache(key, value) {
  const cache = getCache();
  cache[key] = value;
  // Keep cache from growing unbounded — max 200 entries
  const keys = Object.keys(cache);
  if (keys.length > 200) {
    keys.slice(0, keys.length - 200).forEach((k) => delete cache[k]);
  }
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
function hashText(text) {
  // Simple fast hash for cache keys
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return String(h);
}

const PROCESSED = new WeakSet();

function getPostTextElement(post) {
  return post.querySelector(
    ".feed-shared-update-v2__description, " +
      ".feed-shared-inline-show-more-text, " +
      ".feed-shared-text, " +
      '[data-ad-preview="message"]'
  );
}

function expandPost(post) {
  const seeMore = post.querySelector(
    ".feed-shared-inline-show-more-text--expand-button, " +
      'button[aria-label*="see more"], ' +
      'button[aria-label*="ver más"], ' +
      ".feed-shared-text__see-more"
  );
  if (seeMore) seeMore.click();
}

function getPostText(textEl) {
  if (!textEl) return "";
  const clone = textEl.cloneNode(true);
  clone.querySelectorAll("button").forEach((btn) => btn.remove());
  return clone.innerText.trim();
}

async function translatePost(text) {
  const key = hashText(text);
  const cached = getCache()[key];
  if (cached) return cached;

  const res = await fetch(`${API_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  setCache(key, data.translation);
  return data.translation;
}

function copyStyles(source, target) {
  const computed = window.getComputedStyle(source);
  target.style.fontFamily = computed.fontFamily;
  target.style.fontSize = computed.fontSize;
  target.style.fontWeight = computed.fontWeight;
  target.style.lineHeight = computed.lineHeight;
  target.style.color = computed.color;
  target.style.letterSpacing = computed.letterSpacing;
  target.style.wordSpacing = computed.wordSpacing;
}

async function processPost(post) {
  if (PROCESSED.has(post)) return;
  PROCESSED.add(post);

  expandPost(post);
  await new Promise((r) => setTimeout(r, 300));

  const textEl = getPostTextElement(post);
  if (!textEl) return;

  const text = getPostText(textEl);
  if (!text || text.length < 40) return;

  try {
    const translation = await translatePost(text);

    const overlay = document.createElement("div");
    overlay.className = "lt-overlay";

    const label = document.createElement("div");
    label.className = "lt-overlay__label";
    label.textContent = "translated to human";

    const content = document.createElement("span");
    content.className = "lt-overlay__content";
    content.textContent = translation;
    copyStyles(textEl, content);

    overlay.append(label, content);

    const container = textEl.parentElement;
    container.style.position = "relative";
    container.appendChild(overlay);

    container.addEventListener("mouseenter", () => {
      overlay.classList.add("lt-overlay--visible");
    });
    container.addEventListener("mouseleave", () => {
      overlay.classList.remove("lt-overlay--visible");
    });
  } catch (err) {
    console.error("LinkedIn Translator:", err);
  }
}

function scanPosts() {
  const posts = document.querySelectorAll(
    ".feed-shared-update-v2, .occludable-update"
  );
  posts.forEach(processPost);
}

scanPosts();

const observer = new MutationObserver(() => {
  scanPosts();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

console.log("LinkedIn Translator: loaded ✓");
