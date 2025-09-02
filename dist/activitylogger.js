"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log_activity = void 0;
const activity_Model_1 = __importDefault(require("./models/activity-Model"));
// Optional: Interface for log_activity function parameters
const log_activity = async (user_id, activity_type, details = "", contact_id) => {
    try {
        if (!user_id) {
            console.error("No user ID provided for activity logging");
            return;
        }
        await activity_Model_1.default.create({
            user: user_id,
            activityType: activity_type,
            details,
            contactId: contact_id || undefined,
            timestamp: new Date(),
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Activity logging failed:", errorMessage);
    }
};
exports.log_activity = log_activity;
