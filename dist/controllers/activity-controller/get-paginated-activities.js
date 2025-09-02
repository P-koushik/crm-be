"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_paginated_activities = void 0;
const zod_1 = require("zod");
const activity_Model_1 = __importDefault(require("../../models/activity-Model"));
// Zod Schema for validation
const GetPaginatedActivitiesSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional(),
        limit: zod_1.z.string().optional(),
    }),
});
const get_paginated_activities = async (req, res) => {
    try {
        // Validate request
        const validatedData = GetPaginatedActivitiesSchema.parse(req);
        const page = parseInt(validatedData.query.page || '1');
        const limit = parseInt(validatedData.query.limit || '5');
        const skip = (page - 1) * limit;
        const authReq = req;
        const activities = await activity_Model_1.default.find({ user: authReq.user.uid })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        res.json(activities);
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
        console.error("[ActivityController] Error fetching activities:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
};
exports.get_paginated_activities = get_paginated_activities;
