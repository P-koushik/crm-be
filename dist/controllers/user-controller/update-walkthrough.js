"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.update_walkthrough = void 0;
const zod_1 = require("zod");
const user_Model_1 = __importDefault(require("../../models/user-Model"));
// Zod Schema for validation
const update_walkthrough_schema = zod_1.z.object({
    body: zod_1.z.object({
        page_name: zod_1.z.string().min(1, "Page name is required"),
        completed: zod_1.z.boolean(),
    }),
});
const update_walkthrough = async (req, res) => {
    try {
        // Validate request
        const validated_data = update_walkthrough_schema.parse(req);
        const { page_name, completed } = validated_data.body;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        const user = await user_Model_1.default.findOne({ uid: user_id });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        // Initialize walkthrough array if it doesn't exist
        if (!user.walkthrough) {
            user.walkthrough = [];
        }
        // Find existing walkthrough entry for this page
        const existing_walkthrough = user.walkthrough.find((w) => w.page_name === page_name);
        if (existing_walkthrough) {
            // Update existing entry
            existing_walkthrough.completed = completed;
        }
        else {
            // Add new entry
            user.walkthrough.push({
                page_name,
                completed
            });
        }
        // Save user
        await user.save();
        res.status(200).json({
            message: "Walkthrough status updated successfully",
            data: {
                walkthrough: user.walkthrough
            },
            success: true,
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
        console.error("Walkthrough update error:", errorMessage);
        res.status(500).json({ error: "Failed to update walkthrough status" });
    }
};
exports.update_walkthrough = update_walkthrough;
