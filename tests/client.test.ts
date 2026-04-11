import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NadirClient } from "../src/client.js";
import {
  NadirError,
  AuthenticationError,
  RateLimitError,
  APIError,
  ConnectionError,
} from "../src/errors.js";

// ---------------------------------------------------------------------------
// Client construction
// ---------------------------------------------------------------------------

describe("NadirClient construction", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should use default base URL", () => {
    const client = new NadirClient({ apiKey: "ndr_test" });
    // Access internal via any cast for testing
    expect((client as any).baseURL).toBe("https://api.getnadir.dev");
  });

  it("should strip trailing slash from base URL", () => {
    const client = new NadirClient({ apiKey: "ndr_test", baseURL: "http://localhost:8856/" });
    expect((client as any).baseURL).toBe("http://localhost:8856");
  });

  it("should read API key from env", () => {
    process.env.NADIR_API_KEY = "ndr_from_env";
    const client = new NadirClient();
    expect((client as any).apiKey).toBe("ndr_from_env");
  });

  it("should read base URL from env", () => {
    process.env.NADIR_BASE_URL = "http://custom:9000";
    const client = new NadirClient({ apiKey: "ndr_test" });
    expect((client as any).baseURL).toBe("http://custom:9000");
  });

  it("should prefer explicit over env", () => {
    process.env.NADIR_API_KEY = "ndr_env";
    process.env.NADIR_BASE_URL = "http://env:9000";
    const client = new NadirClient({ apiKey: "ndr_explicit", baseURL: "http://explicit:8000" });
    expect((client as any).apiKey).toBe("ndr_explicit");
    expect((client as any).baseURL).toBe("http://explicit:8000");
  });

  it("should have expected namespaces", () => {
    const client = new NadirClient({ apiKey: "ndr_test" });
    expect(client.chat).toBeDefined();
    expect(client.chat.completions).toBeDefined();
    expect(client.smartExport).toBeDefined();
    expect(client.clustering).toBeDefined();
    expect(client.organizations).toBeDefined();
  });

  it("should default timeout to 120s", () => {
    const client = new NadirClient({ apiKey: "ndr_test" });
    expect((client as any).timeout).toBe(120_000);
  });

  it("should accept custom timeout", () => {
    const client = new NadirClient({ apiKey: "ndr_test", timeout: 30_000 });
    expect((client as any).timeout).toBe(30_000);
  });
});

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

describe("Error classes", () => {
  it("NadirError should be an Error", () => {
    const err = new NadirError("something failed", { status: 500 });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("something failed");
    expect(err.status).toBe(500);
  });

  it("AuthenticationError should have status 401", () => {
    const err = new AuthenticationError("invalid key");
    expect(err.status).toBe(401);
    expect(err).toBeInstanceOf(NadirError);
  });

  it("RateLimitError should have retryAfter", () => {
    const err = new RateLimitError("too fast", { retryAfter: 30 });
    expect(err.retryAfter).toBe(30);
    expect(err.status).toBe(429);
    expect(err).toBeInstanceOf(NadirError);
  });

  it("APIError should carry status and body", () => {
    const err = new APIError("server error", 500, { detail: "oops" });
    expect(err.status).toBe(500);
    expect(err.body).toEqual({ detail: "oops" });
  });

  it("ConnectionError should have status 0", () => {
    const err = new ConnectionError("cannot connect");
    expect(err.status).toBe(0);
    expect(err).toBeInstanceOf(NadirError);
  });
});

// ---------------------------------------------------------------------------
// HTTP request handling
// ---------------------------------------------------------------------------

describe("HTTP requests", () => {
  it("should throw ConnectionError on network failure", async () => {
    const client = new NadirClient({
      apiKey: "ndr_test",
      baseURL: "http://localhost:1", // nothing listening
      timeout: 1000,
    });

    await expect(client.health()).rejects.toThrow(ConnectionError);
  });

  it("should throw AuthenticationError on 401", async () => {
    const mockResponse = new Response(JSON.stringify({ detail: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

    const client = new NadirClient({ apiKey: "ndr_bad" });
    await expect(client.health()).rejects.toThrow(AuthenticationError);

    vi.restoreAllMocks();
  });

  it("should throw RateLimitError on 429", async () => {
    const mockResponse = new Response(JSON.stringify({ detail: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "30" },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

    const client = new NadirClient({ apiKey: "ndr_test" });
    try {
      await client.health();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe(30);
    }

    vi.restoreAllMocks();
  });

  it("should throw APIError on 500", async () => {
    const mockResponse = new Response(JSON.stringify({ detail: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

    const client = new NadirClient({ apiKey: "ndr_test" });
    await expect(client.health()).rejects.toThrow(APIError);

    vi.restoreAllMocks();
  });

  it("should return parsed JSON on success", async () => {
    const mockResponse = new Response(JSON.stringify({ status: "ok", version: "0.14.0" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

    const client = new NadirClient({ apiKey: "ndr_test" });
    const result = await client.health();
    expect(result).toEqual({ status: "ok", version: "0.14.0" });

    vi.restoreAllMocks();
  });
});
