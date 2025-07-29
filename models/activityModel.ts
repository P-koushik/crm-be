import mongoose, { Document, Schema, model, models } from "mongoose";

export enum ActivityTypes {
  CONTACT_CREATED = "CONTACT CREATED",
  CONTACT_DELETED = "CONTACT DELETED",
  CONTACT_EDITED = "CONTACT EDITED",
  TAG_CREATED = "TAG CREATED",
  TAG_EDITED = "TAG EDITED",
  TAG_DELETED = "TAG DELETED",
  BULK_IMPORT_CONTACTS = "BULK IMPORT CONTACTS",
  BULK_DELETE_CONTACTS = "BULK DELETE CONTACTS",
  FORCE_DELETE_TAG = "FORCE DELETE TAG",
  ACCOUNT_DELETED = "ACCOUNT DELETED"
}

export interface IActivity extends Document {
  contactId?: string;
  user: string;
  activityType: ActivityTypes;
  timestamp: Date;
  details?: string;
}

const activitySchema = new Schema<IActivity>({
  contactId: { type: String, required: false },
  user: { type: String, required: true },
  activityType: {
    type: String,
    enum: Object.values(ActivityTypes),
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
});

const Activity = models.Activity || model<IActivity>("Activity", activitySchema);

export default Activity;
