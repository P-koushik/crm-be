"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const get_Profile_1 = require("../controllers/user-controller/get-Profile");
const update_Profile_1 = require("../controllers/user-controller/update-Profile");
const delete_User_1 = require("../controllers/user-controller/delete-User");
const update_walkthrough_1 = require("../controllers/user-controller/update-walkthrough");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
router.get('/profile', auth_Middleware_1.default, get_Profile_1.get_profile);
router.put('/profile', auth_Middleware_1.default, update_Profile_1.update_profile);
router.delete('/profile', auth_Middleware_1.default, delete_User_1.delete_user);
router.put('/profile/walkthrough', auth_Middleware_1.default, update_walkthrough_1.update_walkthrough);
exports.default = router;
