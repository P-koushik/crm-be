"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete_contact = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const types_1 = require("../../types");
const activitylogger_1 = require("../../activitylogger");
// Zod Schema for validation
const delete_contact_schema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Contact ID is required"),
    }),
});
const delete_contact = async (req, res) => {
    try {
        // Validate request
        const validated_data = delete_contact_schema.parse(req);
        const { id } = validated_data.params;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        // Get contact before deletion for logging
        const contact = await contact_Model_1.default.findOne({ _id: id, user: user_id });
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found"
            });
        }
        // Delete the contact
        await contact_Model_1.default.findByIdAndDelete(id);
        // Log contact deletion activity
        const contactDetails = [
            `Name: ${contact.name}`,
            `Email: ${contact.email}`,
            `Phone: ${contact.phone}`,
            `Company: ${contact.company}`
        ];
        if (contact.tags && contact.tags.length > 0) {
            contactDetails.push(`Tags: ${contact.tags.join(', ')}`);
        }
        if (contact.note) {
            contactDetails.push(`Note: ${contact.note}`);
        }
        await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.CONTACT_DELETED, `Deleted contact: ${contactDetails.join(', ')}`);
        res.status(200).json({
            success: true,
            message: "Contact deleted successfully"
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
        console.error("Error deleting contact:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to delete contact"
        });
    }
};
exports.delete_contact = delete_contact;
