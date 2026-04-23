#!/usr/bin/env node
// Smoke-check whether OpenRouter has published the GPT-5.5 / 5.5 Pro slugs yet.
// Usage: node scripts/check-openrouter-models.mjs
// Exits 0 when every target slug is live, 1 otherwise. Safe to wire into cron.

const TARGETS = ['openai/gpt-5.5', 'openai/gpt-5.5-pro'];
const ENDPOINT = 'https://openrouter.ai/api/v1/models';

const res = await fetch(ENDPOINT);
if (!res.ok) {
  console.error(`openrouter /models returned ${res.status} ${res.statusText}`);
  process.exit(2);
}

const { data } = await res.json();
const ids = new Set(data.map((m) => m.id));

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
