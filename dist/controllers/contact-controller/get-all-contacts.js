"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_all_contacts = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
// Zod Schema for validation
const get_all_contacts_schema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().optional(),
        page: zod_1.z.string().optional(),
        limit: zod_1.z.string().optional(),
        tags: zod_1.z.string().optional(),
    }),
});
const get_all_contacts = async (req, res) => {
    try {
        // Validate request
        const validated_data = get_all_contacts_schema.parse(req);
        const { search, page, limit, tags } = validated_data.query;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        // Build query
        const query = { user: user_id };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } }
            ];
        }
        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            query.tags = { $in: tagArray };
        }
        // Pagination
        const page_number = parseInt(page || '1');
        const limit_number = parseInt(limit || '10');
        const skip = (page_number - 1) * limit_number;
        // Get total count
        const total_contacts = await contact_Model_1.default.countDocuments(query);
        // Get contacts with pagination
        const contacts = await contact_Model_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit_number);
        const total_pages = Math.ceil(total_contacts / limit_number);
        res.json({
            success: true,
            message: "Contacts fetched successfully",
            data: {
                contacts: contacts,
                pagination: {
                    page: page_number,
                    limit: limit_number,
                    total: total_contacts,
                    total_pages: total_pages,
                    total_items: total_contacts,
                }
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("Validation error:", error.errors);
            res.status(400).json({ message: "Invalid request data", details: error.errors });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error retrieving contacts:", errorMessage);
        res.status(500).json({ message: "Failed to fetch contacts" });
    }
};
exports.get_all_contacts = get_all_contacts;
