"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const get_Available_Models_1 = require("../controllers/ai-controller/get-Available-Models");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
router.get('/models', auth_Middleware_1.default, get_Available_Models_1.get_available_models);
exports.default = router;
