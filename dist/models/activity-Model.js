"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const activity_schema = new mongoose_1.Schema({
    contactId: { type: String, required: false },
    user: { type: String, required: true },
    activityType: {
        type: String,
        enum: Object.values(types_1.ActivityTypes),
        required: true,
    },
    timestamp: { type: Date, default: Date.now },
    details: { type: String },
});
const Activity = mongoose_1.models.Activity || (0, mongoose_1.model)("Activity", activity_schema);
exports.default = Activity;
