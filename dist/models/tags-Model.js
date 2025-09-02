"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const tag_schema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    color: {
        type: String,
        default: "#3b82f6",
        required: true,
    },
    user: {
        type: String,
        ref: "User",
        required: true,
    },
});
const Tag = mongoose_1.models.Tag || (0, mongoose_1.model)("Tag", tag_schema);
exports.default = Tag;
