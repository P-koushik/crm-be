"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulk_add_tags = void 0;
const zod_1 = require("zod");
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const types_1 = require("../../types");
const activitylogger_1 = require("../../activitylogger");
// Zod Schema for validation
const bulk_add_tags_schema = zod_1.z.object({
    body: zod_1.z.object({
        tags: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().min(1, "Tag name is required").max(50, "Tag name too long"),
            color: zod_1.z.string().min(1, "Tag color is required").regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
        })).min(1, "At least one tag is required"),
    }),
});
const bulk_add_tags = async (req, res) => {
    try {
        // Validate request
        const validated_data = bulk_add_tags_schema.parse(req);
        const { tags } = validated_data.body;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        const newTags = [];
        const createdTagNames = [];
        for (const tag of tags) {
            const exists = await tags_Model_1.default.findOne({ user: user_id, name: tag.name });
            if (exists)
                continue;
            const newTag = await tags_Model_1.default.create({ name: tag.name, color: tag.color, user: user_id });
            newTags.push(newTag);
            createdTagNames.push(tag.name);
        }
        if (newTags.length === 0) {
            res.status(400).json({
                success: false,
                message: "No new tags were created (duplicates or invalid entries).",
            });
            return;
        }
        // Log a single activity for bulk tag creation with all tag names
        if (createdTagNames.length > 0) {
            const tagList = createdTagNames.join(", ");
            await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.TAG_CREATED, `Bulk created ${createdTagNames.length} tags: ${tagList}`);
        }
        res.status(201).json({
            success: true,
            message: `${newTags.length} tag(s) created successfully`,
            tags: newTags,
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
        console.error("Error creating bulk tags:", errorMessage);
        res.status(500).json({ success: false, error: "Failed to create tags" });
    }
};
exports.bulk_add_tags = bulk_add_tags;
