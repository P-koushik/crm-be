"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate_message = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const message_History_Model_1 = __importDefault(require("../../models/message-History-Model"));
const vector_Search_1 = require("../../lib/vector-Search");
const utils_1 = require("./utils");
// Zod Schema for validation
const generate_message_schema = zod_1.z.object({
    body: zod_1.z.object({
        prompt: zod_1.z.string().min(1, "Prompt is required"),
        contactIds: zod_1.z.array(zod_1.z.string()).min(1, "At least one contact ID is required"),
        model: zod_1.z.string().optional(),
    }),
});
const generate_message = async (req, res) => {
    try {
        // Validate request
        const validated_data = generate_message_schema.parse(req);
        const { prompt, contactIds, model = 'gpt-4o-mini' } = validated_data.body;
        const authReq = req;
        const user_id = authReq.user.uid;
        const results = [];
        for (const contactId of contactIds) {
            try {
                // Get contact information
                const contact = await contact_Model_1.default.findOne({ _id: contactId, user: user_id });
                if (!contact) {
                    results.push({
                        contactId,
                        message: "Contact not found",
                    });
                    continue;
                }
                // Get relevant context using RAG
                const context_results = await vector_Search_1.vectorSearchService.search_similar_content({
                    userId: user_id,
                    contactId,
                    query: prompt,
                    limit: 5
                });
                // Get previous messages
                const previous_messages = await message_History_Model_1.default.find({
                    contactId,
                    user: user_id,
                })
                    .sort({ generatedAt: -1 })
                    .limit(3);
                // Prepare context
                const context = context_results
                    .map((result) => `${result.contentType}: ${result.content}`)
                    .join('\n');
                const previous_messages_text = previous_messages
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
                const aiModel = (0, utils_1.get_ai_model)(model);
                const full_prompt = (0, utils_1.create_message_prompt)({
                    prompt,
                    contactInfo,
                    context,
                    previousMessages: previous_messages_text
                });
                const start_time = Date.now();
                const ai_response = await aiModel.invoke(full_prompt);
                const generation_time = Date.now() - start_time;
                // Parse the response to extract versions
                const response_content = typeof ai_response.content === 'string'
                    ? ai_response.content
                    : JSON.stringify(ai_response.content);
                const versions = (0, utils_1.parse_message_versions)(response_content);
                // Store each version in message history
                const stored_messages = [];
                for (const version of versions) {
                    const message_history = await message_History_Model_1.default.create({
                        user: user_id,
                        contactId,
                        contactName: contact.name,
                        phoneNumber: contact.phone,
                        messageContent: version,
                        status: 'pending',
                        prompt,
                        metadata: {
                            aiModel: model,
                            contextUsed: context_results.map((r) => r.contentType),
                            generationTime: generation_time,
                        },
                    });
                    stored_messages.push(message_history);
                }
                results.push({
                    contactId,
                    contactName: contact.name,
                    phoneNumber: contact.phone,
                    messages: stored_messages,
                    context: context_results,
                });
            }
            catch (error) {
                console.error(`Error generating message for contact ${contactId}:`, error);
                results.push({
                    contactId,
                    message: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
        res.json({
            message: "Messages generated successfully",
            data: { results }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("Validation error:", error.errors);
            res.status(400).json({
                error: "Invalid request data",
                details: error.errors
            });
            return;
        }
        console.error("Error generating messages:", error);
        res.status(500).json({
            error: "Failed to generate messages",
        });
    }
};
exports.generate_message = generate_message;
