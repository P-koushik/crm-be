"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_all_users = void 0;
const user_Model_1 = __importDefault(require("../../models/user-Model"));
const get_all_users = async (req, res) => {
    try {
        // Cast to authenticated request after middleware
        const auth_req = req;
        const user_uid = auth_req.user.uid;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const search = req.query.search;
        // Get current user to check role and team
        const current_user = await user_Model_1.default.findOne({ uid: user_uid });
        if (!current_user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        // Build query based on user role
        let query = { isActive: true };
        if (current_user.role === "admin") {
            // Admins can see all users in their team
            if (current_user.team) {
                query.team = current_user.team;
            }
        }
        else if (current_user.role === "user") {
            // Regular users can only see other users in their team
            if (current_user.team) {
                query.team = current_user.team;
            }
        }
        else {
            // Individual users can't see other users
            res.status(403).json({ success: false, error: "Access denied" });
            return;
        }
        // Add search filter if provided
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { company: { $regex: search, $options: "i" } },
            ];
        }
        // Calculate skip value for pagination
        const skip = (page - 1) * limit;
        // Get users with pagination
        const users = await user_Model_1.default.find(query)
            .select("uid name email photoUrl company role")
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);
        // Get total count for pagination
        const total = await user_Model_1.default.countDocuments(query);
        const total_pages = Math.ceil(total / limit);
        res.status(200).json({
            success: true,
            data: users,
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
        console.error("Get all users error:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to fetch users"
        });
    }
};
exports.get_all_users = get_all_users;
