import { describe, it, expect } from "vitest";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  NadirMetadata,
  Usage,
  Choice,
  Message,
} from "../src/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMPLETION: ChatCompletion = {
  id: "req-abc123",
  object: "chat.completion",
  created: 1711234567,
  model: "gpt-4o-mini",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "The answer is 4." },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 12,
    completion_tokens: 5,
    total_tokens: 17,
  },
  nadir_metadata: {
    strategy: "smart-routing",
    selected_model: "gpt-4o-mini",
    tier: "simple",
    confidence: 0.92,
    complexity_score: 0.15,
    analyzer_used: "trained",
  },
};

const CHUNK: ChatCompletionChunk = {
  id: "req-abc123",
  object: "chat.completion.chunk",
  created: 1711234567,
  model: "gpt-4o-mini",
  choices: [
    {
      index: 0,
      delta: { role: "assistant", content: "Hello" },
      finish_reason: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ChatCompletion type", () => {
  it("should have correct structure", () => {
    expect(COMPLETION.id).toBe("req-abc123");
    expect(COMPLETION.model).toBe("gpt-4o-mini");
    expect(COMPLETION.choices).toHaveLength(1);
    expect(COMPLETION.choices[0].message?.content).toBe("The answer is 4.");
    expect(COMPLETION.choices[0].finish_reason).toBe("stop");
  });

  it("should have usage", () => {
    expect(COMPLETION.usage).toBeDefined();
    expect(COMPLETION.usage!.prompt_tokens).toBe(12);
    expect(COMPLETION.usage!.completion_tokens).toBe(5);
    expect(COMPLETION.usage!.total_tokens).toBe(17);
  });

  it("should have nadir_metadata", () => {
    const meta = COMPLETION.nadir_metadata!;
    expect(meta).toBeDefined();
    expect(meta.tier).toBe("simple");
    expect(meta.confidence).toBe(0.92);
    expect(meta.complexity_score).toBe(0.15);
    expect(meta.selected_model).toBe("gpt-4o-mini");
    expect(meta.analyzer_used).toBe("trained");
    expect(meta.strategy).toBe("smart-routing");
  });

  it("should allow missing metadata", () => {
    const comp: ChatCompletion = {
      id: "req-no-meta",
      object: "chat.completion",
      created: 0,
      model: "gpt-4o",
      choices: [],
    };
    expect(comp.nadir_metadata).toBeUndefined();
    expect(comp.usage).toBeUndefined();
  });
});

describe("ChatCompletionChunk type", () => {
  it("should have delta instead of message", () => {
    expect(CHUNK.choices[0].delta).toBeDefined();
    expect(CHUNK.choices[0].delta!.content).toBe("Hello");
    expect(CHUNK.choices[0].message).toBeUndefined();
  });

  it("should have null finish_reason for non-final chunks", () => {
    expect(CHUNK.choices[0].finish_reason).toBeNull();
  });
});

describe("NadirMetadata type", () => {
  it("should allow extra fields via index signature", () => {
    const meta: NadirMetadata = {
      tier: "complex",
      custom_field: "hello",
      another: 42,
    };
    expect(meta.tier).toBe("complex");
    expect(meta["custom_field"]).toBe("hello");
    expect(meta["another"]).toBe(42);
  });
});

describe("Usage type", () => {
  it("should support optional cache/reasoning tokens", () => {
    const usage: Usage = {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
      reasoning_tokens: 5,
      cache_creation_input_tokens: 8,
      cache_read_input_tokens: 2,
    };
    expect(usage.reasoning_tokens).toBe(5);
    expect(usage.cache_creation_input_tokens).toBe(8);
  });
});

describe("Choice with tool_calls", () => {
  it("should support tool_calls in message", () => {
    const choice: Choice = {
      index: 0,
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "call_1", type: "function", function: { name: "test", arguments: "{}" } }],
      },
      finish_reason: "tool_calls",
    };
    expect(choice.message!.content).toBeNull();
    expect(choice.message!.tool_calls).toHaveLength(1);
    expect(choice.finish_reason).toBe("tool_calls");
  });
});
