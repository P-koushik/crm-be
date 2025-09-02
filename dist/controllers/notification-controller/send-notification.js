"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.send_notification = void 0;
const zod_1 = require("zod");
const types_1 = require("../../types");
const notification_Model_1 = __importDefault(require("../../models/notification-Model"));
const user_Model_1 = __importDefault(require("../../models/user-Model"));
const team_utils_1 = require("../../utils/team-utils");
// Zod Schema for validation
const send_notification_schema = zod_1.z.object({
    body: zod_1.z.object({
        recipient_uid: zod_1.z.string().min(1, "Recipient UID is required"),
        title: zod_1.z.string().min(1, "Title is required").max(100, "Title too long"),
        message: zod_1.z.string().min(1, "Message is required").max(500, "Message too long"),
        type: zod_1.z.nativeEnum(types_1.NotificationType).default(types_1.NotificationType.GENERAL),
        priority: zod_1.z.nativeEnum(types_1.NotificationPriority).default(types_1.NotificationPriority.MEDIUM),
        metadata: zod_1.z.object({
            relatedId: zod_1.z.string().optional(),
            relatedType: zod_1.z.string().optional(),
            actionUrl: zod_1.z.string().url().optional(),
            expiresAt: zod_1.z.string().datetime().optional(),
        }).optional(),
    }),
});
const send_notification = async (req, res) => {
    try {
        // Cast to authenticated request after middleware
        const auth_req = req;
        // Validate request
        const validated_data = send_notification_schema.parse(req);
        const { recipient_uid, title, message, type, priority, metadata } = validated_data.body;
        const sender_uid = auth_req.user.uid;
        // Check if sender has permission to send notifications
        const sender = await user_Model_1.default.findOne({ uid: sender_uid });
        if (!sender) {
            res.status(404).json({ success: false, error: "Sender not found" });
            return;
        }
        // Check if recipient exists
        const recipient = await user_Model_1.default.findOne({ uid: recipient_uid });
        if (!recipient) {
            res.status(404).json({ success: false, error: "Recipient not found" });
            return;
        }
        // Permission checks based on notification type
        if (type === types_1.NotificationType.ADMIN_MESSAGE) {
            // Only admins can send admin messages
            if (sender.role !== "admin") {
                res.status(403).json({ success: false, error: "Only admins can send admin messages" });
                return;
            }
            // Check if sender is admin of recipient's team
            if (recipient.team && sender.team) {
                const is_admin = await (0, team_utils_1.is_team_admin)(recipient.team.toString(), sender_uid);
                if (!is_admin) {
                    res.status(403).json({ success: false, error: "You can only send admin messages to your team members" });
                    return;
                }
            }
        }
        // Create notification
        const notification = new notification_Model_1.default({
            recipient_uid,
            sender_uid,
            title,
            message,
            type,
            priority,
            metadata: metadata ? {
                ...metadata,
                expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : undefined,
            } : undefined,
        });
        await notification.save();
        // Populate sender info for response
        await notification.populate("sender_uid", "name email photoUrl");
        res.status(201).json({
            success: true,
            message: "Notification sent successfully",
            data: notification,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("Validation error:", error.errors);
            res.status(400).json({
                success: false,
                error: "Invalid request data",
                details: error.errors
            });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Send notification error:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to send notification"
        });
    }
};
exports.send_notification = send_notification;
