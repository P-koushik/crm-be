# Context Management System

This document describes the sliding context window system implemented for the CRM chat functionality.

## Overview

The context management system provides:
- **Sliding context window**: Maintains the last N messages in memory
- **Automatic summarization**: Summarizes older messages when threshold is exceeded
- **Model-specific configurations**: Different limits for different AI models
- **Token management**: Efficient token counting and management
- **Future-ready**: Designed for multiple AI model integration

## Architecture

### Core Components

1. **AI Configuration** (`lib/aiConfig.ts`)
   - Model-specific limits and thresholds
   - Configurable parameters per model
   - Utility functions for context management

2. **Token Utilities** (`lib/tokenUtils.ts`)
   - Token counting using tiktoken
   - Message token estimation
   - Context window management

3. **Summarization Utils** (`lib/summarizationUtils.ts`)
   - AI-powered message summarization
   - Stream-based summarization
   - Error handling and fallbacks

4. **Context Manager** (`lib/contextManager.ts`)
   - High-level context management
   - Debugging and monitoring
   - Integration point for all utilities

5. **Updated Chat Model** (`models/chatModel.ts`)
   - Added `contextSummary` field
   - Stores summarized conversation history

## Configuration

### Model Limits

Each AI model has specific configurations:

```typescript
{
  maxTokens: 8000,           // Maximum tokens for the model
  maxMessages: 8,            // Maximum messages to keep in context
  summarizationThreshold: 14, // When to trigger summarization
  contextWindowSize: 8       // Size of sliding context window
}
```

### Supported Models

- `gpt-4o-mini`: 8K tokens, 5 messages for AI, 14 threshold
- `gpt-4o`: 128K tokens, 5 messages for AI, 20 threshold
- `gpt-3.5-turbo`: 4K tokens, 5 messages for AI, 12 threshold
- `claude-3-haiku`: 200K tokens, 5 messages for AI, 16 threshold
- `claude-3-sonnet`: 200K tokens, 5 messages for AI, 18 threshold
- `gemini-pro`: 1M tokens, 5 messages for AI, 25 threshold

**Note**: All models now use 5 messages for AI context, but users see the complete conversation history.

## How It Works

### 1. Message Processing

When a new message arrives:

1. **Add to conversation**: Store the new message in MongoDB (keeps full history)
2. **Check threshold**: Determine if summarization is needed
3. **Summarize if needed**: Use AI to summarize older messages
4. **Update context**: Store summary in database (messages remain unchanged)
5. **Send to AI**: Use system prompt + context summary + last 5 messages only

### 2. User vs AI Context

- **User sees**: Complete conversation history (all messages)
- **AI receives**: Last 5 messages + context summary + system prompt
- **Database stores**: All messages + context summary

### 3. Summarization Process

When the message count exceeds the threshold:

1. **Identify messages to summarize**: All except the last 5 messages
2. **Generate summary**: Use AI to create concise summary
3. **Combine summaries**: Append to existing context summary
4. **Update database**: Store new summary (messages remain unchanged)
5. **Continue conversation**: Use context summary + last 5 messages

### 4. Context Assembly

For each AI request:

```
System Prompt + CRM Context + Context Summary + Last 5 Messages
```

**Note**: The user interface shows the complete conversation history, but the AI only receives the last 5 messages plus the context summary for efficiency.

## Usage

### Basic Usage

```typescript
import { ContextManager } from './lib/contextManager';

const contextManager = new ContextManager('gpt-4o-mini');
const result = await contextManager.manageContext(messages, existingSummary);
```

### Advanced Usage

```typescript
// Get debug information
const debugInfo = contextManager.getDebugInfo(messages, contextSummary);

// Get context window
const recentMessages = contextManager.getContextWindow(messages);

// Check if summarization is needed
const shouldSummarize = contextManager.shouldSummarize(messages);
```

## API Changes

### Chat Controller

The `handleChatMessage` function now accepts:

```typescript
{
  message: string,
  conversationId: string,
  modelName?: string  // New parameter
}
```

### Database Schema

The ChatMessage model now includes:

```typescript
{
  conversationId: string,
  user: string,
  title?: string,
  messages: UserMessage[],
  contextSummary?: string,  // New field
  createdAt?: Date,
  updatedAt?: Date
}
```

## Monitoring and Debugging

### Debug Information

The ContextManager provides detailed debug information:

```typescript
{
  modelName: 'gpt-4o-mini',
  messageCount: 15,
  tokenCount: 2048,
  summaryLength: 500,
  shouldSummarize: true,
  contextWindowSize: 8,
  summarizationThreshold: 14
}
```

### Logging

The system logs important events:

- Summarization triggers
- Token counts
- Summary generation success/failure
- Context updates

## Future Enhancements

### Planned Features

1. **Multi-model support**: Easy integration of Claude, Gemini, etc.
2. **Dynamic thresholds**: Adjust based on conversation complexity
3. **Smart summarization**: Context-aware summarization strategies
4. **Performance optimization**: Caching and batching
5. **Analytics**: Track summarization effectiveness

### Integration Points

The system is designed for easy integration with:

- **Claude API**: Add Claude model configurations
- **Gemini API**: Add Gemini model configurations
- **Custom models**: Extend configuration system
- **Analytics**: Add monitoring and metrics
- **Caching**: Add Redis/memory caching

## Testing

Run the test script to verify the system:

```bash
node test-context-system.js
```

This will test:
- Model configurations
- Context management
- Token counting
- Debug information

## Troubleshooting

### Common Issues

1. **Summarization fails**: Check AI API key and model availability
2. **Token limits exceeded**: Adjust model configuration
3. **Performance issues**: Monitor token counts and optimize thresholds
4. **Memory issues**: Implement message cleanup strategies

### Debug Commands

```typescript
// Check token count
const tokens = countTokens(message, modelName);

// Get model config
const config = getModelConfig(modelName);

// Test summarization
const result = await summarizeMessages(messages, modelName);
```

## Performance Considerations

- **Token counting**: Uses efficient tiktoken library
- **Summarization**: Async processing with streaming
- **Database updates**: Minimal writes, efficient queries
- **Memory usage**: Sliding window prevents memory bloat
- **API calls**: Batched and optimized for cost efficiency 