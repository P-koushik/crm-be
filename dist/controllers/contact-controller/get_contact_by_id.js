"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_contact_by_id = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
// Zod Schema for validation
const get_contact_by_id_schema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Contact ID is required"),
    }),
});
const get_contact_by_id = async (req, res) => {
    try {
        // Validate request
        const validated_data = get_contact_by_id_schema.parse(req);
        const { id } = validated_data.params;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        const contact = await contact_Model_1.default.findOne({ _id: id, user: user_id });
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Contact retrieved successfully",
            contact
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
        console.error("Error retrieving contact:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve contact"
        });
    }
};
exports.get_contact_by_id = get_contact_by_id;
