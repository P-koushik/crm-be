import mongoose, { Schema, model, models, Document } from "mongoose";

export interface UserContact extends Document {
  name: string;
  email: string;
  phone: string;
  company: string;
  tags: string[]; 
  note?: string;
  user: string; 
  createdAt?: Date;
  updatedAt?: Date;
  lastInteraction?: Date;
}


const contactSchema = new Schema<UserContact>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    note: {
      type: String,
    },
    user: {
      type: String, 
      required: true,
    },
    lastInteraction: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, 
  }
);

const Contact = models.Contact || model<UserContact>("Contact", contactSchema);

export default Contact;
