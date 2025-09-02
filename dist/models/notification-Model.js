"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPriority = exports.NotificationStatus = exports.NotificationType = void 0;
const mongoose_1 = require("mongoose");
var NotificationType;
(function (NotificationType) {
    NotificationType["ADMIN_MESSAGE"] = "admin_message";
    NotificationType["SYSTEM_NOTIFICATION"] = "system_notification";
    NotificationType["CONTACT_UPDATE"] = "contact_update";
    NotificationType["ACTIVITY_REMINDER"] = "activity_reminder";
    NotificationType["TEAM_INVITE"] = "team_invite";
    NotificationType["GENERAL"] = "general";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["UNREAD"] = "unread";
    NotificationStatus["READ"] = "read";
    NotificationStatus["ARCHIVED"] = "archived";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["MEDIUM"] = "medium";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["URGENT"] = "urgent";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
const notification_schema = new mongoose_1.Schema({
    recipient_uid: {
        type: String,
        required: true,
        ref: "User",
    },
    sender_uid: {
        type: String,
        ref: "User",
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: Object.values(NotificationType),
        default: NotificationType.GENERAL,
    },
    status: {
        type: String,
        enum: Object.values(NotificationStatus),
        default: NotificationStatus.UNREAD,
    },
    priority: {
        type: String,
        enum: Object.values(NotificationPriority),
        default: NotificationPriority.MEDIUM,
    },
    metadata: {
        relatedId: String,
        relatedType: String,
        actionUrl: String,
        expiresAt: Date,
    },
    readAt: Date,
}, {
    timestamps: true,
});
const Notification = mongoose_1.models.Notification || (0, mongoose_1.model)("Notification", notification_schema);
exports.default = Notification;
