"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse_message_versions = exports.create_message_prompt = exports.get_ai_model = void 0;
const openai_1 = require("@langchain/openai");
// AI model for message generation
const get_ai_model = (modelName = 'gpt-4o-mini') => {
    return new openai_1.ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName,
        temperature: 0.7,
        maxTokens: 500,
    });
};
exports.get_ai_model = get_ai_model;
// Prompt template for message generation
const create_message_prompt = ({ prompt, contactInfo, context, previousMessages }) => {
    return `You are a professional SMS message generator for a CRM system. Generate personalized, friendly, and professional SMS messages.

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
exports.create_message_prompt = create_message_prompt;
// Helper function to parse AI response into message versions
const parse_message_versions = (ai_response) => {
    const versions = [];
    const lines = ai_response.split('\n');
    for (const line of lines) {
        const match = line.match(/Version \d+:\s*(.+)/i);
        if (match) {
            versions.push(match[1].trim());
        }
    }
    // If parsing fails, return the entire response as one version
    if (versions.length === 0) {
        return [ai_response.trim()];
    }
    return versions.slice(0, 3); // Return max 3 versions
};
exports.parse_message_versions = parse_message_versions;
