"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPriority = exports.NotificationStatus = exports.NotificationType = exports.UserRole = exports.ContentType = exports.MessageStatus = exports.SenderType = exports.ActivityTypes = void 0;
var ActivityTypes;
(function (ActivityTypes) {
    ActivityTypes["CONTACT_CREATED"] = "CONTACT CREATED";
    ActivityTypes["CONTACT_DELETED"] = "CONTACT DELETED";
    ActivityTypes["CONTACT_EDITED"] = "CONTACT EDITED";
    ActivityTypes["TAG_CREATED"] = "TAG CREATED";
    ActivityTypes["TAG_EDITED"] = "TAG EDITED";
    ActivityTypes["TAG_DELETED"] = "TAG DELETED";
    ActivityTypes["BULK_IMPORT_CONTACTS"] = "BULK IMPORT CONTACTS";
    ActivityTypes["BULK_DELETE_CONTACTS"] = "BULK DELETE CONTACTS";
    ActivityTypes["FORCE_DELETE_TAG"] = "FORCE DELETE TAG";
    ActivityTypes["ACCOUNT_DELETED"] = "ACCOUNT DELETED";
})(ActivityTypes || (exports.ActivityTypes = ActivityTypes = {}));
var SenderType;
(function (SenderType) {
    SenderType["USER"] = "user";
    SenderType["AI"] = "ai";
})(SenderType || (exports.SenderType = SenderType = {}));
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["PENDING"] = "pending";
    MessageStatus["SENT"] = "sent";
    MessageStatus["DELIVERED"] = "delivered";
    MessageStatus["READ"] = "read";
    MessageStatus["FAILED"] = "failed";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
var ContentType;
(function (ContentType) {
    ContentType["ACTIVITY"] = "activity";
    ContentType["NOTE"] = "note";
    ContentType["MESSAGE_HISTORY"] = "message_history";
    ContentType["MEETING_NOTE"] = "meeting_note";
    ContentType["PREFERENCE"] = "preference";
})(ContentType || (exports.ContentType = ContentType = {}));
// Role-based authentication types
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["USER"] = "user";
    UserRole["INDIVIDUAL"] = "individual";
})(UserRole || (exports.UserRole = UserRole = {}));
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
