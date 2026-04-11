/**
 * Nadir Node.js SDK — OpenAI-compatible client for the Nadir LLM router.
 *
 * @example
 * ```ts
 * import { NadirClient } from "nadir-sdk";
 *
 * const client = new NadirClient({ apiKey: "ndr_..." });
 *
 * // Chat completion — Nadir picks the optimal model
 * const response = await client.chat.completions.create({
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * console.log(response.choices[0].message?.content);
 *
 * // Streaming
 * const stream = await client.chat.completions.create({
 *   messages: [{ role: "user", content: "Tell me a story" }],
 *   stream: true,
 * });
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
 * }
 * ```
 */

import {
  APIError,
  AuthenticationError,
  ConnectionError,
  RateLimitError,
} from "./errors.js";
import { Stream, parseChatCompletionChunk } from "./streaming.js";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  CreateClusterParams,
  CreateOrganizationParams,
  RecommendParams,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.getnadir.dev";
const SDK_VERSION = "0.1.0";

// ---------------------------------------------------------------------------
// Client options
// ---------------------------------------------------------------------------

export interface NadirClientOptions {
  /** Nadir API key (`ndr_...`). Falls back to `NADIR_API_KEY` env var. */
  apiKey?: string;
  /** API base URL. Falls back to `NADIR_BASE_URL` env var. */
  baseURL?: string;
  /** Request timeout in milliseconds (default 120_000). */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Namespace classes
// ---------------------------------------------------------------------------

class Completions {
  constructor(private client: NadirClient) {}

  /** Create a chat completion (non-streaming). */
  async create(
    params: ChatCompletionCreateParams & { stream?: false },
  ): Promise<ChatCompletion>;
  /** Create a streaming chat completion. */
  async create(
    params: ChatCompletionCreateParams & { stream: true },
  ): Promise<Stream<ChatCompletionChunk>>;
  /** Create a chat completion (overload resolution). */
  async create(
    params: ChatCompletionCreateParams,
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
  async create(
    params: ChatCompletionCreateParams,
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
    if (params.stream) {
      const response = await this.client._rawRequest(
        "POST",
        "/v1/chat/completions",
        params,
      );

      if (!response.body) {
        throw new ConnectionError("Response body is null — streaming not supported");
      }

      return new Stream<ChatCompletionChunk>(
        response.body,
        parseChatCompletionChunk,
      );
    }

    return this.client._request<ChatCompletion>(
      "POST",
      "/v1/chat/completions",
      params,
    );
  }
}

class Chat {
  readonly completions: Completions;
  constructor(client: NadirClient) {
    this.completions = new Completions(client);
  }
}

class SmartExport {
  constructor(private client: NadirClient) {}

  async status(): Promise<Record<string, unknown>> {
    return this.client._request("GET", "/v1/smart-export/status");
  }

  async train(
    clusterId: string,
    options: { baseModel?: string } = {},
  ): Promise<Record<string, unknown>> {
    return this.client._request(
      "POST",
      `/v1/smart-export/clusters/${clusterId}/train`,
      { base_model: options.baseModel ?? "gpt-4o-mini" },
    );
  }

  async exportData(
    clusterId: string,
    options: { format?: string } = {},
  ): Promise<Record<string, unknown>> {
    return this.client._request(
      "POST",
      `/v1/smart-export/clusters/${clusterId}/export`,
      { format: options.format ?? "jsonl" },
    );
  }

  async listJobs(): Promise<Record<string, unknown>> {
    return this.client._request("GET", "/v1/smart-export/jobs");
  }

  async getJob(jobId: string): Promise<Record<string, unknown>> {
    return this.client._request("GET", `/v1/smart-export/jobs/${jobId}`);
  }

  async cancelJob(jobId: string): Promise<Record<string, unknown>> {
    return this.client._request("DELETE", `/v1/smart-export/jobs/${jobId}`);
  }
}

class Clustering {
  constructor(private client: NadirClient) {}

  async classify(prompt: string): Promise<Record<string, unknown>> {
    return this.client._request("POST", "/v1/clustering/classify", { prompt });
  }

  async listClusters(): Promise<Record<string, unknown>> {
    return this.client._request("GET", "/v1/clustering/clusters");
  }

  async createCluster(params: CreateClusterParams): Promise<Record<string, unknown>> {
    return this.client._request("POST", "/v1/clustering/clusters", params);
  }
}

class Organizations {
  constructor(private client: NadirClient) {}

  async list(): Promise<Record<string, unknown>> {
    return this.client._request("GET", "/v1/organizations");
  }

  async create(params: CreateOrganizationParams): Promise<Record<string, unknown>> {
    return this.client._request("POST", "/v1/organizations", params);
  }

  async get(orgId: string): Promise<Record<string, unknown>> {
    return this.client._request("GET", `/v1/organizations/${orgId}`);
  }
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------

export class NadirClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly timeout: number;

  /** OpenAI-compatible chat completions namespace. */
  readonly chat: Chat;
  /** Smart Export / distillation endpoints. */
  readonly smartExport: SmartExport;
  /** Prompt clustering endpoints. */
  readonly clustering: Clustering;
  /** Organization management endpoints. */
  readonly organizations: Organizations;

  constructor(options: NadirClientOptions = {}) {
    this.apiKey =
      options.apiKey ??
      (typeof process !== "undefined" ? process.env.NADIR_API_KEY ?? "" : "");
    this.baseURL = (
      options.baseURL ??
      (typeof process !== "undefined"
        ? process.env.NADIR_BASE_URL ?? DEFAULT_BASE_URL
        : DEFAULT_BASE_URL)
    ).replace(/\/+$/, "");
    this.timeout = options.timeout ?? 120_000;

    this.chat = new Chat(this);
    this.smartExport = new SmartExport(this);
    this.clustering = new Clustering(this);
    this.organizations = new Organizations(this);
  }

  // ── Convenience methods ─────────────────────────────────────────

  /** Get a model recommendation without making an LLM call. */
  async recommend(params: RecommendParams): Promise<Record<string, unknown>> {
    return this._request("POST", "/v1/public/recommendation", params);
  }

  /** List available models. */
  async listModels(): Promise<Record<string, unknown>> {
    return this._request("GET", "/v1/models");
  }

  /** List user presets. */
  async listPresets(): Promise<Record<string, unknown>> {
    return this._request("GET", "/v1/user/presets");
  }

  /** Check API health. */
  async health(): Promise<Record<string, unknown>> {
    return this._request("GET", "/health");
  }

  // ── HTTP internals (public for namespace classes) ───────────────

  /** @internal */
  async _request<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await this._rawRequest(method, path, body);
    return (await response.json()) as T;
  }

  /** @internal — returns the raw Response (for streaming). */
  async _rawRequest(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const url = `${this.baseURL}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      "User-Agent": `nadir-node/${SDK_VERSION}`,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new ConnectionError(
          `Request timed out after ${this.timeout}ms: ${method} ${path}`,
        );
      }
      throw new ConnectionError(
        `Failed to connect to ${this.baseURL}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (response.ok) {
      return response;
    }

    // Parse error body
    let errorBody: unknown;
    let detail = "";
    try {
      errorBody = await response.json();
      if (typeof errorBody === "object" && errorBody !== null) {
        const obj = errorBody as Record<string, unknown>;
        detail =
          (obj.detail as string) ??
          ((obj.error as Record<string, unknown>)?.message as string) ??
          "";
      }
    } catch {
      detail = await response.text().catch(() => "");
    }

    if (!detail) {
      detail = `HTTP ${response.status}`;
    }

    if (response.status === 401) {
      throw new AuthenticationError(detail, errorBody);
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw new RateLimitError(detail, {
        body: errorBody,
        retryAfter: retryAfter ? parseFloat(retryAfter) : undefined,
      });
    }
    throw new APIError(detail, response.status, errorBody);
  }
}
