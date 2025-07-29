import { Request, Response } from "express";
import ChatMessage from "../models/chatModel";
import Contact from "../models/contactmodel";
import Activity from "../models/activityModel";
import Tag from "../models/tagsmodel";
import { getModelConfig, DEFAULT_MODEL } from "../lib/aiConfig";
import { ContextManager, ContextManagementResult } from "../lib/contextManager";
import { streamTextWithFallback, getRecommendedFallbacks } from "../lib/aiProviders";
  
import dotenv from "dotenv";
dotenv.config();

interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    id?: string;
  };
}

interface Message {
  sender: "user" | "ai";
  message: string;
  timestamp: Date;
}

interface CRMContext {
  contacts: Array<{
    name: string;
    email: string;
    phone?: string;
    company?: string;
    tags?: string[];
    note?: string;
    lastInteraction?: Date;
  }>;
  activities: Array<{
    activityType: string;
    details?: string;
    timestamp: Date;
    contactId?: string;
  }>;
  contactStats: {
    totalContacts: number;
    companiesCount: number;
    tagsCount: number;
  };
  topCompanies: { _id: string; count: number }[];
  tags: { name: string; color: string }[];
}

const getCRMContext = async (userId: string): Promise<CRMContext | null> => {
  try {
    const contacts = await Contact.find({ user: userId })
      .select("name email phone company tags note lastInteraction")
      .limit(50)
      .sort({ lastInteraction: -1 });

    const activities = await Activity.find({ user: userId })
      .select("activityType details timestamp contactId")
      .sort({ timestamp: -1 });

    const contactStats = {
      totalContacts: await Contact.countDocuments({ user: userId }),
      companiesCount: (await Contact.distinct("company", { user: userId })).length,
      tagsCount: await Tag.countDocuments({ user: userId }),
    };

    const topCompanies = await Contact.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$company", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const tags = await Tag.find({ user: userId }).select("name color");

    return { contacts, activities, contactStats, topCompanies, tags };
  } catch (error) {
    console.error("Error fetching CRM context:", error);
    return null;
  }
};

const createSystemPrompt = (crmContext: CRMContext | null, contextSummary?: string): string => {
  let systemPrompt = "You are an AI assistant for a CRM system...";

  if (crmContext) {
    const { contacts, activities, contactStats, topCompanies, tags } = crmContext;

    systemPrompt += `

CURRENT CRM DATA SUMMARY:
- Total Contacts: ${contactStats.totalContacts}
- Companies: ${contactStats.companiesCount}
- Tags: ${contactStats.tagsCount}

TOP COMPANIES (by contact count):
${topCompanies.map(c => `- ${c._id}: ${c.count} contacts`).join("\n")}

RECENT CONTACTS:
${contacts.slice(0, 10).map(c => `- ${c.name} (${c.email}) at ${c.company}${c.tags?.length ? ` - Tags: ${c.tags.join(", ")}` : ""}`).join("\n")}

RECENT ACTIVITIES:
${activities.slice(0, 5).map(a => `- ${a.activityType}: ${a.details} (${new Date(a.timestamp).toLocaleDateString()})`).join("\n")}

AVAILABLE TAGS:
${tags.map(t => `- ${t.name}`).join("\n")}`;
  }

  if (contextSummary && contextSummary.trim()) {
    systemPrompt += `

PREVIOUS CONVERSATION SUMMARY:
${contextSummary}`;
  }

  systemPrompt += `

Always provide helpful, accurate information about the user's CRM data and assist with contact management tasks.`;

  return systemPrompt;
};

const manageConversationContext = async (
  conversation: any,
  modelName: string = DEFAULT_MODEL
): Promise<{ messages: any[], contextSummary: string, summarizationReason?: string, tokenCount?: number }> => {
  const contextManager = new ContextManager(modelName);
  const { messages, contextSummary } = conversation;

  const result = await contextManager.manageContext(messages, contextSummary);

  // If summarization occurred, update only the contextSummary in the database
  // Keep all messages in the database for user display
  if (result.wasSummarized) {
    await ChatMessage.findByIdAndUpdate(conversation._id, {
      contextSummary: result.contextSummary
      // Don't update messages - keep all messages for user display
    });
  }

  // Log detailed token information for debugging
  if (result.summarizationReason && result.summarizationReason !== 'none') {
    const debugInfo = contextManager.getDebugInfo(messages, contextSummary);
    // Removed debug logging
  }

  return {
    messages: result.messages, // Token-aware messages for AI
    contextSummary: result.contextSummary,
    summarizationReason: result.summarizationReason,
    tokenCount: result.tokenCount
  };
};

export const handleChatMessage = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { message, conversationId, modelName = DEFAULT_MODEL } = req.body;
    const userId = authReq.user.uid || authReq.user.id!;

    // Handle legacy model names
    const normalizedModelName = modelName === 'gemini-2.5-flash' ? 'gemini-2.5-flash' : modelName;


    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      });
    }

    const crmContext = await getCRMContext(userId);

    let conversation = await ChatMessage.findOne({ conversationId, user: userId });

    if (!conversation) {
      conversation = await ChatMessage.create({
        conversationId,
        user: userId,
        messages: [],
        contextSummary: "",
      });
    }

    const userMsg: Message = {
      sender: "user",
      message,
      timestamp: new Date(),
    };
    conversation.messages.push(userMsg);
    await conversation.save();

    // Manage context window and summarization
    const contextResult = await manageConversationContext(conversation, normalizedModelName);
    const { messages: managedMessages, contextSummary, summarizationReason, tokenCount } = contextResult;
    
    // Log token usage for debugging
    if (summarizationReason && summarizationReason !== 'none') {
      // Removed debug logging
    }
    
    // Get the system prompt with context summary
    const systemPrompt = createSystemPrompt(crmContext, contextSummary);

    // Format messages for AI (system prompt + recent messages)
    const formattedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...managedMessages.map((msg: Message) => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.message,
      })),
    ];

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked',
    });

    let completeAiMessage = '';

    try {
      const config = getModelConfig(normalizedModelName);
      
      // Get fallback models for automatic fallback
      const fallbackModels = getRecommendedFallbacks(normalizedModelName);
      
      const result = await streamTextWithFallback({
        modelName: normalizedModelName,
        messages: formattedMessages,
        temperature: 0.7,
        maxTokens: Math.min(1000, config.maxTokens),
      }, fallbackModels);

      if (!result.success) {
        throw new Error(result.error || 'All AI models failed');
      }

      let hasContent = false;
      let chunkCount = 0;
      

      
      for await (const chunk of result.textStream!) {
        chunkCount++;
        if (chunk && chunk.trim().length > 0) {
          hasContent = true;
        }
        completeAiMessage += chunk;
        res.write(chunk);
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      // Validate that we got a response
      if (!hasContent || !completeAiMessage || completeAiMessage.trim().length === 0) {
        throw new Error(`No response received from ${result.provider}/${result.model}`);
      }

      const aiMsg: Message = {
        sender: "ai",
        message: completeAiMessage.trim(),
        timestamp: new Date(),
      };

      // Add AI message to conversation
      conversation.messages.push(aiMsg);
      await conversation.save();

    } catch (streamError) {
      console.error('Stream processing error:', streamError);
      
      // If it's an empty response error, try fallback
      if (streamError instanceof Error && streamError.message.includes('No response received')) {
        // Try fallback models
        const fallbackModels = getRecommendedFallbacks(normalizedModelName).filter(m => m !== normalizedModelName);
        
        for (const fallbackModel of fallbackModels) {
          try {
            const fallbackResult = await streamTextWithFallback({
              modelName: fallbackModel,
              messages: formattedMessages,
              temperature: 0.7,
              maxTokens: Math.min(1000, getModelConfig(fallbackModel).maxTokens),
            }, []);
            
            if (fallbackResult.success) {
              let hasContent = false;
              for await (const chunk of fallbackResult.textStream!) {
                if (chunk && chunk.trim().length > 0) {
                  hasContent = true;
                }
                completeAiMessage += chunk;
                res.write(chunk);
                await new Promise(resolve => setTimeout(resolve, 30));
              }
              
              if (hasContent && completeAiMessage.trim().length > 0) {
                const aiMsg: Message = {
                  sender: "ai",
                  message: completeAiMessage.trim(),
                  timestamp: new Date(),
                };
                conversation.messages.push(aiMsg);
                await conversation.save();
                res.end();
                return;
              }
            }
          } catch (fallbackError) {
            continue;
          }
        }
      }
      
      if (completeAiMessage.length > 0) {
        const aiMsg: Message = {
          sender: "ai",
          message: completeAiMessage + " [Stream interrupted]",
          timestamp: new Date(),
        };
        conversation.messages.push(aiMsg);
        await conversation.save();
      }

      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          error: "Failed to stream AI response" 
        });
        return;
      }
    } finally {   
      res.end();
    }

  } catch (error: unknown) {
    console.error("Error in streaming chat message:", error instanceof Error ? error.message : String(error));
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: "Failed to get AI response" 
      });
    } else {
      res.end();
    }
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.uid || authReq.user.id!;
    const conversations = await ChatMessage.find({ user: userId }).sort({ updatedAt: -1 });

    const conversationsWithContext = conversations.map(conv => ({
      ...conv.toObject(),
      hasCRMContext: true,
    }));

    res.json({
      success: true,
      conversations: conversationsWithContext
    });
  } catch (error: unknown) {
    console.error("Error fetching chat history:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: "Failed to fetch chat history" });
  }
};

export const getConversation = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { conversationId } = req.params;
    const userId = authReq.user.uid || authReq.user.id!;

    const conversation = await ChatMessage.findOne({ conversationId, user: userId });

    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }

    const crmContext = await getCRMContext(userId);

    res.json({
      success: true,
      conversation,
      crmContext: crmContext
        ? {
            contactsCount: crmContext.contacts.length,
            activitiesCount: crmContext.activities.length,
            totalContacts: crmContext.contactStats.totalContacts,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error("Error fetching conversation:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: "Failed to fetch conversation" });
  }
};

export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { conversationId } = req.params;
    const userId = authReq.user.uid || authReq.user.id!;

    const result = await ChatMessage.deleteOne({ conversationId, user: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }

    res.json({ success: true, message: "Conversation deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting conversation:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: "Failed to delete conversation" });
  }
};

export const updateConversationTitle = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { conversationId } = req.params;
    const { title } = req.body;
    const userId = authReq.user.uid || authReq.user.id!;

    const conversation = await ChatMessage.findOneAndUpdate(
      { conversationId, user: userId },
      { title },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }

    res.json({ success: true, conversation });
  } catch (error: unknown) {
    console.error("Error updating conversation title:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: "Failed to update conversation title" });
  }
};

