import { UserMessage } from '../models/chatModel';
import { streamTextWithFallback, getRecommendedFallbacks } from './aiProviders';

export interface SummarizationResult {
  summary: string;
  success: boolean;
  error?: string;
}

export async function summarizeMessages(
  messages: UserMessage[],
  modelName: string = 'gpt-4o-mini'
): Promise<SummarizationResult> {
  try {
    if (messages.length === 0) {
      return { summary: '', success: true };
    }

    const summarizationPrompt = `Please provide a concise summary of the following conversation. Focus on the key points, decisions made, and important context that should be remembered for future interactions. Keep the summary factual and objective.

Conversation to summarize:
${messages.map((msg, index) => 
  `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.message}`
).join('\n\n')}

Summary:`;

    const fallbackModels = getRecommendedFallbacks(modelName);
    const result = await streamTextWithFallback({
      modelName,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, factual summaries of conversations. Focus on key information that would be useful for future context.'
        },
        {
          role: 'user',
          content: summarizationPrompt
        }
      ],
      temperature: 0.3,
      maxTokens: 500,
    }, fallbackModels);

    if (!result.success) {
      throw new Error(result.error || 'AI model failed during summarization');
    }

    let summary = '';
    for await (const chunk of result.textStream!) {
      summary += chunk;
    }

    return {
      summary: summary.trim(),
      success: true
    };

  } catch (error) {
    console.error('Error summarizing messages:', error);
    return {
      summary: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during summarization'
    };
  }
}

 