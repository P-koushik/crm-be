"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.import_contacts = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const types_1 = require("../../types");
const activitylogger_1 = require("../../activitylogger");
// Zod Schema for validation
const import_contacts_schema = zod_1.z.object({
    body: zod_1.z.object({
        contacts: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().min(1, "Name is required").max(100, "Name too long"),
            email: zod_1.z.string().email("Invalid email format"),
            phone: zod_1.z.string().min(1, "Phone is required"),
            company: zod_1.z.string().min(1, "Company is required"),
            tags: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
            note: zod_1.z.string().optional(),
        })).min(1, "At least one contact is required"),
    }),
});
const import_contacts = async (req, res) => {
    try {
        // Validate request
        const validated_data = import_contacts_schema.parse(req);
        const { contacts } = validated_data.body;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        let importedCount = 0;
        let skippedCount = 0;
        const errors = [];
        // Process each contact
        for (let i = 0; i < contacts.length; i++) {
            const contactData = contacts[i];
            try {
                // Check if contact with same email already exists
                const existingContact = await contact_Model_1.default.findOne({
                    user: user_id,
                    email: contactData.email
                });
                if (existingContact) {
                    skippedCount++;
                    errors.push(`Row ${i + 1}: Contact with email ${contactData.email} already exists`);
                    continue;
                }
                // Process tags
                let processedTags = [];
                if (contactData.tags) {
                    if (typeof contactData.tags === 'string') {
                        processedTags = contactData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                    }
                    else if (Array.isArray(contactData.tags)) {
                        processedTags = contactData.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
                    }
                }
                // Ensure tags exist in Tag collection
                if (processedTags.length > 0) {
                    const tagUpsertPromises = processedTags.map(async (tagName) => {
                        const existingTag = await tags_Model_1.default.findOne({ name: tagName, user: user_id });
                        if (!existingTag) {
                            const newTag = await tags_Model_1.default.findOneAndUpdate({ name: tagName, user: user_id }, { $setOnInsert: { name: tagName, user: user_id, color: "#3b82f6" } }, { upsert: true, new: true });
                            return newTag;
                        }
                        return existingTag;
                    });
                    await Promise.all(tagUpsertPromises);
                }
                // Create new contact
                const newContact = new contact_Model_1.default({
                    ...contactData,
                    tags: processedTags,
                    user: user_id,
                    lastInteraction: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                await newContact.save();
                importedCount++;
            }
            catch (error) {
                skippedCount++;
                errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        // Log bulk import activity
        if (importedCount > 0) {
            await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.BULK_IMPORT_CONTACTS, `Bulk imported ${importedCount} contacts, skipped ${skippedCount}`);
        }
        res.status(200).json({
            success: true,
            message: `Import completed: ${importedCount} imported, ${skippedCount} skipped`,
            importedCount,
            skippedCount,
            errors: errors.length > 0 ? errors : undefined
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
        console.error("Error importing contacts:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to import contacts"
        });
    }
};
exports.import_contacts = import_contacts;
