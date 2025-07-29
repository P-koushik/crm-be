import mongoose, { Document, Schema, model, models } from "mongoose";

export enum ContentType {
  ACTIVITY = "activity",
  NOTE = "note",
  MESSAGE_HISTORY = "message_history",
  MEETING_NOTE = "meeting_note",
  PREFERENCE = "preference"
}

export interface IVectorStore extends Document {
  user: string;
  contactId: string;
  contentType: ContentType;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    timestamp: Date;
    tags?: string[];
    importance?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const vectorStoreSchema = new Schema<IVectorStore>({
  user: { type: String, required: true },
  contactId: { type: String, required: true },
  contentType: {
    type: String,
    enum: Object.values(ContentType),
    required: true,
  },
  content: { type: String, required: true },
  embedding: [{ type: Number, required: true }],
  metadata: {
    source: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tags: [{ type: String }],
    importance: { type: Number, default: 1.0 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for vector search
vectorStoreSchema.index({ user: 1, contactId: 1 });
vectorStoreSchema.index({ contentType: 1 });
vectorStoreSchema.index({ "metadata.tags": 1 });

const VectorStore = models.VectorStore || model<IVectorStore>("VectorStore", vectorStoreSchema);

export default VectorStore;