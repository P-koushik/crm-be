"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convert_team_to_individual = void 0;
const user_Model_1 = __importDefault(require("../../models/user-Model"));
const team_Model_1 = __importDefault(require("../../models/team-Model"));
const convert_team_to_individual = async (req, res) => {
    try {
        // Cast to authenticated request after middleware
        const auth_req = req;
        const user_uid = auth_req.user.uid;
        const { teamCode } = req.body;
        if (!teamCode) {
            res.status(400).json({ success: false, error: "Team code is required" });
            return;
        }
        // Get current user to verify they're admin of this team
        const current_user = await user_Model_1.default.findOne({ uid: user_uid });
        if (!current_user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        // Check if user is admin
        if (current_user.role !== "admin") {
            res.status(403).json({ success: false, error: "Only admins can convert teams" });
            return;
        }
        // Find the team
        const team = await team_Model_1.default.findOne({ code: teamCode });
        if (!team) {
            res.status(404).json({ success: false, error: "Team not found" });
            return;
        }
        // Verify user is admin of this team
        if (team.admin !== user_uid) {
            res.status(403).json({ success: false, error: "You can only convert your own team" });
            return;
        }
        // Convert all team members to individual users
        const team_members = await user_Model_1.default.find({ team: team._id });
        let converted_count = 0;
        for (const member of team_members) {
            member.role = "individual";
            member.team = undefined;
            member.teamCode = undefined;
            member.organizationName = undefined;
            await member.save();
            converted_count++;
        }
        // Delete the team
        await team_Model_1.default.findByIdAndDelete(team._id);
        res.status(200).json({
            success: true,
            message: "Team converted successfully",
            data: {
                convertedCount: converted_count,
                teamCode: teamCode
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Convert team error:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to convert team"
        });
    }
};
exports.convert_team_to_individual = convert_team_to_individual;
