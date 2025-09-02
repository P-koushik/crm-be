"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const contact_schema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    note: {
        type: String,
    },
    user: {
        type: String,
        required: true,
    },
    lastInteraction: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
const Contact = mongoose_1.models.Contact || (0, mongoose_1.model)("Contact", contact_schema);
exports.default = Contact;
