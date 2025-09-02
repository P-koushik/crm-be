"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_contact = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const types_1 = require("../../types");
const activitylogger_1 = require("../../activitylogger");
const auth_Types_1 = require("../../types/auth-Types");
// Zod Schema for validation
const create_contact_schema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name is required").max(100, "Name too long"),
        email: zod_1.z.string().email("Invalid email format"),
        phone: zod_1.z.string().min(1, "Phone is required"),
        company: zod_1.z.string().min(1, "Company is required"),
        tags: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
        note: zod_1.z.string().optional(),
    }),
});
const create_contact = async (req, res) => {
    try {
        // Validate request
        const validated_data = create_contact_schema.parse(req);
        const contact_data = validated_data.body;
        const user = (0, auth_Types_1.requireAuthentication)(req);
        const user_id = user.uid;
        // Check if contact with same email already exists
        const existing_contact = await contact_Model_1.default.findOne({ user: user_id, email: contact_data.email });
        if (existing_contact) {
            return res.status(400).json({
                success: false,
                message: "Contact with this email already exists"
            });
        }
        // Process tags - handle both string and array formats
        let processedTags = [];
        if (contact_data.tags) {
            if (typeof contact_data.tags === 'string') {
                // If tags come as comma-separated string, split them
                processedTags = contact_data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            }
            else if (Array.isArray(contact_data.tags)) {
                // If tags come as array, just clean them
                processedTags = contact_data.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
            }
        }
        // If tags are provided, ensure they exist in the Tag collection
        if (processedTags.length > 0) {
            const tagUpsertPromises = processedTags.map(async (tagName) => {
                const existingTag = await tags_Model_1.default.findOne({ name: tagName, user: user_id });
                if (!existingTag) {
                    const newTag = await tags_Model_1.default.findOneAndUpdate({ name: tagName, user: user_id }, { $setOnInsert: { name: tagName, user: user_id, color: "#3b82f6" } }, { upsert: true, new: true });
                    // Log tag creation activity
                    await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.TAG_CREATED, `Created tag: ${newTag.name} with color ${newTag.color}`);
                    return newTag;
                }
                return existingTag;
            });
            await Promise.all(tagUpsertPromises);
        }
        const new_contact = new contact_Model_1.default({
            ...contact_data,
            tags: processedTags, // Use processed tags instead of original
            user: user_id,
            lastInteraction: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const saved_contact = await new_contact.save();
        // Log contact creation activity with detailed information
        const contactDetails = [
            `Name: ${saved_contact.name}`,
            `Email: ${saved_contact.email}`,
            `Phone: ${saved_contact.phone}`,
            `Company: ${saved_contact.company}`
        ];
        if (processedTags.length > 0) {
            contactDetails.push(`Tags: ${processedTags.join(', ')}`);
        }
        if (saved_contact.note) {
            contactDetails.push(`Note: ${saved_contact.note}`);
        }
        await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.CONTACT_CREATED, `Created contact: ${contactDetails.join(', ')}`);
        res.status(201).json({
            success: true,
            message: "Contact created successfully",
            contact: saved_contact
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
        console.error("Error creating contact:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to create contact"
        });
    }
};
exports.create_contact = create_contact;
