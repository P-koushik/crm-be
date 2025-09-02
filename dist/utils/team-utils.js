"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.is_team_member = exports.is_team_admin = exports.get_team_by_code = exports.team_code_exists = exports.validate_team_code_format = exports.generate_team_code = void 0;
const team_Model_1 = __importDefault(require("../models/team-Model"));
/**
 * Generates a unique 6-character team code
 * @returns Promise<string> - Unique team code
 */
const generate_team_code = async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let attempts = 0;
    const max_attempts = 100;
    while (attempts < max_attempts) {
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Check if code already exists
        const existing_team = await team_Model_1.default.findOne({ code });
        if (!existing_team) {
            return code;
        }
        attempts++;
    }
    throw new Error("Failed to generate unique team code after maximum attempts");
};
exports.generate_team_code = generate_team_code;
/**
 * Validates a team code format
 * @param code - Team code to validate
 * @returns boolean - Whether the code format is valid
 */
const validate_team_code_format = (code) => {
    const code_regex = /^[A-Z0-9]{6}$/;
    return code_regex.test(code);
};
exports.validate_team_code_format = validate_team_code_format;
/**
 * Checks if a team code exists
 * @param code - Team code to check
 * @returns Promise<boolean> - Whether the code exists
 */
const team_code_exists = async (code) => {
    const team = await team_Model_1.default.findOne({ code: code.toUpperCase() });
    return !!team;
};
exports.team_code_exists = team_code_exists;
/**
 * Gets team information by code
 * @param code - Team code
 * @returns Promise<any> - Team information or null
 */
const get_team_by_code = async (code) => {
    return await team_Model_1.default.findOne({ code: code.toUpperCase() });
};
exports.get_team_by_code = get_team_by_code;
/**
 * Checks if user is team admin
 * @param team_id - Team ID
 * @param user_uid - User UID
 * @returns Promise<boolean> - Whether user is admin
 */
const is_team_admin = async (team_id, user_uid) => {
    const team = await team_Model_1.default.findById(team_id);
    return team?.admin === user_uid;
};
exports.is_team_admin = is_team_admin;
/**
 * Checks if user is team member
 * @param team_id - Team ID
 * @param user_uid - User UID
 * @returns Promise<boolean> - Whether user is member
 */
const is_team_member = async (team_id, user_uid) => {
    const team = await team_Model_1.default.findById(team_id);
    return team?.members.includes(user_uid) || false;
};
exports.is_team_member = is_team_member;
