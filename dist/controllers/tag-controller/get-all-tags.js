"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_all_tags = void 0;
const zod_1 = require("zod");
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
// Zod Schema for validation
const GetTagsSchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().optional(),
        page: zod_1.z.string().optional(),
        limit: zod_1.z.string().optional(),
    }),
});
const get_all_tags = async (req, res) => {
    try {
        // Validate request
        const validatedData = GetTagsSchema.parse(req);
        const { search = "", page = "1", limit = "10" } = validatedData.query;
        const authReq = req;
        const userId = authReq.user.uid;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build query
        const query = { user: userId };
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }
        // Get tags with pagination
        const tags = await tags_Model_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);
        // Get total count
        const totalTags = await tags_Model_1.default.countDocuments(query);
        const totalPages = Math.ceil(totalTags / limitNum);
        // Get tag usage counts
        const tagCounts = {};
        for (const tag of tags) {
            const count = await contact_Model_1.default.countDocuments({
                user: userId,
                tags: tag.name,
            });
            tagCounts[tag.name] = count;
        }
        res.json({
            success: true,
            message: "Tags fetched successfully",
            data: {
                tags: tags,
                tagCounts: tagCounts,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalTags,
                    total_pages: totalPages,
                    total_items: totalTags,
                },
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("Validation error:", error.errors);
            res.status(400).json({
                message: "Invalid request data",
                details: error.errors
            });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching tags:", errorMessage);
        res.status(500).json({ message: "Failed to fetch tags" });
    }
};
exports.get_all_tags = get_all_tags;
