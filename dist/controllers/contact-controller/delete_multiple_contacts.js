"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete_multiple_contacts = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const types_1 = require("../../types");
const activitylogger_1 = require("../../activitylogger");
// Zod Schema for validation
const delete_multiple_contacts_schema = zod_1.z.object({
    body: zod_1.z.object({
        ids: zod_1.z.array(zod_1.z.string()).min(1, "At least one contact ID is required"),
    }),
});
const delete_multiple_contacts = async (req, res) => {
    try {
        // Validate request
        const validated_data = delete_multiple_contacts_schema.parse(req);
        const { ids } = validated_data.body;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        // Get contacts before deletion for logging
        const contacts = await contact_Model_1.default.find({ _id: { $in: ids }, user: user_id });
        if (contacts.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No contacts found to delete"
            });
        }
        // Delete the contacts
        const result = await contact_Model_1.default.deleteMany({ _id: { $in: ids }, user: user_id });
        // Log bulk deletion activity
        const contactNames = contacts.map(contact => contact.name).join(', ');
        await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.BULK_DELETE_CONTACTS, `Bulk deleted ${result.deletedCount} contacts: ${contactNames}`);
        res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} contacts`,
            deletedCount: result.deletedCount
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
        console.error("Error deleting multiple contacts:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to delete contacts"
        });
    }
};
exports.delete_multiple_contacts = delete_multiple_contacts;
