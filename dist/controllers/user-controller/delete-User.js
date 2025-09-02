"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete_user = void 0;
const zod_1 = require("zod");
const auth_1 = require("firebase-admin/auth");
const user_Model_1 = __importDefault(require("../../models/user-Model"));
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const activity_Model_1 = __importDefault(require("../../models/activity-Model"));
const chat_Model_1 = __importDefault(require("../../models/chat-Model"));
const message_History_Model_1 = __importDefault(require("../../models/message-History-Model"));
const vector_Store_Model_1 = __importDefault(require("../../models/vector-Store-Model"));
// Zod Schema for validation
const DeleteUserSchema = zod_1.z.object({
// No body validation needed for DELETE requests
});
const delete_user = async (req, res) => {
    try {
        // Validate request (no body validation needed for DELETE)
        DeleteUserSchema.parse({});
        const authReq = req;
        const userId = authReq.user.uid;
        // Get user before deletion for logging
        const user = await user_Model_1.default.findOne({ uid: userId });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        // Delete all user data in parallel (including MessageHistory and VectorStore)
        await Promise.all([
            contact_Model_1.default.deleteMany({ user: userId }),
            tags_Model_1.default.deleteMany({ user: userId }),
            activity_Model_1.default.deleteMany({ user: userId }),
            chat_Model_1.default.deleteMany({ user: userId }),
            message_History_Model_1.default.deleteMany({ user: userId }),
            vector_Store_Model_1.default.deleteMany({ user: userId }),
            user_Model_1.default.deleteOne({ uid: userId }),
        ]);
        // Delete user from Firebase Auth
        try {
            await (0, auth_1.getAuth)().deleteUser(userId);
        }
        catch (error) {
            console.error("Error deleting user from Firebase Auth:", error);
            // Continue with response even if Firebase Auth deletion fails
        }
        // Don't log account deletion activity since we're deleting all user data
        // This prevents any leftover activity data from interfering with new user walkthrough
        res.status(200).json({
            success: true,
            message: "Account and all associated data deleted successfully",
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error deleting user:", errorMessage);
        res.status(500).json({ error: "Failed to delete account" });
    }
};
exports.delete_user = delete_user;
