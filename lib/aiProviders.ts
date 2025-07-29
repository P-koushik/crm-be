import { streamText, type CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { mistral } from '@ai-sdk/mistral';

export interface AIProviderConfig {
  name: string;
  models: string[];
  priority: number; // Lower number = higher priority
  enabled: boolean;
}

export interface AIStreamOptions {
  modelName: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIStreamResult {
  success: boolean;
  textStream?: AsyncIterable<string>;
  error?: string;
  provider?: string;
  model?: string;
}

// Provider configurations
export const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o-mini'],
    priority: 1,
    enabled: true,
  },
  mistral: {
    name: 'Mistral',
    models: ['mistral-large-latest'],
    priority: 2,
    enabled: true,
  },
};

// Get the appropriate provider for a model
export function getProviderForModel(modelName: string): string {
  for (const [provider, config] of Object.entries(AI_PROVIDERS)) {
    if (config.enabled && config.models.includes(modelName)) {
      return provider;
    }
  }
  throw new Error(`No provider found for model: ${modelName}`);
}

// Get fallback models for a given model
export function getFallbackModels(modelName: string): string[] {
  const primaryProvider = getProviderForModel(modelName);
  const fallbacks: string[] = [];
  
  // Get models from other providers in priority order
  const sortedProviders = Object.entries(AI_PROVIDERS)
    .filter(([provider, config]) => config.enabled && provider !== primaryProvider)
    .sort(([, a], [, b]) => a.priority - b.priority);
  
  for (const [provider, config] of sortedProviders) {
    fallbacks.push(...config.models);
  }
  
  return fallbacks;
}

// Stream text with automatic fallback
export async function streamTextWithFallback(
  options: AIStreamOptions,
  fallbackModels: string[] = []
): Promise<AIStreamResult> {
  const allModels = [options.modelName, ...fallbackModels];
  
  for (const model of allModels) {
    try {
      const provider = getProviderForModel(model);
      
      // Check if provider is enabled
      if (!AI_PROVIDERS[provider]?.enabled) {
        continue;
      }
      
      const result = await streamTextWithProvider(model, options, provider);
      
      if (result.success) {
        return {
          ...result,
          provider,
          model,
        };
      } else {
        // If it's an empty response, mark the provider as failed
        if (result.error?.includes('empty response')) {
          markProviderFailure(provider);
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return {
    success: false,
    error: `All models failed: ${allModels.join(', ')}`,
  };
}

// Stream text with a specific provider
async function streamTextWithProvider(
  modelName: string,
  options: AIStreamOptions,
  provider: string
): Promise<AIStreamResult> {
  try {
    let model;
    
    // Check if API keys are configured
    const openaiKey = process.env.OPENAI_API_KEY;
    const mistralKey = process.env.MISTRAL_API_KEY;
    
    switch (provider) {
      case 'openai':
        if (!openaiKey) {
          throw new Error('OpenAI API key not configured');
        }
        model = openai(modelName);
        break;
      case 'mistral':
        if (!mistralKey) {
          throw new Error('Mistral API key not configured');
        }
        model = mistral(modelName);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    // Add timeout for API calls
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });
    
    const streamPromise = streamText({
      model,
      messages: options.messages as CoreMessage[],
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
    });

    const result = await Promise.race([streamPromise, timeoutPromise]);
    
    return {
      success: true,
      textStream: result.textStream,
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific error types
    if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('rate_limit')) {
      errorMessage = `${provider} API quota exceeded. Please check your billing and rate limits.`;
      disableProvider(provider);
    } else if (errorMessage.includes('API key')) {
      errorMessage = `${provider} API key is invalid or not configured properly.`;
    } else if (errorMessage.includes('permission')) {
      errorMessage = `${provider} API key does not have the necessary permissions.`;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get recommended fallback models based on the primary model
export function getRecommendedFallbacks(primaryModel: string): string[] {
  const provider = getProviderForModel(primaryModel);
  
  switch (provider) {
    case 'openai':
      return ['mistral-large-latest'];
    case 'mistral':
      return ['gpt-4o-mini'];
    default:
      return ['gpt-4o-mini', 'mistral-large-latest'];
  }
}

// Check if a model is available
export function isModelAvailable(modelName: string): boolean {
  try {
    getProviderForModel(modelName);
    return true;
  } catch {
    return false;
  }
}

// Get all available models
export function getAllAvailableModels(): string[] {
  const models: string[] = [];
  for (const [provider, config] of Object.entries(AI_PROVIDERS)) {
    if (config.enabled) {
      models.push(...config.models);
    }
  }
  return models;
}

// Disable a provider
export function disableProvider(providerName: string): void {
  if (AI_PROVIDERS[providerName]) {
    AI_PROVIDERS[providerName].enabled = false;
  }
}

// Enable a provider
export function enableProvider(providerName: string): void {
  if (AI_PROVIDERS[providerName]) {
    AI_PROVIDERS[providerName].enabled = true;
  }
}

// Track provider failures
const providerFailures = new Map<string, number>();

// Mark a provider as failed
export function markProviderFailure(providerName: string): void {
  const currentFailures = providerFailures.get(providerName) || 0;
  providerFailures.set(providerName, currentFailures + 1);
  
  // Disable provider after 3 consecutive failures
  if (currentFailures + 1 >= 3) {
    disableProvider(providerName);
  }
}

// Reset provider failures
export function resetProviderFailures(providerName: string): void {
  providerFailures.delete(providerName);
} 