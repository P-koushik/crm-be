"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const get_team_info_1 = require("../controllers/team-controller/get-team-info");
const join_team_1 = require("../controllers/team-controller/join-team");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
// All team routes require authentication
router.use(auth_Middleware_1.default);
// Get team information for current user
router.get("/team", get_team_info_1.get_team_info);
// Join an existing team
router.post("/team/join", join_team_1.join_team);
exports.default = router;
