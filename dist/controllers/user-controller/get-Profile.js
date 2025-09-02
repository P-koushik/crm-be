"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_profile = void 0;
const zod_1 = require("zod");
const user_Model_1 = __importDefault(require("../../models/user-Model"));
// Zod Schema for validation
const get_profile_schema = zod_1.z.object({
// No body validation needed for GET requests
});
const get_profile = async (req, res) => {
    try {
        // Validate request (no body validation needed for GET)
        const validated_data = get_profile_schema.parse(req);
        const auth_req = req;
        const user_id = auth_req.user.uid;
        const user = await user_Model_1.default.findOne({ uid: user_id });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.status(200).json({
            user: {
                _id: user._id,
                uid: user.uid,
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                company: user.company || "",
                photoUrl: user.photoUrl || "",
                role: user.role || "",
                organizationName: user.organizationName || "",
                teamCode: user.teamCode || "",
                team: user.team,
                isActive: user.isActive,
                lastLoginAt: user.lastLoginAt,
                walkthrough: user.walkthrough || [],
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            message: "Profile retrieved successfully",
            success: true,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error retrieving profile:", errorMessage);
        res.status(500).json({ error: "Failed to retrieve profile" });
    }
};
exports.get_profile = get_profile;
