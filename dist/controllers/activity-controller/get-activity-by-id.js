"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_activity_by_id = void 0;
const zod_1 = require("zod");
const activity_Model_1 = __importDefault(require("../../models/activity-Model"));
// Zod Schema for validation
const GetActivityByIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        contactId: zod_1.z.string().min(1, "Contact ID is required"),
    }),
});
const get_activity_by_id = async (req, res) => {
    try {
        // Validate request
        const validatedData = GetActivityByIdSchema.parse(req);
        const { contactId } = validatedData.params;
        const authReq = req;
        // Find all activities for this contact and user
        const activities = await activity_Model_1.default.find({
            contactId: contactId,
            user: authReq.user.uid
        })
            .sort({ timestamp: -1 })
            .lean();
        res.json({
            success: true,
            activities: activities,
            count: activities.length
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
        console.error("Error fetching activities for contact:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch activities",
            activities: []
        });
    }
};
exports.get_activity_by_id = get_activity_by_id;
