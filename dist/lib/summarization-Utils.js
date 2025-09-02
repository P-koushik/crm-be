"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update_context_with_new_message = exports.needs_further_summarization = exports.process_message_context = exports.summarize_messages = exports.create_summary_prompt = exports.estimate_messages_tokens = exports.estimate_message_tokens = exports.estimate_tokens = exports.DEFAULT_TOKEN_CONFIG = void 0;
// Default token configuration
exports.DEFAULT_TOKEN_CONFIG = {
    tokenThreshold: 4000, // 4k tokens for context
    maxTokens: 1000, // 1k tokens for response
    summaryPrompt: `Summarize the following conversation in a concise way that captures the key points, decisions, and context that would be useful for future interactions. Focus on:
- Main topics discussed
- Key decisions or agreements made
- Important context or background information
- Any action items or follow-ups needed

Conversation:
`,
};
// Estimate token count for text (rough approximation)
const estimate_tokens = (text) => {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
};
exports.estimate_tokens = estimate_tokens;
// Estimate token count for a single message
const estimate_message_tokens = (message) => {
    const messageText = `${message.sender}: ${message.message}`;
    return (0, exports.estimate_tokens)(messageText);
};
exports.estimate_message_tokens = estimate_message_tokens;
// Estimate token count for multiple messages
const estimate_messages_tokens = ({ messages }) => {
    return messages.reduce((total, message) => total + (0, exports.estimate_message_tokens)(message), 0);
};
exports.estimate_messages_tokens = estimate_messages_tokens;
// Create summary prompt
const create_summary_prompt = ({ messages, config }) => {
    const conversationText = messages
        .map(msg => `${msg.sender}: ${msg.message}`)
        .join('\n');
    return `${config.summaryPrompt}${conversationText}`;
};
exports.create_summary_prompt = create_summary_prompt;
// Summarize messages using AI
const summarize_messages = async (params) => {
    const { messages, config, aiProvider } = params;
    if (messages.length === 0)
        return '';
    try {
        const summaryPrompt = (0, exports.create_summary_prompt)({ messages, config });
        // Use the AI provider to generate summary
        const summaryResponse = await aiProvider.generateText({
            prompt: summaryPrompt,
            maxTokens: 500, // Limit summary length
            temperature: 0.3, // Lower temperature for more consistent summaries
        });
        return summaryResponse.text || 'Conversation history available.';
    }
    catch (error) {
        console.error('Error generating summary:', error);
        // Fallback: create a basic summary
        return `Previous conversation with ${messages.length} messages. Key topics discussed.`;
    }
};
exports.summarize_messages = summarize_messages;
// Process messages and create optimized context
const process_message_context = async (params) => {
    const { allMessages, config = exports.DEFAULT_TOKEN_CONFIG, aiProvider, existingSummary } = params;
    if (allMessages.length === 0) {
        return { summary: existingSummary || '', messages: [], totalTokens: (0, exports.estimate_tokens)(existingSummary || '') };
    }
    let summary = existingSummary || '';
    let totalTokens = (0, exports.estimate_messages_tokens)({ messages: allMessages });
    // If we're under the threshold, no summarization needed
    if (totalTokens <= config.tokenThreshold) {
        return { summary, messages: allMessages, totalTokens };
    }
    // We need to summarize. Keep the latest message unsummarized
    const messagesToSummarize = allMessages.slice(0, -1);
    const latestMessage = allMessages[allMessages.length - 1];
    if (messagesToSummarize.length === 0) {
        // Only one message, can't summarize - keep it unsummarized
        return { summary, messages: [latestMessage], totalTokens: (0, exports.estimate_message_tokens)(latestMessage) };
    }
    // Generate summary of all messages except the latest
    if (aiProvider) {
        // If we have an existing summary, include it in the summarization prompt
        let summaryPrompt = config.summaryPrompt;
        if (existingSummary) {
            summaryPrompt += `\n\nNote: There is already a previous summary: "${existingSummary}". Please create a new comprehensive summary that incorporates both the previous summary and the new conversation content.`;
        }
        summary = await (0, exports.summarize_messages)({ messages: messagesToSummarize, config: { ...config, summaryPrompt }, aiProvider });
    }
    else {
        // Fallback summary
        if (existingSummary) {
            summary = `${existingSummary} + Previous conversation with ${messagesToSummarize.length} additional messages. Key topics discussed.`;
        }
        else {
            summary = `Previous conversation with ${messagesToSummarize.length} messages. Key topics discussed.`;
        }
    }
    // Calculate new token count
    const summaryTokens = (0, exports.estimate_tokens)(summary);
    const latestMessageTokens = (0, exports.estimate_message_tokens)(latestMessage);
    totalTokens = summaryTokens + latestMessageTokens;
    return {
        summary,
        messages: [latestMessage], // Only the latest message remains unsummarized
        totalTokens
    };
};
exports.process_message_context = process_message_context;
// Check if context needs further summarization
const needs_further_summarization = (params) => {
    const { context, newMessage, config = exports.DEFAULT_TOKEN_CONFIG } = params;
    const newMessageTokens = (0, exports.estimate_message_tokens)(newMessage);
    const totalTokens = context.totalTokens + newMessageTokens;
    return totalTokens > config.tokenThreshold;
};
exports.needs_further_summarization = needs_further_summarization;
// Update context with a new message
const update_context_with_new_message = async (params) => {
    const { currentContext, newMessage, config = exports.DEFAULT_TOKEN_CONFIG, aiProvider } = params;
    const newMessageTokens = (0, exports.estimate_message_tokens)(newMessage);
    const totalTokens = currentContext.totalTokens + newMessageTokens;
    // If we're still under the threshold, just add the message
    if (totalTokens <= config.tokenThreshold) {
        return {
            summary: currentContext.summary,
            messages: [...currentContext.messages, newMessage],
            totalTokens
        };
    }
    // We need to summarize. Add the new message to the summarization
    const allMessages = [...currentContext.messages, newMessage];
    // Keep the latest message unsummarized
    const messagesToSummarize = allMessages.slice(0, -1);
    const latestMessage = allMessages[allMessages.length - 1];
    if (messagesToSummarize.length === 0) {
        // Only one message, can't summarize
        return {
            summary: currentContext.summary,
            messages: [latestMessage],
            totalTokens: (0, exports.estimate_message_tokens)(latestMessage)
        };
    }
    // Generate new summary
    let newSummary = currentContext.summary;
    if (aiProvider) {
        newSummary = await (0, exports.summarize_messages)({ messages: messagesToSummarize, config, aiProvider });
    }
    else {
        // Fallback summary
        newSummary = `Previous conversation with ${messagesToSummarize.length} messages. Key topics discussed.`;
    }
    // Calculate new token count
    const summaryTokens = (0, exports.estimate_tokens)(newSummary);
    const latestMessageTokens = (0, exports.estimate_message_tokens)(latestMessage);
    const newTotalTokens = summaryTokens + latestMessageTokens;
    return {
        summary: newSummary,
        messages: [latestMessage],
        totalTokens: newTotalTokens
    };
};
exports.update_context_with_new_message = update_context_with_new_message;
