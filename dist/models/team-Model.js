"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const team_schema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    admin: {
        type: String,
        required: true,
        ref: "User",
    },
    members: [{
            type: String,
            ref: "User",
        }],
    description: {
        type: String,
        default: "",
    },
    settings: {
        allowMemberInvites: {
            type: Boolean,
            default: true,
        },
        maxMembers: {
            type: Number,
            default: 50,
        },
        notificationPreferences: {
            email: {
                type: Boolean,
                default: true,
            },
            push: {
                type: Boolean,
                default: true,
            },
            sms: {
                type: Boolean,
                default: false,
            },
        },
    },
}, {
    timestamps: true,
});
const Team = mongoose_1.models.Team || (0, mongoose_1.model)("Team", team_schema);
exports.default = Team;
