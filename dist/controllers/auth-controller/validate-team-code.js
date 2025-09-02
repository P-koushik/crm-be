"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate_team_code = void 0;
const team_Model_1 = __importDefault(require("../../models/team-Model"));
const user_Model_1 = __importDefault(require("../../models/user-Model"));
const validate_team_code = async (req, res) => {
    try {
        const auth_req = req;
        const { teamCode } = req.body;
        if (!teamCode) {
            res.status(400).json({
                success: false,
                error: "Team code is required"
            });
            return;
        }
        // Validate team code format (6 characters, alphanumeric)
        if (!/^[A-Z0-9]{6}$/.test(teamCode.toUpperCase())) {
            res.status(400).json({
                success: false,
                error: "Team code must be exactly 6 characters (letters and numbers only)"
            });
            return;
        }
        // Find the team by code
        const team = await team_Model_1.default.findOne({ code: teamCode.toUpperCase() });
        if (!team) {
            res.status(404).json({
                success: false,
                error: "Invalid team code. Please check the code and try again."
            });
            return;
        }
        // Get team admin info
        const admin_user = await user_Model_1.default.findOne({ uid: team.admin });
        if (!admin_user) {
            res.status(404).json({
                success: false,
                error: "Team admin not found"
            });
            return;
        }
        // Check if user is already a member of this team
        if (team.members.includes(auth_req.user.uid)) {
            res.status(400).json({
                success: false,
                error: "You are already a member of this team"
            });
            return;
        }
        // Check if team has space for new members
        if (team.members.length >= team.settings.maxMembers) {
            res.status(400).json({
                success: false,
                error: "Team is at maximum capacity"
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Team code is valid",
            data: {
                name: team.name,
                adminName: admin_user.name || admin_user.email,
                memberCount: team.members.length,
                maxMembers: team.settings.maxMembers
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Validate team code error:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to validate team code"
        });
    }
};
exports.validate_team_code = validate_team_code;
