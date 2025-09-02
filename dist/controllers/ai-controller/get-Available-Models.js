"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_available_models = void 0;
const zod_1 = require("zod");
const ai_Providers_1 = require("../../lib/ai-Providers");
// Zod Schema for validation
const GetAvailableModelsSchema = zod_1.z.object({
// No body validation needed for GET requests
});
const get_available_models = async (req, res) => {
    try {
        // Validate request (no body validation needed for GET)
        GetAvailableModelsSchema.parse({});
        const models = (0, ai_Providers_1.get_all_available_models)();
        const modelInfo = models.map(model => ({
            name: model,
            available: (0, ai_Providers_1.is_model_available)(model),
            fallbacks: (0, ai_Providers_1.get_recommended_fallbacks)(model),
        }));
        res.json({
            success: true,
            models: modelInfo,
            providers: ai_Providers_1.AI_PROVIDERS,
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
        console.error("Error fetching available models:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch available models"
        });
    }
};
exports.get_available_models = get_available_models;
