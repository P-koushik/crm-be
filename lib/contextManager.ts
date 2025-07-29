import { UserMessage } from '../models/chatModel';
import { getModelConfig, shouldSummarize, shouldSummarizeByTokens, getContextWindow } from './aiConfig';
import { summarizeMessages } from './summarizationUtils';
import { countTokens, calculateTotalTokens, calculateAvailableTokensForContext } from './tokenUtils';

export interface ContextManagementResult {
  messages: UserMessage[];
  contextSummary: string;
  wasSummarized: boolean;
  tokenCount: number;
  summaryLength: number;
  summarizationReason?: 'message_count' | 'token_limit' | 'none';
}

export class ContextManager {
  private modelName: string;
  private config: any;

  constructor(modelName: string = 'gpt-4o-mini') {
    this.modelName = modelName;
    this.config = getModelConfig(modelName);
  }

  async manageContext(
    messages: UserMessage[],
    existingSummary: string = ''
  ): Promise<ContextManagementResult> {
    const initialTokenCount = this.calculateMessageTokens(messages);
    let wasSummarized = false;
    let finalSummary = existingSummary;
    let summarizationReason: 'message_count' | 'token_limit' | 'none' = 'none';

    // Check if summarization is needed - prioritize token-based checks
    const tokenThreshold = shouldSummarizeByTokens(messages, this.modelName);
    const messageCountThreshold = messages.length > this.config.summarizationThreshold;
    const needsSummarization = tokenThreshold || messageCountThreshold;
    
    if (needsSummarization) {
      // Prioritize token-based summarization
      if (tokenThreshold) {
        summarizationReason = 'token_limit';
      } else if (messageCountThreshold) {
        summarizationReason = 'message_count';
      }
      
      // Calculate how many messages to keep based on available tokens
      const availableTokens = calculateAvailableTokensForContext(this.modelName);
      const messagesToKeep = this.calculateMessagesToKeep(messages, availableTokens);
      
      const messagesToSummarize = messages.slice(0, messages.length - messagesToKeep);
      const recentMessages = messages.slice(-messagesToKeep);
      
      if (messagesToSummarize.length > 0) {
        const summarizationResult = await summarizeMessages(messagesToSummarize, this.modelName);
        
        if (summarizationResult.success) {
          finalSummary = existingSummary 
            ? `${existingSummary}\n\n${summarizationResult.summary}`
            : summarizationResult.summary;
          
          wasSummarized = true;

        } else {
          console.error('[ContextManager] Summarization failed:', summarizationResult.error);
        }
      }
    }

    // Use token-aware context window instead of fixed message count
    const aiContextMessages = this.getTokenAwareContextWindow(messages);
    const finalTokenCount = this.calculateMessageTokens(aiContextMessages);

    return {
      messages: aiContextMessages,
      contextSummary: finalSummary,
      wasSummarized,
      tokenCount: finalTokenCount,
      summaryLength: finalSummary.length,
      summarizationReason,
    };
  }

  private calculateMessageTokens(messages: UserMessage[]): number {
    const formattedMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message,
    }));
    
    return calculateTotalTokens(formattedMessages);
  }

  private calculateMessagesToKeep(messages: UserMessage[], availableTokens: number): number {
    // Start with the most recent messages and work backwards
    let messagesToKeep = 0;
    let totalTokens = 0;
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const messageTokens = this.calculateMessageTokens([messages[i]]);
      if (totalTokens + messageTokens <= availableTokens) {
        totalTokens += messageTokens;
        messagesToKeep++;
      } else {
        break;
      }
    }
    
    // Ensure we keep at least 2 messages (user + assistant) if possible
    return Math.max(messagesToKeep, Math.min(2, messages.length));
  }

  private getTokenAwareContextWindow(messages: UserMessage[]): UserMessage[] {
    const availableTokens = calculateAvailableTokensForContext(this.modelName);
    
    // Calculate how many recent messages we can fit within token limits
    const messagesToKeep = this.calculateMessagesToKeep(messages, availableTokens);
    
    return messages.slice(-messagesToKeep);
  }

  getDebugInfo(messages: UserMessage[], contextSummary: string = ''): any {
    const tokenCount = this.calculateMessageTokens(messages);
    const summaryTokens = countTokens(contextSummary, this.modelName);
    const messageCountThreshold = messages.length > this.config.summarizationThreshold;
    const tokenThreshold = shouldSummarizeByTokens(messages, this.modelName);
    const availableTokens = calculateAvailableTokensForContext(this.modelName);
    const messagesToKeep = this.calculateMessagesToKeep(messages, availableTokens);
    
    return {
      modelName: this.modelName,
      config: this.config,
      messageCount: messages.length,
      tokenCount,
      summaryLength: contextSummary.length,
      summaryTokens,
      shouldSummarize: shouldSummarize(messages, this.modelName),
      messageCountThreshold,
      tokenThreshold,
      availableTokens,
      messagesToKeep,
      contextWindowSize: this.config.contextWindowSize,
      summarizationThreshold: this.config.summarizationThreshold,
      tokenThresholdValue: this.config.tokenThreshold,
      maxTokens: this.config.maxTokens,
    };
  }

  getContextWindow(messages: UserMessage[]): UserMessage[] {
    return getContextWindow(messages, this.modelName);
  }
} 