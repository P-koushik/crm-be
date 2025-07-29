import express from "express";
import authMiddleware from "../authMiddleware";
import {
  create_tag,
  bulk_add_tags,
  get_all_tags,
  edit_tag,
  delete_tag,
} from "../controllers/tagscontroller";

const router = express.Router();

router.post("/tags", authMiddleware, create_tag);
router.post("/tags/bulk", authMiddleware, bulk_add_tags);
router.get("/tags", authMiddleware, get_all_tags);
router.put("/tags/:tagId", authMiddleware, edit_tag);
router.delete("/tags/:tagId", authMiddleware, delete_tag);

export default router;
