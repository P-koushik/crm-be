"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.search_contacts = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const activity_Model_1 = __importDefault(require("../../models/activity-Model"));
// Zod Schema for validation
const search_schema = zod_1.z.object({
    query: zod_1.z.object({
        q: zod_1.z.string().optional(),
    }),
});
const search_contacts = async (req, res) => {
    try {
        // Validate request
        const validated_data = search_schema.parse(req);
        const q = validated_data.query.q;
        const auth_req = req;
        const user_id = auth_req.user?.uid;
        if (!q || typeof q !== 'string' || !q.trim()) {
            res.json({
                pages: [],
                data: {
                    contacts: [],
                    tags: [],
                    activities: []
                }
            });
            return;
        }
        if (!user_id) {
            res.status(401).json({ error: "User not authenticated" });
            return;
        }
        const searchQuery = q.trim();
        const regex = new RegExp(searchQuery, "i");
        const [contacts, tags, activities] = await Promise.all([
            contact_Model_1.default.find({
                $and: [
                    { user: user_id }, // Filter by user
                    { $or: [{ name: regex }, { email: regex }] }
                ]
            }).limit(5),
            tags_Model_1.default.find({
                $and: [
                    { user: user_id }, // Filter by user
                    { name: regex }
                ]
            }).limit(5),
            activity_Model_1.default.find({
                $and: [
                    { user: user_id }, // Filter by user
                    { details: regex }
                ]
            }).limit(5),
        ]);
        res.json({
            pages: [],
            data: {
                contacts,
                tags,
                activities
            }
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
        console.error("Search failed:", error);
        res.status(500).json({ error: "Search failed", details: error instanceof Error ? error.message : "Unknown error" });
    }
};
exports.search_contacts = search_contacts;
