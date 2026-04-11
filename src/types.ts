// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: unknown[];
  cache_control?: Record<string, unknown>;
}

export interface ReasoningConfig {
  effort?: "low" | "medium" | "high";
  max_tokens?: number;
}

export interface ProviderPreferences {
  order?: string[];
  ignore?: string[];
  sort?: string;
  require_parameters?: string[];
}

export interface ChatCompletionCreateParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  response_format?: Record<string, unknown>;
  reasoning?: ReasoningConfig;
  provider?: ProviderPreferences;
  route?: "fallback";
  fallback_models?: string[];
  transforms?: string[];
  layers?: { routing?: boolean; fallback?: boolean; optimize?: boolean };
  tools?: unknown[];
  tool_choice?: unknown;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface Message {
  role: string;
  content: string | null;
  tool_calls?: unknown[];
}

export interface Choice {
  index: number;
  message?: Message;
  delta?: Message;
  finish_reason: string | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface NadirMetadata {
  model_selection_type?: string;
  strategy?: string;
  selected_model?: string;
  complexity_score?: number;
  analyzer_used?: string;
  tier?: string;
  confidence?: number;
  cost?: Record<string, unknown>;
  benchmark_comparison?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage?: Usage;
  nadir_metadata?: NadirMetadata;
}

export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage?: Usage;
}

// ---------------------------------------------------------------------------
// Resource types
// ---------------------------------------------------------------------------

export interface CreateClusterParams {
  name: string;
  description?: string;
  examples?: string[];
  classification_criteria?: string;
}

export interface CreateOrganizationParams {
  name: string;
  slug: string;
  plan_type?: string;
}

export interface RecommendParams {
  prompt: string;
  system_message?: string;
  models?: string[];
  providers?: string[];
  max_models?: number;
}
