# Nadir Node.js SDK

Official Node.js/TypeScript client for the [Nadir](https://getnadir.dev) LLM router — intelligent model routing that cuts API costs 30-60%.

## Installation

```bash
npm install nadir-sdk
```

## Quick Start

```typescript
import { NadirClient } from "nadir-sdk";

const client = new NadirClient({ apiKey: "ndr_..." });

// Chat completion — Nadir picks the optimal model
const response = await client.chat.completions.create({
  messages: [{ role: "user", content: "What is 2+2?" }],
});
console.log(response.choices[0].message?.content);

// See which model was selected and why
console.log(response.nadir_metadata?.tier);             // "simple"
console.log(response.nadir_metadata?.selected_model);   // "gpt-4o-mini"
console.log(response.nadir_metadata?.complexity_score);  // 0.12
```

## Streaming

```typescript
const stream = await client.chat.completions.create({
  messages: [{ role: "user", content: "Tell me a story" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
```

## Model Recommendation (no LLM call)

```typescript
const rec = await client.recommend({
  prompt: "Explain quantum entanglement in detail",
});
console.log(rec);
```

## Advanced: Fallback & Routing Control

```typescript
const response = await client.chat.completions.create({
  messages: [{ role: "user", content: "Complex analysis..." }],
  route: "fallback",                              // enable auto-fallback
  fallback_models: ["claude-sonnet-4-20250514", "gpt-4o"],  // explicit fallback chain
  layers: { routing: true, optimize: true },        // per-request feature toggles
  reasoning: { effort: "high" },                   // reasoning token support
});
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NADIR_API_KEY` | API key (fallback if not passed to constructor) | — |
| `NADIR_BASE_URL` | API base URL | `https://api.getnadir.dev` |

## OpenAI Drop-in Compatibility

Nadir's API is OpenAI-compatible. You can also use the OpenAI SDK directly:

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.getnadir.dev/v1",
  apiKey: "ndr_...",
});

const response = await client.chat.completions.create({
  model: "auto",
  messages: [{ role: "user", content: "Hello" }],
});
```

The Nadir SDK adds typed access to routing metadata, recommendations, smart export, and clustering that the OpenAI SDK can't reach.

## Requirements

- Node.js >= 18 (uses native `fetch`)
- Zero runtime dependencies
