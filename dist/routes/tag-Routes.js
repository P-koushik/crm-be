"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const create_tag_1 = require("../controllers/tag-controller/create-tag");
const get_all_tags_1 = require("../controllers/tag-controller/get-all-tags");
const edit_tag_1 = require("../controllers/tag-controller/edit-tag");
const delete_tag_1 = require("../controllers/tag-controller/delete-tag");
const bulk_add_tags_1 = require("../controllers/tag-controller/bulk-add-tags");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
router.post('/tags', auth_Middleware_1.default, create_tag_1.create_tag);
router.get('/tags', auth_Middleware_1.default, get_all_tags_1.get_all_tags);
router.put('/tags/:id', auth_Middleware_1.default, edit_tag_1.edit_tag);
router.delete('/tags/:id', auth_Middleware_1.default, delete_tag_1.delete_tag);
router.post('/tags/bulk-add', auth_Middleware_1.default, bulk_add_tags_1.bulk_add_tags);
exports.default = router;
