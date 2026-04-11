import type { ChatCompletionChunk } from "./types.js";

/**
 * Async iterable wrapper around an SSE response stream.
 *
 * Usage:
 * ```ts
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
 * }
 * ```
 */
export class Stream<T> implements AsyncIterable<T> {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder = new TextDecoder();
  private buffer = "";
  private done = false;
  private parse: (data: unknown) => T;

  constructor(
    body: ReadableStream<Uint8Array>,
    parse: (data: unknown) => T,
  ) {
    this.reader = body.getReader();
    this.parse = parse;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    try {
      while (!this.done) {
        const { value, done } = await this.reader.read();
        if (done) {
          this.done = true;
          // Process any remaining buffer
          yield* this.processBuffer(true);
          break;
        }

        this.buffer += this.decoder.decode(value, { stream: true });
        yield* this.processBuffer(false);
      }
    } finally {
      this.reader.releaseLock();
    }
  }

  private *processBuffer(flush: boolean): Generator<T> {
    const lines = this.buffer.split("\n");

    // Keep the last incomplete line in the buffer (unless flushing)
    if (!flush) {
      this.buffer = lines.pop() ?? "";
    } else {
      this.buffer = "";
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) {
        continue;
      }
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") {
        this.done = true;
        return;
      }
      try {
        const data = JSON.parse(payload);
        yield this.parse(data);
      } catch {
        // Skip malformed JSON lines
      }
    }
  }
}

/** Identity parser for ChatCompletionChunk (the API returns the correct shape). */
export function parseChatCompletionChunk(data: unknown): ChatCompletionChunk {
  return data as ChatCompletionChunk;
}
