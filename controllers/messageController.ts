import { Request, Response } from "express";
import { ChatOpenAI } from "@langchain/openai";
import { vectorSearchService } from "../lib/vectorSearch";
import { whatsappService } from "../lib/whatsappService";
import Contact from "../models/contactmodel";
import MessageHistory, { MessageStatus } from "../models/messageHistoryModel";
import { logActivity } from "../activitylogger";
import { ActivityTypes } from "../models/activityModel";

interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
  };
}

interface GenerateMessageRequest {
  prompt: string;
  contactIds: string[];
  model?: string;
}

interface SendMessageRequest {
  messageContent: string;
  contactIds: string[];
  prompt: string;
}

// AI model for message generation
const getAIModel = (modelName: string = 'gpt-4o-mini') => {
  return new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName,
    temperature: 0.7,
    maxTokens: 500,
  });
};

// Prompt template for message generation
const createMessagePrompt = (
  prompt: string,
  contactInfo: string,
  context: string,
  previousMessages: string
): string => {
  return `You are a professional WhatsApp message generator for a CRM system. Generate personalized, friendly, and professional WhatsApp messages.

CONTACT INFORMATION:
${contactInfo}

USER PROMPT:
${prompt}

RELEVANT CONTEXT (from previous interactions, notes, activities):
${context}

PREVIOUS MESSAGES (for context):
${previousMessages}

INSTRUCTIONS:
- Generate 3 different versions of the message
- Keep messages concise (under 200 characters)
- Use a friendly, professional tone
- Personalize based on contact information and context
- Include relevant details from the context
- Make it sound natural and conversational
- Avoid generic messages - be specific to the contact and situation

FORMAT YOUR RESPONSE AS:
Version 1: [message]
Version 2: [message]
Version 3: [message]

Generate the 3 message versions:`;
};

export const generate_message = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { prompt, contactIds, model = 'gpt-4o-mini' }: GenerateMessageRequest = req.body;
    const userId = authReq.user.uid;

    if (!prompt || !contactIds || contactIds.length === 0) {
      res.status(400).json({
        success: false,
        error: "Prompt and contact IDs are required",
      });
      return;
    }

    const results = [];

    for (const contactId of contactIds) {
      try {
        // Get contact information
        const contact = await Contact.findOne({ _id: contactId, user: userId });
        if (!contact) {
          results.push({
            contactId,
            success: false,
            error: "Contact not found",
          });
          continue;
        }

        // Get relevant context using RAG
        const contextResults = await vectorSearchService.searchSimilarContent(
          userId,
          contactId,
          prompt,
          5
        );

        // Get previous messages
        const previousMessages = await MessageHistory.find({
          contactId,
          user: userId,
        })
          .sort({ generatedAt: -1 })
          .limit(3);

        // Prepare context
        const context = contextResults
          .map(result => `${result.contentType}: ${result.content}`)
          .join('\n');

        const previousMessagesText = previousMessages
          .map(msg => `- ${msg.messageContent}`)
          .join('\n');

        // Create contact info string
        const contactInfo = `
Name: ${contact.name}
Email: ${contact.email}
Phone: ${contact.phone}
Company: ${contact.company}
Tags: ${contact.tags?.join(', ') || 'None'}
Notes: ${contact.note || 'None'}
        `.trim();

        // Generate message using AI
        const aiModel = getAIModel(model);
        const fullPrompt = createMessagePrompt(prompt, contactInfo, context, previousMessagesText);
        
        const startTime = Date.now();
        const aiResponse = await aiModel.invoke(fullPrompt);
        const generationTime = Date.now() - startTime;

        // Parse the response to extract versions
        const responseContent = typeof aiResponse.content === 'string' 
          ? aiResponse.content 
          : JSON.stringify(aiResponse.content);
        const versions = parse_message_versions(responseContent);

        // Store each version in message history
        const storedMessages = [];
        for (const version of versions) {
          const messageHistory = await MessageHistory.create({
            user: userId,
            contactId,
            contactName: contact.name,
            phoneNumber: contact.phone,
            messageContent: version,
            status: MessageStatus.PENDING,
            prompt,
            metadata: {
              aiModel: model,
              contextUsed: contextResults.map(r => r.contentType),
              generationTime,
            },
          });
          storedMessages.push(messageHistory);
        }

        results.push({
          contactId,
          contactName: contact.name,
          phoneNumber: contact.phone,
          success: true,
          messages: storedMessages,
          context: contextResults,
        });

      } catch (error) {
        console.error(`Error generating message for contact ${contactId}:`, error);
        results.push({
          contactId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    res.status(200).json({
      success: true,
      results,
    });

  } catch (error) {
    console.error("Error generating messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate messages",
    });
  }
};

export const send_message = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { messageContent, contactIds, prompt }: SendMessageRequest = req.body;
    const userId = authReq.user.uid;

    if (!messageContent || !contactIds || contactIds.length === 0) {
      res.status(400).json({
        success: false,
        error: "Message content and contact IDs are required",
      });
      return;
    }

    const results = [];

    for (const contactId of contactIds) {
      try {
        // Get contact information
        const contact = await Contact.findOne({ _id: contactId, user: userId });
        if (!contact) {
          results.push({
            contactId,
            success: false,
            error: "Contact not found",
          });
          continue;
        }

        // Validate phone number
        const isValidPhone = await whatsappService.validatePhoneNumber(contact.phone);
        if (!isValidPhone) {
          results.push({
            contactId,
            success: false,
            error: "Invalid phone number",
          });
          continue;
        }

        // Send message via WhatsApp
        const whatsappResult = await whatsappService.sendMessage(
          contact.phone,
          messageContent
        );

        // Update message history
        await MessageHistory.findOneAndUpdate(
          {
            user: userId,
            contactId,
            messageContent,
            status: MessageStatus.PENDING,
          },
          {
            status: MessageStatus.SENT,
            whatsappMessageId: whatsappResult.messageId,
            sentAt: new Date(),
          }
        );

        // Log activity
        await logActivity(
          userId,
          ActivityTypes.CONTACT_EDITED,
          `Sent WhatsApp message to ${contact.name}: ${messageContent.substring(0, 50)}...`,
          contactId
        );

        results.push({
          contactId,
          contactName: contact.name,
          phoneNumber: contact.phone,
          success: true,
          messageId: whatsappResult.messageId,
          waId: whatsappResult.waId,
        });

      } catch (error) {
        console.error(`Error sending message to contact ${contactId}:`, error);
        
        // Update message history with error
        await MessageHistory.findOneAndUpdate(
          {
            user: userId,
            contactId,
            messageContent,
            status: MessageStatus.PENDING,
          },
          {
            status: MessageStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          }
        );

        results.push({
          contactId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    res.status(200).json({
      success: true,
      results,
    });

  } catch (error) {
    console.error("Error sending messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send messages",
    });
  }
};

// Helper function to parse AI response into message versions
function parse_message_versions(aiResponse: string): string[] {
  const versions: string[] = [];
  const lines = aiResponse.split('\n');
  
  for (const line of lines) {
    const match = line.match(/Version \d+:\s*(.+)/i);
    if (match) {
      versions.push(match[1].trim());
    }
  }
  
  // If parsing fails, return the entire response as one version
  if (versions.length === 0) {
    return [aiResponse.trim()];
  }
  
  return versions.slice(0, 3); // Return max 3 versions
}