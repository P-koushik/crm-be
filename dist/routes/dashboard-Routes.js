"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const get_Dashboard_Stats_1 = require("../controllers/dashboard-controller/get-Dashboard-Stats");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
router.get('/dashboard/stats', auth_Middleware_1.default, get_Dashboard_Stats_1.get_dashboard_stats);
exports.default = router;
