"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete_tag = void 0;
const zod_1 = require("zod");
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const activitylogger_1 = require("../../activitylogger");
const types_1 = require("../../types");
// Zod Schema for validation
const delete_tag_schema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Tag ID is required"),
    }),
    query: zod_1.z.object({
        force: zod_1.z.string().optional(),
    }),
});
const delete_tag = async (req, res) => {
    try {
        // Validate request
        const validated_data = delete_tag_schema.parse(req);
        const { id } = validated_data.params;
        const { force } = validated_data.query;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        const tag_to_delete = await tags_Model_1.default.findById(id);
        if (!tag_to_delete) {
            res.status(404).json({ success: false, error: "Tag not found" });
            return;
        }
        const contact_count = await contact_Model_1.default.countDocuments({
            user: user_id,
            tags: tag_to_delete.name,
        });
        if (contact_count > 0) {
            if (force === "true") {
                await contact_Model_1.default.updateMany({ user: user_id, tags: tag_to_delete.name }, { $pull: { tags: tag_to_delete.name } });
                await tags_Model_1.default.findByIdAndDelete(id);
                await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.FORCE_DELETE_TAG, `Force deleted tag "${tag_to_delete.name}" and removed from ${contact_count} contacts`);
                res.status(200).json({
                    message: `Tag "${tag_to_delete.name}" force deleted and removed from ${contact_count} contacts`,
                    success: true,
                });
            }
            else {
                res.status(400).json({
                    error: `Cannot delete tag "${tag_to_delete.name}" - it is currently used by ${contact_count} contact(s)`,
                    success: false,
                    tagName: tag_to_delete.name,
                    contactCount: contact_count,
                    suggestion: "Use ?force=true to remove tag from all contacts and delete it",
                });
            }
        }
        else {
            await tags_Model_1.default.findByIdAndDelete(id);
            await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.TAG_DELETED, `Deleted unused tag: "${tag_to_delete.name}"`);
            res.status(200).json({
                message: `Tag "${tag_to_delete.name}" deleted successfully`,
                success: true,
            });
        }
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
        console.error("Error deleting tag:", errorMessage);
        res.status(500).json({ success: false, error: "Failed to delete tag" });
    }
};
exports.delete_tag = delete_tag;
