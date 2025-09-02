"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.count_of_contact = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
// Zod Schema for validation
const count_contacts_schema = zod_1.z.object({
// No body validation needed for GET requests
});
const count_of_contact = async (req, res) => {
    try {
        // Validate request (no body validation needed for GET)
        count_contacts_schema.parse({});
        const auth_req = req;
        const user_id = auth_req.user.uid;
        // Get total count
        const total_contacts = await contact_Model_1.default.countDocuments({ user: user_id });
        res.status(200).json({
            success: true,
            message: "Contact count retrieved successfully",
            count: total_contacts
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
        console.error("Error counting contacts:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to count contacts"
        });
    }
};
exports.count_of_contact = count_of_contact;
