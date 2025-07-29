
import { Schema, model, models, Document } from "mongoose";

export enum SenderType {
  USER = "user",
  AI = "ai",
}

export interface UserMessage {
  sender: SenderType;
  message: string;
  timestamp?: Date;
}

export interface UserChatMessage extends Document {
  conversationId: string;
  user: string;
  title?: string;
  messages: UserMessage[];
  contextSummary?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new Schema<UserMessage>(
  {
    sender: {
      type: String,
      enum: Object.values(SenderType),
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } 
);

const chatSchema = new Schema<UserChatMessage>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: () => `Chat - ${new Date().toLocaleDateString()}`,
    },
    messages: [messageSchema],
    contextSummary: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, 
  }
);

chatSchema.index({ user: 1, conversationId: 1 });

const ChatMessage =
  models.ChatMessage || model<UserChatMessage>("ChatMessage", chatSchema);

export default ChatMessage;
