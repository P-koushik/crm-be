"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_team_info = void 0;
const team_Model_1 = __importDefault(require("../../models/team-Model"));
const user_Model_1 = __importDefault(require("../../models/user-Model"));
const get_team_info = async (req, res) => {
    try {
        // Cast to authenticated request after middleware
        const auth_req = req;
        const user_uid = auth_req.user.uid;
        // Get current user
        const current_user = await user_Model_1.default.findOne({ uid: user_uid });
        if (!current_user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        // Individual users don't have team info
        if (current_user.role === "individual") {
            res.status(200).json({
                success: true,
                data: {
                    hasTeam: false,
                    role: current_user.role,
                },
            });
            return;
        }
        // Get team information
        if (!current_user.team) {
            res.status(200).json({
                success: true,
                data: {
                    hasTeam: false,
                    role: current_user.role,
                },
            });
            return;
        }
        const team = await team_Model_1.default.findById(current_user.team)
            .populate("admin", "uid name email photoUrl")
            .populate("members", "uid name email photoUrl role");
        if (!team) {
            res.status(404).json({ success: false, error: "Team not found" });
            return;
        }
        // Check if user is admin
        const is_admin = team.admin.uid === user_uid;
        res.status(200).json({
            success: true,
            data: {
                hasTeam: true,
                role: current_user.role,
                isAdmin: is_admin,
                team: {
                    id: team._id,
                    name: team.name,
                    code: team.code,
                    description: team.description,
                    admin: team.admin,
                    members: team.members,
                    memberCount: team.members.length,
                    maxMembers: team.settings.maxMembers,
                    settings: team.settings,
                    createdAt: team.createdAt,
                },
            },
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Get team info error:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Failed to fetch team information"
        });
    }
};
exports.get_team_info = get_team_info;
