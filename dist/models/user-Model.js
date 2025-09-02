"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const user_schema = new mongoose_1.Schema({
    uid: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        default: "",
    },
    company: {
        type: String,
        default: "",
    },
    photoUrl: {
        type: String,
        default: "",
    },
    role: {
        type: String,
        enum: Object.values(types_1.UserRole),
    },
    teamCode: {
        type: String,
        unique: true,
        sparse: true,
    },
    organizationName: {
        type: String,
        default: "",
    },
    team: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Team",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLoginAt: {
        type: Date,
        default: Date.now,
    },
    walkthrough: [{
            page_name: {
                type: String,
                required: true,
            },
            completed: {
                type: Boolean,
                required: true,
                default: false,
            },
        }],
}, {
    timestamps: true,
});
const User = mongoose_1.models.User || (0, mongoose_1.model)("User", user_schema);
exports.default = User;
