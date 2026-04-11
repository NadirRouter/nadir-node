import { describe, it, expect } from "vitest";
import { Stream, parseChatCompletionChunk } from "../src/streaming.js";
import type { ChatCompletionChunk } from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSSEStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const text = lines.join("\n") + "\n";
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Stream", () => {
  it("should parse SSE chunks", async () => {
    const chunk1 = JSON.stringify({
      id: "req-1",
      object: "chat.completion.chunk",
      created: 0,
      model: "gpt-4o-mini",
      choices: [{ index: 0, delta: { role: "assistant", content: "Hello" }, finish_reason: null }],
    });
    const chunk2 = JSON.stringify({
      id: "req-1",
      object: "chat.completion.chunk",
      created: 0,
      model: "gpt-4o-mini",
      choices: [{ index: 0, delta: { content: " world" }, finish_reason: null }],
    });

    const body = createSSEStream([
      `data: ${chunk1}`,
      "",
      `data: ${chunk2}`,
      "",
      "data: [DONE]",
    ]);

    const stream = new Stream<ChatCompletionChunk>(body, parseChatCompletionChunk);
    const chunks: ChatCompletionChunk[] = [];
    for await (const c of stream) {
      chunks.push(c);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0].choices[0].delta?.content).toBe("Hello");
    expect(chunks[1].choices[0].delta?.content).toBe(" world");
  });

  it("should handle empty lines between events", async () => {
    const chunk = JSON.stringify({
      id: "req-1",
      object: "chat.completion.chunk",
      created: 0,
      model: "test",
      choices: [{ index: 0, delta: { content: "hi" }, finish_reason: null }],
    });

    const body = createSSEStream(["", "", `data: ${chunk}`, "", "", "data: [DONE]"]);

    const stream = new Stream<ChatCompletionChunk>(body, parseChatCompletionChunk);
    const chunks: ChatCompletionChunk[] = [];
    for await (const c of stream) {
      chunks.push(c);
    }

    expect(chunks).toHaveLength(1);
  });

  it("should stop at [DONE]", async () => {
    const chunk1 = JSON.stringify({
      id: "req-1",
      object: "chat.completion.chunk",
      created: 0,
      model: "test",
      choices: [{ index: 0, delta: { content: "a" }, finish_reason: null }],
    });
    const chunk2 = JSON.stringify({
      id: "req-1",
      object: "chat.completion.chunk",
      created: 0,
      model: "test",
      choices: [{ index: 0, delta: { content: "b" }, finish_reason: null }],
    });

    // chunk2 comes after [DONE] — should not be yielded
    const body = createSSEStream([`data: ${chunk1}`, "data: [DONE]", `data: ${chunk2}`]);

    const stream = new Stream<ChatCompletionChunk>(body, parseChatCompletionChunk);
    const chunks: ChatCompletionChunk[] = [];
    for await (const c of stream) {
      chunks.push(c);
    }

    expect(chunks).toHaveLength(1);
    expect(chunks[0].choices[0].delta?.content).toBe("a");
  });
});

describe("parseChatCompletionChunk", () => {
  it("should pass through data as-is", () => {
    const data = { id: "test", object: "chunk", created: 0, model: "m", choices: [] };
    const result = parseChatCompletionChunk(data);
    expect(result).toBe(data);
  });
});
