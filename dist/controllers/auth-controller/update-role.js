"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.update_user_role = void 0;
const zod_1 = require("zod");
const user_Model_1 = __importDefault(require("../../models/user-Model"));
const team_Model_1 = __importDefault(require("../../models/team-Model"));
const team_utils_1 = require("../../utils/team-utils");
// Zod Schema for validation
const update_role_schema = zod_1.z.object({
    body: zod_1.z.object({
        role: zod_1.z.enum(["admin", "user", "individual"]),
        organizationName: zod_1.z.string().optional(),
        teamCode: zod_1.z.string().optional(),
    }),
});
const update_user_role = async (req, res) => {
    try {
        // Cast to authenticated request after middleware
        const auth_req = req;
        // Validate request
        const validated_data = update_role_schema.parse(req);
        const { role, organizationName, teamCode } = validated_data.body;
        const user_uid = auth_req.user.uid;
        // Find the user
        const user = await user_Model_1.default.findOne({ uid: user_uid });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        // Update user role
        user.role = role;
        user.lastLoginAt = new Date();
        let team = null;
        if (role === "admin") {
            // Admin role - create or join team
            if (!organizationName) {
                res.status(400).json({ error: "Organization name is required for admin role" });
                return;
            }
            // Check if user already has a team
            if (user.team) {
                team = await team_Model_1.default.findById(user.team);
                if (team && team.admin === user_uid) {
                    // User is already admin of a team
                    res.status(200).json({
                        message: "Role updated successfully",
                        data: { user, teamCode: team.code }
                    });
                    return;
                }
            }
            // Generate unique team code
            const new_team_code = await (0, team_utils_1.generate_team_code)();
            // Create new team
            team = new team_Model_1.default({
                name: organizationName,
                code: new_team_code,
                admin: user_uid,
                members: [user_uid],
                description: `Team for ${organizationName}`,
            });
            await team.save();
            // Update user with team info
            user.team = team._id;
            user.teamCode = new_team_code;
            user.organizationName = organizationName;
        }
        else if (role === "user") {
            // User role - join existing team
            if (!teamCode) {
                res.status(400).json({ error: "Team code is required for user role" });
                return;
            }
            // Find team by code
            team = await team_Model_1.default.findOne({ code: teamCode.toUpperCase() });
            if (!team) {
                res.status(404).json({ error: "Invalid team code" });
                return;
            }
            // Check if team has space for new members
            if (team.members.length >= team.settings.maxMembers) {
                res.status(400).json({ error: "Team is at maximum capacity" });
                return;
            }
            // Add user to team
            if (!team.members.includes(user_uid)) {
                team.members.push(user_uid);
                await team.save();
            }
            // Update user with team info
            user.team = team._id;
            user.teamCode = team.code;
            user.organizationName = team.name;
        }
        else {
            // Individual role - remove team associations
            user.team = undefined;
            user.teamCode = undefined;
            user.organizationName = undefined;
        }
        // Save user
        await user.save();
        res.status(200).json({
            message: "Role updated successfully",
            data: {
                user,
                teamCode: team?.code,
                teamName: team?.name
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("Validation error:", error.errors);
            res.status(400).json({
                error: "Invalid request data",
                details: error.errors
            });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Role update error:", errorMessage);
        res.status(500).json({ error: "Failed to update role" });
    }
};
exports.update_user_role = update_user_role;
