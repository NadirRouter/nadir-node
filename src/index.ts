export { NadirClient } from "./client.js";
export type { NadirClientOptions } from "./client.js";

export { Stream } from "./streaming.js";

export {
  NadirError,
  AuthenticationError,
  RateLimitError,
  APIError,
  ConnectionError,
} from "./errors.js";

export type {
  ChatMessage,
  ChatCompletionCreateParams,
  ReasoningConfig,
  ProviderPreferences,
  ChatCompletion,
  ChatCompletionChunk,
  Choice,
  Message,
  Usage,
  NadirMetadata,
  CreateClusterParams,
  CreateOrganizationParams,
  RecommendParams,
} from "./types.js";
