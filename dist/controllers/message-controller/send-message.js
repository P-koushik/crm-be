"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.send_message = void 0;
const zod_1 = require("zod");
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const message_History_Model_1 = __importDefault(require("../../models/message-History-Model"));
const sms_Service_1 = require("../../lib/sms-Service");
const activitylogger_1 = require("../../activitylogger");
const types_1 = require("../../types");
// Zod Schema for validation
const send_message_schema = zod_1.z.object({
    body: zod_1.z.object({
        messageContent: zod_1.z.string().min(1, "Message content is required"),
        contactIds: zod_1.z.array(zod_1.z.string()).min(1, "At least one contact ID is required"),
        prompt: zod_1.z.string().min(1, "Prompt is required"),
    }),
});
const send_message = async (req, res) => {
    try {
        // Validate request
        const validated_data = send_message_schema.parse(req);
        const { messageContent, contactIds, prompt } = validated_data.body;
        const auth_req = req;
        const user_id = auth_req.user.uid;
        const results = [];
        for (const contactId of contactIds) {
            try {
                // Get contact information
                const contact = await contact_Model_1.default.findOne({ _id: contactId, user: user_id });
                if (!contact) {
                    results.push({
                        contactId,
                        success: false,
                        error: "Contact not found",
                    });
                    continue;
                }
                // Validate phone number
                const is_valid_phone = await sms_Service_1.sms_service.validate_phone_number(contact.phone);
                if (!is_valid_phone) {
                    results.push({
                        contactId,
                        success: false,
                        error: "Invalid phone number",
                    });
                    continue;
                }
                // Send message via SMS
                const sms_result = await sms_Service_1.sms_service.send_message(contact.phone, messageContent);
                // Update message history
                await message_History_Model_1.default.findOneAndUpdate({
                    user: user_id,
                    contactId,
                    messageContent,
                    status: types_1.MessageStatus.PENDING,
                }, {
                    status: types_1.MessageStatus.SENT,
                    smsMessageId: sms_result.messageId,
                    sentAt: new Date(),
                });
                // Log activity
                await (0, activitylogger_1.log_activity)(user_id, types_1.ActivityTypes.CONTACT_EDITED, `Sent SMS message to ${contact.name}: ${messageContent.substring(0, 50)}...`, contactId);
                results.push({
                    contactId,
                    contactName: contact.name,
                    phoneNumber: contact.phone,
                    success: true,
                    messageId: sms_result.messageId,
                    status: sms_result.status,
                });
            }
            catch (error) {
                console.error(`Error sending message to contact ${contactId}:`, error);
                // Update message history with error
                await message_History_Model_1.default.findOneAndUpdate({
                    user: user_id,
                    contactId,
                    messageContent,
                    status: types_1.MessageStatus.PENDING,
                }, {
                    status: types_1.MessageStatus.FAILED,
                    errorMessage: error instanceof Error ? error.message : "Unknown error",
                });
                results.push({
                    contactId,
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
        res.status(200).json({
            success: true,
            results,
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
        console.error("Error sending messages:", error);
        res.status(500).json({
            success: false,
            error: "Failed to send messages",
        });
    }
};
exports.send_message = send_message;
