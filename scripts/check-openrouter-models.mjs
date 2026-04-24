#!/usr/bin/env node
// Smoke-check whether OpenRouter has published the GPT-5.5 / 5.5 Pro slugs yet.
// Usage: node scripts/check-openrouter-models.mjs
// Exit codes: 0 = all slugs live, 1 = request ok but slug(s) missing,
// 2 = transport/parse/shape failure (distinct so cron can't misread as "not live").

const TARGETS = ['openai/gpt-5.5', 'openai/gpt-5.5-pro'];
const ENDPOINT = 'https://openrouter.ai/api/v1/models';

let res;
try {
  res = await fetch(ENDPOINT);
} catch (err) {
  console.error(`openrouter /models fetch failed: ${err.message}`);
  process.exit(2);
}

if (!res.ok) {
  console.error(`openrouter /models returned ${res.status} ${res.statusText}`);
  process.exit(2);
}

let json;
try {
  json = await res.json();
} catch (err) {
  console.error(`openrouter /models returned non-JSON body: ${err.message}`);
  process.exit(2);
}

if (!Array.isArray(json?.data)) {
  console.error('openrouter /models response missing `data` array');
  process.exit(2);
}

const ids = new Set(json.data.map((m) => m.id));

let allLive = true;
for (const slug of TARGETS) {
  if (ids.has(slug)) {
    console.log(`\u2713 ${slug} is live`);
  } else {
    console.log(`\u2717 ${slug} not yet published`);
    allLive = false;
  }
}

process.exit(allLive ? 0 : 1);
