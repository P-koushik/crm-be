"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_tag = void 0;
const zod_1 = require("zod");
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const activitylogger_1 = require("../../activitylogger");
const types_1 = require("../../types");
// Zod Schema for validation
const create_tag_schema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Tag name is required").max(50, "Tag name too long"),
        color: zod_1.z.string().min(1, "Tag color is required").regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
    }),
});
const create_tag = async (req, res) => {
    try {
        // Validate request
        const validated_data = create_tag_schema.parse(req);
        const { name, color } = validated_data.body;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        // Check if tag already exists
        const existing_tag = await tags_Model_1.default.findOne({ user: user_id, name });
        if (existing_tag) {
            res.status(400).json({ success: false, error: "Tag already exists" });
            return;
        }
        const new_tag = await tags_Model_1.default.create({ name, color, user: user_id });
        await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.TAG_CREATED, `Created tag: ${name} with color ${color}`);
        res.status(201).json({
            success: true,
            message: "Tag created successfully",
            tag: new_tag,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("Validation error:", error.errors);
            res.status(400).json({
                success: false,
                error: "Invalid request data",
                details: error.errors
            });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error creating tag:", errorMessage);
        res.status(500).json({ success: false, error: "Failed to create tag" });
    }
};
exports.create_tag = create_tag;
