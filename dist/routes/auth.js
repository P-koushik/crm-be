"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/routes/auth.ts
const express_1 = __importDefault(require("express"));
const verify_token_1 = require("../controllers/auth-controller/verify-token");
const register_1 = require("../controllers/auth-controller/register");
const update_role_1 = require("../controllers/auth-controller/update-role");
const convert_team_to_individual_1 = require("../controllers/auth-controller/convert-team-to-individual");
const validate_team_code_1 = require("../controllers/auth-controller/validate-team-code");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
router.post("/verify-token", verify_token_1.verify_token);
router.post("/auth/register", register_1.register_user);
// Role update requires authentication
router.post("/auth/update-role", auth_Middleware_1.default, update_role_1.update_user_role);
// Convert team to individual requires authentication
router.post("/auth/convert-team-to-individual", auth_Middleware_1.default, convert_team_to_individual_1.convert_team_to_individual);
// Validate team code (requires authentication)
router.post("/auth/validate-team-code", auth_Middleware_1.default, validate_team_code_1.validate_team_code);
exports.default = router;
