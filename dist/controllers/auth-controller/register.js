"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register_user = void 0;
const zod_1 = require("zod");
const user_Model_1 = __importDefault(require("../../models/user-Model"));
// Zod Schema for validation
const register_schema = zod_1.z.object({
    body: zod_1.z.object({
        uid: zod_1.z.string().min(1, "UID is required"),
        email: zod_1.z.string().email("Valid email is required"),
        name: zod_1.z.string().optional(),
        photoURL: zod_1.z.string().optional(),
    }),
});
const register_user = async (req, res) => {
    try {
        // Validate request
        const validated_data = register_schema.parse(req);
        const { uid, email, name, photoURL } = validated_data.body;
        // First check if user exists by uid
        let user = await user_Model_1.default.findOne({ uid });
        let isNewUser = false;
        if (!user) {
            // If not found by uid, check by email
            user = await user_Model_1.default.findOne({ email });
            if (!user) {
                // Create new user if not found by either uid or email
                user = new user_Model_1.default({
                    uid,
                    email,
                    name: name || "",
                    photoURL: photoURL || "",
                    // Don't set a default role - let user choose later
                });
                await user.save();
                isNewUser = true;
            }
            else {
                // User exists by email but not uid, update the uid
                user.uid = uid;
                if (name)
                    user.name = name;
                if (photoURL)
                    user.photoURL = photoURL;
                await user.save();
                isNewUser = false;
            }
        }
        else {
            // User exists by uid, update other fields if provided
            if (name)
                user.name = name;
            if (photoURL)
                user.photoURL = photoURL;
            await user.save();
            isNewUser = false;
        }
        res.status(201).json({
            message: "User synced successfully",
            data: {
                user,
                isNew: isNewUser,
                hasRole: !!user.role
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("Validation error:", error.errors);
            res.status(400).json({
                error: "Invalid request data",
                details: error.errors
            });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Sync error:", errorMessage);
        res.status(500).json({ error: "Failed to sync user" });
    }
};
exports.register_user = register_user;
