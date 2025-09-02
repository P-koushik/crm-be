"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.edit_tag = void 0;
const zod_1 = require("zod");
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const activitylogger_1 = require("../../activitylogger");
const types_1 = require("../../types");
// Zod Schema for validation
const edit_tag_schema = zod_1.z.object({
    params: zod_1.z.object({
        tagId: zod_1.z.string().min(1, "Tag ID is required"),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Tag name is required").max(50, "Tag name too long"),
        color: zod_1.z.string().min(1, "Tag color is required").regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
    }),
});
const edit_tag = async (req, res) => {
    try {
        // Validate request
        const validated_data = edit_tag_schema.parse(req);
        const { tagId } = validated_data.params;
        const { name, color } = validated_data.body;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        const tag = await tags_Model_1.default.findOne({ _id: tagId, user: user_id });
        if (!tag) {
            res.status(404).json({ success: false, error: "Tag not found" });
            return;
        }
        const old_name = tag.name;
        const old_color = tag.color;
        tag.name = name;
        tag.color = color;
        await tag.save();
        await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.TAG_EDITED, `Updated tag: ${old_name} (${old_color}) → ${name} (${color})`);
        res.json({
            success: true,
            message: "Tag updated successfully",
            tag,
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
        console.error("Error updating tag:", errorMessage);
        res.status(500).json({ success: false, error: "Failed to update tag" });
    }
};
exports.edit_tag = edit_tag;
