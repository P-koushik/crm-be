import { OpenAIEmbeddings } from '@langchain/openai';
import VectorStore, { ContentType } from '../models/vectorStoreModel';
import Contact from '../models/contactmodel';
import Activity from '../models/activityModel';
import MessageHistory from '../models/messageHistoryModel';

interface SearchResult {
  content: string;
  contentType: ContentType;
  metadata: {
    source: string;
    timestamp: Date;
    tags?: string[];
    importance?: number;
  };
  similarity: number;
}

export class VectorSearchService {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Generate embedding for text
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  // Store content with embedding
  async storeContent(
    userId: string,
    contactId: string,
    contentType: ContentType,
    content: string,
    metadata: {
      source: string;
      tags?: string[];
      importance?: number;
    }
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content);
      
      await VectorStore.create({
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
    } catch (error) {
      console.error('Error storing content:', error);
      throw new Error('Failed to store content');
    }
  }

  // Search for similar content
  async searchSimilarContent(
    userId: string,
    contactId: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Get all stored content for this contact
      const storedContent = await VectorStore.find({
        user: userId,
        contactId,
      }).lean();

      if (storedContent.length === 0) {
        return [];
      }

      // Calculate cosine similarity
      const results: SearchResult[] = [];
      
      for (const item of storedContent) {
        const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
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
    } catch (error) {
      console.error('Error searching similar content:', error);
      throw new Error('Failed to search similar content');
    }
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Index existing contact data
  async indexContactData(userId: string, contactId: string): Promise<void> {
    try {
      // Get contact information
      const contact = await Contact.findOne({ _id: contactId, user: userId });
      if (!contact) {
        throw new Error('Contact not found');
      }

      // Index contact notes
      if (contact.note) {
        await this.storeContent(userId, contactId, ContentType.NOTE, contact.note, {
          source: 'contact_note',
          tags: contact.tags,
        });
      }

      // Index activities
      const activities = await Activity.find({ contactId, user: userId })
        .sort({ timestamp: -1 })
        .limit(10);

      for (const activity of activities) {
        await this.storeContent(userId, contactId, ContentType.ACTIVITY, 
          `${activity.activityType}: ${activity.details}`, {
          source: 'activity_log',
          tags: [activity.activityType],
        });
      }

      // Index message history
      const messages = await MessageHistory.find({ contactId, user: userId })
        .sort({ generatedAt: -1 })
        .limit(10);

      for (const message of messages) {
        await this.storeContent(userId, contactId, ContentType.MESSAGE_HISTORY,
          `Previous message: ${message.messageContent}`, {
          source: 'message_history',
          tags: [message.status],
        });
      }

    } catch (error) {
      console.error('Error indexing contact data:', error);
      throw new Error('Failed to index contact data');
    }
  }
}

export const vectorSearchService = new VectorSearchService();