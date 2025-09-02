"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorSearchService = exports.VectorSearchService = void 0;
const openai_1 = require("@langchain/openai");
const vector_Store_Model_1 = __importDefault(require("../models/vector-Store-Model"));
const contact_Model_1 = __importDefault(require("../models/contact-Model"));
const activity_Model_1 = __importDefault(require("../models/activity-Model"));
const message_History_Model_1 = __importDefault(require("../models/message-History-Model"));
const types_1 = require("../types");
class VectorSearchService {
    constructor() {
        this.embeddings = new openai_1.OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
    }
    // Generate embedding for text
    async generate_embedding(text) {
        try {
            const embedding = await this.embeddings.embedQuery(text);
            return embedding;
        }
        catch (error) {
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }
    // Store content with embedding
    async store_content(params) {
        const { userId, contactId, contentType, content, metadata } = params;
        try {
            const embedding = await this.generate_embedding(content);
            await vector_Store_Model_1.default.create({
                user: userId,
                contactId,
                contentType,
                content,
                embedding,
                metadata: {
                    ...metadata,
                    timestamp: new Date(),
                },
            });
        }
        catch (error) {
            console.error('Error storing content:', error);
            throw new Error('Failed to store content');
        }
    }
    // Search for similar content
    async search_similar_content(params) {
        const { userId, contactId, query, limit = 5 } = params;
        try {
            const query_embedding = await this.generate_embedding(query);
            // Get all stored content for this contact
            const stored_content = await vector_Store_Model_1.default.find({
                user: userId,
                contactId,
            }).lean();
            if (stored_content.length === 0) {
                return [];
            }
            // Calculate cosine similarity
            const results = [];
            for (const item of stored_content) {
                const similarity = this.cosine_similarity({ vecA: query_embedding, vecB: item.embedding });
                results.push({
                    content: item.content,
                    contentType: item.contentType,
                    metadata: item.metadata,
                    similarity,
                });
            }
            // Sort by similarity and return top results
            return results
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        }
        catch (error) {
            console.error('Error searching similar content:', error);
            throw new Error('Failed to search similar content');
        }
    }
    // Calculate cosine similarity between two vectors
    cosine_similarity(params) {
        const { vecA, vecB } = params;
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }
        let dot_product = 0;
        let norm_a = 0;
        let norm_b = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot_product += vecA[i] * vecB[i];
            norm_a += vecA[i] * vecA[i];
            norm_b += vecB[i] * vecB[i];
        }
        norm_a = Math.sqrt(norm_a);
        norm_b = Math.sqrt(norm_b);
        if (norm_a === 0 || norm_b === 0) {
            return 0;
        }
        return dot_product / (norm_a * norm_b);
    }
    // Index existing contact data
    async index_contact_data(params) {
        const { userId, contactId } = params;
        try {
            // Get contact information
            const contact = await contact_Model_1.default.findOne({ _id: contactId, user: userId });
            if (!contact) {
                throw new Error('Contact not found');
            }
            // Index contact notes
            if (contact.note) {
                await this.store_content({
                    userId,
                    contactId,
                    contentType: types_1.ContentType.NOTE,
                    content: contact.note,
                    metadata: {
                        source: 'contact_note',
                        tags: contact.tags,
                    },
                });
            }
            // Index activities
            const activities = await activity_Model_1.default.find({ contactId, user: userId })
                .sort({ timestamp: -1 })
                .limit(10);
            for (const activity of activities) {
                await this.store_content({
                    userId,
                    contactId,
                    contentType: types_1.ContentType.ACTIVITY,
                    content: `${activity.activityType}: ${activity.details}`,
                    metadata: {
                        source: 'activity_log',
                        tags: [activity.activityType],
                    },
                });
            }
            // Index message history
            const messages = await message_History_Model_1.default.find({ contactId, user: userId })
                .sort({ generatedAt: -1 })
                .limit(10);
            for (const message of messages) {
                await this.store_content({
                    userId,
                    contactId,
                    contentType: types_1.ContentType.MESSAGE_HISTORY,
                    content: `Previous message: ${message.messageContent}`,
                    metadata: {
                        source: 'message_history',
                        tags: [message.status],
                    },
                });
            }
        }
        catch (error) {
            console.error('Error indexing contact data:', error);
            throw new Error('Failed to index contact data');
        }
    }
}
exports.VectorSearchService = VectorSearchService;
exports.vectorSearchService = new VectorSearchService();
