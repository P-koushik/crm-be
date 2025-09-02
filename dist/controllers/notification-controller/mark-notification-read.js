"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mark_notification_read = void 0;
const notification_Model_1 = __importDefault(require("../../models/notification-Model"));
const mark_notification_read = async (req, res) => {
    try {
        // Cast to authenticated request after middleware
        const auth_req = req;
        const user_uid = auth_req.user.uid;
        const notification_id = req.params.id;
        if (!notification_id) {
            res.status(400).json({ success: false, error: "Notification ID is required" });
            return;
        }
        // Find notification and verify ownership
        const notification = await notification_Model_1.default.findOne({
            _id: notification_id,
            recipient_uid: user_uid,
        });
        if (!notification) {
            res.status(404).json({ success: false, error: "Notification not found" });
            return;
        }
        // Mark as read
        notification.status = "read";
        notification.readAt = new Date();
        await notification.save();
        res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: notification,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Mark notification read error:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to mark notification as read"
        });
    }
};
exports.mark_notification_read = mark_notification_read;
