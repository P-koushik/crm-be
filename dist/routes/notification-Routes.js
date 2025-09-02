"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const get_user_notifications_1 = require("../controllers/notification-controller/get-user-notifications");
const send_notification_1 = require("../controllers/notification-controller/send-notification");
const mark_notification_read_1 = require("../controllers/notification-controller/mark-notification-read");
const get_all_users_1 = require("../controllers/notification-controller/get-all-users");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
// All notification routes require authentication
router.use(auth_Middleware_1.default);
// Get user's notifications
router.get("/notifications", get_user_notifications_1.get_user_notifications);
// Send notification
router.post("/notifications/send", send_notification_1.send_notification);
// Mark notification as read
router.patch("/notifications/:id/read", mark_notification_read_1.mark_notification_read);
// Get all users (for notification recipients)
router.get("/users", get_all_users_1.get_all_users);
exports.default = router;
