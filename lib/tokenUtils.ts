import { encoding_for_model } from '@dqbd/tiktoken';

export function countTokens(text: string, modelName: string = 'gpt-4o-mini'): number {
  try {
    // Handle undefined or null text
    if (!text || typeof text !== 'string') {
      return 0;
    }
    
    const modelMap: Record<string, string> = {
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4o': 'gpt-4o',
      'gpt-3.5-turbo': 'gpt-3.5-turbo',
      'claude-3-haiku': 'claude-3-haiku',
      'claude-3-sonnet': 'claude-3-sonnet',
      'gemini-pro': 'gpt-4o-mini',
      'mistral-large-latest': 'gpt-4o-mini', // Fallback for Mistral
    };
    
    const tiktokenModel = modelMap[modelName] || 'gpt-4o-mini';
    const encoding = encoding_for_model(tiktokenModel as any);
    const tokens = encoding.encode(text);
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens:', error);
    // Fallback: estimate tokens based on character count
    return Math.ceil((text || '').length / 4);
  }
}

export function estimateMessageTokens(message: string, role: 'user' | 'assistant' | 'system'): number {
  const overhead = role === 'system' ? 4 : 3;
  return countTokens(message) + overhead;
}

export function calculateTotalTokens(messages: Array<{ role: string; content: string }>): number {
  if (!messages || !Array.isArray(messages)) {
    return 0;
  }
  
  return messages.reduce((total, message) => {
    if (!message || !message.content) {
      return total;
    }
    return total + estimateMessageTokens(message.content, message.role as any);
  }, 0);
}

export function calculateAvailableTokensForContext(modelName: string = 'gpt-4o-mini'): number {
  const { getModelConfig } = require('./aiConfig');
  const config = getModelConfig(modelName);
  
  // Reserve 20% of max tokens for response generation
  const reservedForResponse = config.maxTokens * 0.2;
  const availableForContext = config.maxTokens - reservedForResponse;
  
  return Math.floor(availableForContext);
}

export function getTokenUsageInfo(messages: Array<{ role: string; content: string }>, modelName: string = 'gpt-4o-mini'): {
  totalTokens: number;
  messageCount: number;
  averageTokensPerMessage: number;
  maxTokensForModel: number;
  tokenUsagePercentage: number;
  shouldSummarize: boolean;
  availableTokensForContext: number;
  remainingTokensForResponse: number;
} {
  const { getModelConfig } = require('./aiConfig');
  const config = getModelConfig(modelName);
  
  // Handle undefined or null messages
  if (!messages || !Array.isArray(messages)) {
    messages = [];
  }
  
  const totalTokens = calculateTotalTokens(messages);
  const messageCount = messages.length;
  const averageTokensPerMessage = messageCount > 0 ? totalTokens / messageCount : 0;
  const maxTokensForModel = config.maxTokens;
  const tokenUsagePercentage = (totalTokens / maxTokensForModel) * 100;
  const shouldSummarize = totalTokens > config.tokenThreshold;
  const availableTokensForContext = calculateAvailableTokensForContext(modelName);
  const remainingTokensForResponse = maxTokensForModel - totalTokens;
  
  return {
    totalTokens,
    messageCount,
    averageTokensPerMessage,
    maxTokensForModel,
    tokenUsagePercentage,
    shouldSummarize,
    availableTokensForContext,
    remainingTokensForResponse,
  };
}

 