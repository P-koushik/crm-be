import mongoose, { Schema, model, models, Document, Types } from "mongoose";

export interface UserTag extends Document {
  name: string;
  color: string;
  user: string;
}

const tagSchema = new Schema<UserTag>({
  name: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: "#3b82f6",
    required: true,
  },
  user: {
    type: String,
    ref: "User", 
    required: true,
  },
});


const Tag = models.Tag || model<UserTag>("Tag", tagSchema);
export default Tag;
