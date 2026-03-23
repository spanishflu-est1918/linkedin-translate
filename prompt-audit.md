# Prompt Audit

## Scope

- Corpus: 50 public LinkedIn post excerpts in [`benchmark/linkedin-posts.jsonl`](benchmark/linkedin-posts.jsonl)
- Baseline prompt: [`benchmark/prompt-baseline.txt`](benchmark/prompt-baseline.txt)
- Revised prompt: [`benchmark/prompt-revised.txt`](benchmark/prompt-revised.txt)
- Harness: [`scripts/prompt-benchmark.mjs`](scripts/prompt-benchmark.mjs)

The corpus is intentionally mixed:

- career updates and title flexes
- self-aware parody
- algorithm bait
- pseudo-vulnerable leadership posts
- genuinely helpful or personal posts that should not get nuked

## What The Current Prompt Gets Wrong

1. It over-rewards meanness.
The baseline prompt is good at spotting vanity, but it reaches for a roast even when the honest translation should just be plain, clipped, and mildly skeptical.

2. It is too loose on output length.
`1-3 sentences` still produces flabby outputs. The product is strongest when the answer feels like a brutal caption, not a mini bit.

3. It confuses format with motive.
The current pattern list anchors on clichés like line breaks and `STOP scrolling`, but the real target is motive: applause, authority, recruiting, validation, or a sincere attempt to help.

4. It mishandles sincere edge cases.
Posts about layoffs, illness, fundraising, or family hardship need a gentler fallback. The baseline prompt has a sincerity clause, but the threshold is vague and invites needless cruelty.

5. It can over-roast already self-aware posts.
Some public LinkedIn posts are already parodying the platform. The product should join the joke or translate the honest premise, not miss the self-awareness and swing twice.

6. It occasionally invents a stronger claim than the text supports.
`After much reflection` does not always mean `I got fired.` Sometimes it means retirement, a planned break, or someone trying to control the narrative. The revision tightens this from false certainty to reasonable inference.

## Revised Prompt Goals

- Default to one sentence and enforce a real word ceiling.
- Target motives and subtext, not just surface tropes.
- Improve calibration on genuine-help and genuine-loss posts.
- Preserve bite on vanity posts without turning every answer into the same joke.
- Handle satire and self-awareness as special cases.

## Corpus Notes

- Strong vanity cases: ids 1, 6, 9, 11, 15, 21, 24, 41, 42, 47
- Self-aware / parody cases: ids 7, 12, 14, 45, 50
- Genuine-help cases: ids 27, 31, 32, 33, 34, 35, 36, 37, 38, 40
- Mixed sincerity + branding: ids 5, 22, 25, 39, 48, 49

## Manual Before/After Read

Representative examples from the 50-post set:

1. Id 9 (`I'm thrilled to announce that I will have an announcement sometime soon`)
- Baseline tends to explain the absurdity.
- Revised prompt should collapse it to the honest core fast.
- Target style: `I would like pre-hype for my future hype.`

2. Id 27 (breast cancer fundraiser)
- Baseline risks snark because it sees `I don't usually post about personal stuff`.
- Revised prompt should stay kind and plain.
- Target style: `A friend got sick, and we’re raising money to help.`

3. Id 31 (laid-off advice)
- Baseline can over-translate into cynicism.
- Revised prompt should keep the tenderness and practical advice intact.
- Target style: `Being laid off hurts, and this is hard-earned advice.`

4. Id 12 (engagement pod parody)
- Baseline may roast the fake vanity at face value.
- Revised prompt explicitly recognizes self-aware posts.
- Target style: `I’m making fun of fake engagement farming because we all know it’s real.`

5. Id 1 (dramatic award announcement)
- Baseline has the right instinct but can run long.
- Revised prompt should stay shorter and sharper.
- Target style: `Please admire how casually I can announce this achievement.`

## Smoke Benchmark

A 2-post smoke run is saved at [`benchmark/results/prompt-benchmark-smoke.json`](benchmark/results/prompt-benchmark-smoke.json).

Early signal:

- On obvious vanity bait, the baseline prompt still wins when it lands a single brutal image.
- On ambiguous `after much reflection` posts, the revised prompt is safer because it avoids hallucinating `I got fired`.

That means the next iteration should keep the revised sincerity calibration while restoring some of the baseline's compression on pure applause farming.

## Full Benchmark

The full 50-post run is saved at [`benchmark/results/prompt-benchmark.json`](benchmark/results/prompt-benchmark.json).

Aggregate result:

- Revised wins: 32
- Baseline wins: 18
- Tie: 0

Rubric totals:

- Accuracy: baseline 169, revised 203
- Humor: baseline 168, revised 166
- Brevity: baseline 230, revised 221
- Kindness: baseline 148, revised 162
- Point capture: baseline 170, revised 209

Interpretation:

- The revised prompt is materially better at fairness and at catching the actual point of the post.
- The baseline prompt is still slightly funnier on the loudest vanity bait because it compresses harder and reaches cleaner images faster.
- The revised prompt's weak spot was over-reading sincere help/advice posts as covert self-promotion.

## Post-Benchmark Prompt Tuning

After the full run, I tightened the revised prompt in two places:

- Added a stronger rule against inventing cynical motives like firing, monetization, guruism, or grifting unless the post actually supports them.
- Added a stronger rule for concrete help/advice/fundraising posts: preserve the practical core first, ego second.

Targeted validation after that change:

- Loss subset rerun: [`benchmark/results/prompt-benchmark-loss-subset.json`](benchmark/results/prompt-benchmark-loss-subset.json)
- Result: revised wins 5 of 6 on the selected baseline-win cases
- Specific layoff-advice recheck: [`benchmark/results/prompt-benchmark-id31.json`](benchmark/results/prompt-benchmark-id31.json)
- Result: revised flips that case too

Current read:

- The prompt is now in a good default-shipping state.
- If there is another iteration, it should be about recovering a little more baseline-style punch on obvious applause farming without loosening sincerity calibration again.

## Voices

Multiple voices are worth offering, but not yet in the core prompt.

Recommended future presets:

- `savage`: maximum bite, default for screenshots and virality
- `mild`: same honesty, less acid, safer for sincere-adjacent posts
- `human`: strips jargon without trying to be funny

The product should first nail one canonical default. Right now the default needs calibration more than variety.

## How To Run The Benchmark

```bash
node scripts/prompt-benchmark.mjs \
  --corpus=benchmark/linkedin-posts.jsonl \
  --baseline=benchmark/prompt-baseline.txt \
  --revised=benchmark/prompt-revised.txt \
  --out=benchmark/results/prompt-benchmark.json
```

Notes:

- The harness uses the local `claude` CLI so it can run in this workspace without adding app code dependencies.
- Each corpus row produces a baseline output, a revised output, and a model-judge comparison.
- The output file includes per-post results plus aggregate win counts and summed rubric scores.

## Status

- Corpus assembled: yes
- Revised prompt drafted: yes
- App prompt updated: yes
- Automated full 50-post benchmark: yes
- Loss-case rerun after prompt tightening: yes

The next clean step is optional polish: keep the current prompt as default, then explore separate `savage` and `mild` voice presets without weakening the core default calibration.
