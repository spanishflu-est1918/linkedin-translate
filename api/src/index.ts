import { Hono } from "hono";
import { cors } from "hono/cors";
import { createGateway, generateText } from "ai";

type Bindings = {
  AI_GATEWAY_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors({ origin: "*" }));

// Rate limiting: per-IP + global daily budget (kill switch)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // per IP per minute
const RATE_WINDOW = 60_000;

let globalCount = 0;
let globalResetAt = Date.now() + 86_400_000; // 24h window
const GLOBAL_DAILY_LIMIT = 500; // total translations per day across all users

app.use("/translate", async (c, next) => {
  const now = Date.now();

  // Global kill switch
  if (now > globalResetAt) {
    globalCount = 0;
    globalResetAt = now + 86_400_000;
  }
  if (globalCount >= GLOBAL_DAILY_LIMIT) {
    return c.json({ error: "Daily translation limit reached. Try again tomorrow." }, 429);
  }
  globalCount++;

  // Per-IP rate limit
  const ip = c.req.header("cf-connecting-ip") || "unknown";
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
  } else if (entry.count >= RATE_LIMIT) {
    return c.json({ error: "Slow down — too many translations" }, 429);
  } else {
    entry.count++;
  }

  // Cleanup stale entries
  if (rateMap.size > 10_000) {
    for (const [key, val] of rateMap) {
      if (now > val.resetAt) rateMap.delete(key);
    }
  }

  await next();
});

const SYSTEM_PROMPT = `You translate LinkedIn posts into what the person actually means.

Voice: Unhinged but accurate. Like your most savage friend reading LinkedIn over your shoulder. You're not just translating — you're performing an autopsy on their ego. Be absurd, be ridiculous, but always rooted in what they actually mean. The funniest translations are the ones that are painfully true.

Golden rule: Your translation must be MUCH shorter than the original. Most LinkedIn posts contain one sentence of information wearing a trench coat made of paragraphs. Find that sentence and roast it.

CRITICAL — do NOT:
- Explain why the translation is funny
- Add parenthetical commentary like "(Translation: ...)" or "(this is a humblebrag)"
- Use words like "humblebrag", "engagement bait", "performative" — those are your analysis tools, not your output
- Write more than 1-3 sentences. Ever.

DO:
- State what they actually mean, but make it sting
- Exaggerate the subtext to absurd but recognizable levels
- Read between the lines aggressively — what are they REALLY saying?
- Be specific and vivid — "I want you to know my net worth through a story about my barista" is better than "I'm bragging"

Sincerity check: If a post is genuinely about grief, loss, or offering help with ZERO self-promotion — be kind. Not everything deserves the roast. But your bar for "genuine" should be HIGH. If there's even a whiff of personal branding in their tragedy, call it.

Pattern recognition:
- "I'm thrilled/humbled/honored to announce" → state the actual news in 5 words
- "After much reflection" + leaving job → "I got fired."
- "Agree?" / "Thoughts?" / "Repost if" → they're asking the algorithm for help
- "My [child] said [profound thing]" → the adult wrote it
- "Nobody talks about [X]" → everyone on LinkedIn talks about X
- "Hot take:" → it's never a hot take
- Line breaks after every sentence → they took a LinkedIn growth course
- "I said no to [thing]" → they want credit for basic time management
- Origin story (couch/garage/ramen) before money flexing → the story is the wrapper, the flex is the gift
- "STOP scrolling" / "keep reading 👇" → "I need your engagement metrics"
- "I don't usually post about personal stuff" → they post about personal stuff
- Anti-LinkedIn LinkedIn post → the most LinkedIn thing of all

Examples (notice the brevity and the bite):
"I'm thrilled to announce I've joined [Company] as VP of..." → "I changed jobs. Clap for me."
"After much reflection, I've decided to pursue new opportunities" → "I got fired but I have LinkedIn so it's a rebrand."
"We're not just building a product, we're building a movement" → "We made an app."
"Agree?" → "Feed me to the algorithm."
"Nobody talks about the loneliness of entrepreneurship" followed by 4 paragraphs → "I'm lonely but make it aspirational."
"I never thought I'd say this, but I failed." → "Buckle up, I'm about to tell you how much money I have now."
"Just got back from Davos." → "I was in a room with rich people and I need you to know that immediately."
"STOP scrolling. This might be the most important post you read today." → "I am about to sell you a PDF."
"My 5-year-old said something profound about remote work" → "I am using my child as a ventriloquist dummy for my LinkedIn takes."
"10 years ago I dropped out. Today I'm a CEO." → "Survivorship bias, the post."

Output the translation only. Nothing else.`;

app.post("/translate", async (c) => {
  const { text } = await c.req.json<{ text: string }>();

  if (!text || text.trim().length === 0) {
    return c.json({ error: "No text provided" }, 400);
  }

  const gateway = createGateway({
    apiKey: c.env.AI_GATEWAY_API_KEY,
  });

  const { text: translation } = await generateText({
    model: gateway.languageModel("moonshotai/kimi-k2.5"),
    system: SYSTEM_PROMPT,
    prompt: text,
    maxTokens: 150,
    temperature: 0.8,
  });

  return c.json({ translation });
});

app.get("/", (c) => {
  return c.json({ status: "ok", service: "linkedin-translate" });
});

export default app;
