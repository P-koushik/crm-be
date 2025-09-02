"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const get_activity_by_id_1 = require("../controllers/activity-controller/get-activity-by-id");
const get_paginated_activities_1 = require("../controllers/activity-controller/get-paginated-activities");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
router.get('/activities/:contactId', auth_Middleware_1.default, get_activity_by_id_1.get_activity_by_id);
router.get('/activities', auth_Middleware_1.default, get_paginated_activities_1.get_paginated_activities);
exports.default = router;
