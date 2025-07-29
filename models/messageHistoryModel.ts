import mongoose, { Document, Schema, model, models } from "mongoose";

export enum MessageStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed"
}

export interface IMessageHistory extends Document {
  user: string;
  contactId: string;
  contactName: string;
  phoneNumber: string;
  messageContent: string;
  status: MessageStatus;
  whatsappMessageId?: string;
  prompt: string;
  generatedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  metadata?: {
    aiModel: string;
    contextUsed: string[];
    generationTime: number;
  };
}

const messageHistorySchema = new Schema<IMessageHistory>({
  user: { type: String, required: true },
  contactId: { type: String, required: true },
  contactName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  messageContent: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.PENDING,
    required: true,
  },
  whatsappMessageId: { type: String },
  prompt: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  errorMessage: { type: String },
  metadata: {
    aiModel: { type: String },
    contextUsed: [{ type: String }],
    generationTime: { type: Number },
  },
});

// Index for efficient querying
messageHistorySchema.index({ user: 1, contactId: 1, generatedAt: -1 });
messageHistorySchema.index({ status: 1 });
messageHistorySchema.index({ whatsappMessageId: 1 });

const MessageHistory = models.MessageHistory || model<IMessageHistory>("MessageHistory", messageHistorySchema);

export default MessageHistory;