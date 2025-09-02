"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.require_same_team = exports.require_individual_or_team = exports.require_team_member = exports.require_admin = exports.require_role = void 0;
const types_1 = require("../types");
const require_role = (allowed_roles) => {
    return (req, res, next) => {
        try {
            const user_role = req.user?.role;
            if (!user_role) {
                res.status(403).json({
                    success: false,
                    error: "Role not assigned. Please complete your profile setup."
                });
                return;
            }
            if (!allowed_roles.includes(user_role)) {
                res.status(403).json({
                    success: false,
                    error: "Insufficient permissions for this action"
                });
                return;
            }
            next();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Role middleware error:", errorMessage);
            res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    };
};
exports.require_role = require_role;
exports.require_admin = (0, exports.require_role)([types_1.UserRole.ADMIN]);
exports.require_team_member = (0, exports.require_role)([types_1.UserRole.ADMIN, types_1.UserRole.USER]);
exports.require_individual_or_team = (0, exports.require_role)([types_1.UserRole.ADMIN, types_1.UserRole.USER, types_1.UserRole.INDIVIDUAL]);
const require_same_team = async (req, res, next) => {
    try {
        const current_user_uid = req.user.uid;
        const target_user_uid = req.params.userId || req.body.userId;
        if (!target_user_uid) {
            next();
            return;
        }
        // Import here to avoid circular dependencies
        const User = (await Promise.resolve().then(() => __importStar(require("../models/user-Model")))).default;
        const current_user = await User.findOne({ uid: current_user_uid });
        const target_user = await User.findOne({ uid: target_user_uid });
        if (!current_user || !target_user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        // Individual users can only access their own data
        if (current_user.role === types_1.UserRole.INDIVIDUAL) {
            if (current_user_uid !== target_user_uid) {
                res.status(403).json({ success: false, error: "Access denied" });
                return;
            }
            next();
            return;
        }
        // Team members can access data from the same team
        if (current_user.team && target_user.team) {
            if (current_user.team.toString() === target_user.team.toString()) {
                next();
                return;
            }
        }
        res.status(403).json({ success: false, error: "Access denied" });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Same team middleware error:", errorMessage);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};
exports.require_same_team = require_same_team;
