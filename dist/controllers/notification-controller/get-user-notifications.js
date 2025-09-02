"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_user_notifications = void 0;
const notification_Model_1 = __importDefault(require("../../models/notification-Model"));
const get_user_notifications = async (req, res) => {
    try {
        // Cast to authenticated request after middleware
        const auth_req = req;
        const user_uid = auth_req.user.uid;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const type = req.query.type;
        // Build query
        const query = { recipient_uid: user_uid };
        if (status && status !== "all") {
            query.status = status;
        }
        if (type && type !== "all") {
            query.type = type;
        }
        // Calculate skip value for pagination
        const skip = (page - 1) * limit;
        // Get notifications with pagination
        const notifications = await notification_Model_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("sender_uid", "name email photoUrl");
        // Get total count for pagination
        const total = await notification_Model_1.default.countDocuments(query);
        const total_pages = Math.ceil(total / limit);
        res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                page,
                limit,
                total,
                total_pages,
                has_next: page < total_pages,
                has_prev: page > 1,
            },
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Get notifications error:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to fetch notifications"
        });
    }
};
exports.get_user_notifications = get_user_notifications;
