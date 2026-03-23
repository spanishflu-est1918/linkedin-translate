import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : "true"];
  }),
);

const corpusPath = resolve(args.corpus ?? "benchmark/linkedin-posts.jsonl");
const baselinePath = resolve(args.baseline ?? "benchmark/prompt-baseline.txt");
const revisedPath = resolve(args.revised ?? "benchmark/prompt-revised.txt");
const outPath = resolve(args.out ?? "benchmark/results/prompt-benchmark.json");
const model = args.model ?? "sonnet";
const limit = args.limit ? Number(args.limit) : Number.POSITIVE_INFINITY;
const judge = args.judge !== "false";

const corpus = readFileSync(corpusPath, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .slice(0, limit)
  .map((line) => JSON.parse(line));

const prompts = {
  baseline: readFileSync(baselinePath, "utf8"),
  revised: readFileSync(revisedPath, "utf8"),
};

function runClaude({ systemPrompt, userPrompt }) {
  const result = spawnSync(
    "claude",
    [
      "-p",
      "--model",
      model,
      "--output-format",
      "text",
      "--system-prompt",
      systemPrompt,
      userPrompt,
    ],
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || `claude exited with status ${result.status}`);
  }

  return result.stdout.trim();
}

function parseJsonObject(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function judgePair(item, baseline, revised) {
  const prompt = [
    "Evaluate two short translations of the same LinkedIn post.",
    "Return ONLY JSON with this shape:",
    '{"winner":"baseline|revised|tie","baseline":{"accuracy":1,"humor":1,"brevity":1,"kindness":1,"point_capture":1},"revised":{"accuracy":1,"humor":1,"brevity":1,"kindness":1,"point_capture":1},"notes":"<=160 chars"}',
    "Scoring rules:",
    "- accuracy: true to the post's implied meaning",
    "- humor: funny without forcing it",
    "- brevity: compact and punchy",
    "- kindness: calibrated; 5 means tone fits the post, including being gentle when warranted",
    "- point_capture: catches the main subtext or sincere core",
    "",
    `POST: ${item.excerpt}`,
    `BASELINE: ${baseline}`,
    `REVISED: ${revised}`,
  ].join("\n");

  const raw = runClaude({
    systemPrompt: "You are a strict evaluator. Output JSON only.",
    userPrompt: prompt,
  });

  return parseJsonObject(raw) ?? {
    winner: "tie",
    baseline: { accuracy: 0, humor: 0, brevity: 0, kindness: 0, point_capture: 0 },
    revised: { accuracy: 0, humor: 0, brevity: 0, kindness: 0, point_capture: 0 },
    notes: `Judge parse failed: ${raw.slice(0, 160)}`,
  };
}

const results = corpus.map((item, index) => {
  const userPrompt = item.excerpt;
  const baseline = runClaude({ systemPrompt: prompts.baseline, userPrompt });
  const revised = runClaude({ systemPrompt: prompts.revised, userPrompt });
  const evaluation = judge ? judgePair(item, baseline, revised) : null;

  console.error(`processed ${index + 1}/${corpus.length}: #${item.id} ${item.cluster}`);

  return {
    ...item,
    outputs: { baseline, revised },
    evaluation,
  };
});

const aggregate = results.reduce(
  (acc, item) => {
    if (!item.evaluation) return acc;

    for (const variant of ["baseline", "revised"]) {
      const scores = item.evaluation[variant];
      for (const key of Object.keys(scores)) {
        acc[variant][key] += scores[key];
      }
    }

    acc.wins[item.evaluation.winner] = (acc.wins[item.evaluation.winner] ?? 0) + 1;
    return acc;
  },
  {
    baseline: { accuracy: 0, humor: 0, brevity: 0, kindness: 0, point_capture: 0 },
    revised: { accuracy: 0, humor: 0, brevity: 0, kindness: 0, point_capture: 0 },
    wins: { baseline: 0, revised: 0, tie: 0 },
  },
);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      model,
      corpusSize: results.length,
      aggregate,
      results,
    },
    null,
    2,
  )}\n`,
);

console.log(outPath);
