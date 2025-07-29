import mongoose, { Document, Schema, model, models } from "mongoose";

export interface User extends Document {
  uid: string;
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  photoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<User>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      default: "",
    },
    company: {
      type: String,
      default: "",
    },
    photoUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model<User>("User", userSchema);

export default User;

