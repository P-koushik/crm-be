"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const generate_message_1 = require("../controllers/message-controller/generate-message");
const send_message_1 = require("../controllers/message-controller/send-message");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
router.post('/generate', auth_Middleware_1.default, generate_message_1.generate_message);
router.post('/send', auth_Middleware_1.default, send_message_1.send_message);
exports.default = router;
