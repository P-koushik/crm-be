export interface ModelConfig {
  maxTokens: number;
  maxMessages: number;
  summarizationThreshold: number;
  contextWindowSize: number;
  tokenThreshold: number; // Token-based threshold for summarization
}

export const MODEL_LIMITS: Record<string, ModelConfig> = {
  'gpt-4o-mini': {
    maxTokens: 8000,
    maxMessages: 5,
    summarizationThreshold: 14,
    contextWindowSize: 5,
    tokenThreshold: 5000, // Summarize when approaching 62.5% of max tokens (more aggressive)
  },
  'gpt-4o': {
    maxTokens: 128000,
    maxMessages: 5,
    summarizationThreshold: 50,
    contextWindowSize: 5,
    tokenThreshold: 80000, // Summarize when approaching 62.5% of max tokens (more aggressive)
  },
  'gpt-3.5-turbo': {
    maxTokens: 4096,
    maxMessages: 5,
    summarizationThreshold: 10,
    contextWindowSize: 5,
    tokenThreshold: 2500, // Summarize when approaching 61% of max tokens (more aggressive)
  },
  'mistral-large-latest': {
    maxTokens: 32000,
    maxMessages: 5,
    summarizationThreshold: 25,
    contextWindowSize: 5,
    tokenThreshold: 20000, // Summarize when approaching 62.5% of max tokens (more aggressive)
  },
  'claude-3-haiku': {
    maxTokens: 200000,
    maxMessages: 5,
    summarizationThreshold: 60,
    contextWindowSize: 5,
    tokenThreshold: 125000, // Summarize when approaching 62.5% of max tokens (more aggressive)
  },
  'claude-3-sonnet': {
    maxTokens: 200000,
    maxMessages: 5,
    summarizationThreshold: 60,
    contextWindowSize: 5,
    tokenThreshold: 125000, // Summarize when approaching 62.5% of max tokens (more aggressive)
  },
};

export const DEFAULT_MODEL = 'gpt-4o-mini';

export function getModelConfig(modelName: string): ModelConfig {
  return MODEL_LIMITS[modelName] || MODEL_LIMITS[DEFAULT_MODEL];
}

export function shouldSummarize(messages: any[], modelName: string = DEFAULT_MODEL): boolean {
  const config = getModelConfig(modelName);
  
  // Prioritize token-based checks over message count
  const { calculateTotalTokens } = require('./tokenUtils');
  const currentTokens = calculateTotalTokens(messages);
  const tokenThreshold = currentTokens > config.tokenThreshold;
  
  // Only check message count if token threshold hasn't been reached
  const messageCountThreshold = !tokenThreshold && messages.length > config.summarizationThreshold;
  
  // Summarize if either threshold is exceeded, but prioritize tokens
  return tokenThreshold || messageCountThreshold;
}

export function shouldSummarizeByTokens(messages: any[], modelName: string = DEFAULT_MODEL): boolean {
  const config = getModelConfig(modelName);
  const { calculateTotalTokens } = require('./tokenUtils');
  const currentTokens = calculateTotalTokens(messages);
  return currentTokens > config.tokenThreshold;
}

export function getContextWindow(messages: any[], modelName: string = DEFAULT_MODEL): any[] {
  const config = getModelConfig(modelName);
  return messages.slice(-config.contextWindowSize);
} 