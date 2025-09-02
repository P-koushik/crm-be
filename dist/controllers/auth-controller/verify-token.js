"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify_token = void 0;
const zod_1 = require("zod");
const firebase_1 = __importDefault(require("../../firebase"));
const user_Model_1 = __importDefault(require("../../models/user-Model"));
// Zod Schema for validation
const verify_token_schema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, "Token is required"),
    }),
});
const verify_token = async (req, res) => {
    try {
        // Validate request
        const validated_data = verify_token_schema.parse(req);
        const { token } = validated_data.body;
        const decodedToken = await firebase_1.default.auth().verifyIdToken(token);
        const { uid, email, displayName, picture } = decodedToken;
        let user = await user_Model_1.default.findOne({ uid });
        if (!user) {
            user = await user_Model_1.default.create({
                uid,
                email,
                displayName,
                photoURL: picture || "",
            });
        }
        res.status(200).json({ message: "Authenticated", user });
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
        console.error("Token verification failed:", errorMessage);
        res.status(401).json({ error: "Invalid or expired token" });
    }
};
exports.verify_token = verify_token;
