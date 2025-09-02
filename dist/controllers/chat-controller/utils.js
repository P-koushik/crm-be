"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manage_conversation_context = exports.create_system_prompt = exports.get_crm_context = void 0;
const contact_Model_1 = __importDefault(require("../../models/contact-Model"));
const activity_Model_1 = __importDefault(require("../../models/activity-Model"));
const tags_Model_1 = __importDefault(require("../../models/tags-Model"));
const DEFAULT_MODEL = 'gpt-4o-mini';
const get_crm_context = async (user_id) => {
    try {
        const contacts = await contact_Model_1.default.find({ user: user_id })
            .select("name email phone company tags note lastInteraction")
            .limit(50)
            .sort({ lastInteraction: -1 });
        const activities = await activity_Model_1.default.find({ user: user_id })
            .select("activityType details timestamp contactId")
            .sort({ timestamp: -1 });
        const contactStats = {
            totalContacts: await contact_Model_1.default.countDocuments({ user: user_id }),
            companiesCount: (await contact_Model_1.default.distinct("company", { user: user_id })).length,
            tagsCount: await tags_Model_1.default.countDocuments({ user: user_id }),
        };
        const topCompanies = await contact_Model_1.default.aggregate([
            { $match: { user: user_id } },
            { $group: { _id: "$company", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);
        const tags = await tags_Model_1.default.find({ user: user_id }).select("name color");
        return { contacts, activities, contactStats, topCompanies, tags };
    }
    catch (error) {
        console.error("Error fetching CRM context:", error);
        return null;
    }
};
exports.get_crm_context = get_crm_context;
const create_system_prompt = (crmContext) => {
    let systemPrompt = "You are an AI assistant for a CRM system...";
    if (crmContext) {
        const { contacts, activities, contactStats, topCompanies, tags } = crmContext;
        systemPrompt += `

CURRENT CRM DATA SUMMARY:
- Total Contacts: ${contactStats.totalContacts}
- Companies: ${contactStats.companiesCount}
- Tags: ${contactStats.tagsCount}

TOP COMPANIES (by contact count):
${topCompanies.map((c) => `- ${c._id}: ${c.count} contacts`).join("\n")}

RECENT CONTACTS:
${contacts.slice(0, 10).map((c) => `- ${c.name} (${c.email}) at ${c.company}${c.tags?.length ? ` - Tags: ${c.tags.join(", ")}` : ""}`).join("\n")}

RECENT ACTIVITIES:
${activities.slice(0, 5).map((a) => `- ${a.activityType}: ${a.details} (${new Date(a.timestamp).toLocaleDateString()})`).join("\n")}

AVAILABLE TAGS:
${tags.map((t) => `- ${t.name}`).join("\n")}`;
    }
    systemPrompt += `

Always provide helpful, accurate information about the user's CRM data and assist with contact management tasks.`;
    return systemPrompt;
};
exports.create_system_prompt = create_system_prompt;
const manage_conversation_context = async ({ conversation, modelName = DEFAULT_MODEL }) => {
    const { messages } = conversation;
    const recentMessages = messages.slice(-10);
    return {
        messages: recentMessages,
    };
};
exports.manage_conversation_context = manage_conversation_context;
