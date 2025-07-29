import express from "express";
import authMiddleware from "../authMiddleware";
import { get_activity_by_id, get_paginated_activities } from "../controllers/activityController";

const router = express.Router();

router.get("/activity", authMiddleware, get_paginated_activities);
router.get("/activity/:contactId", authMiddleware, get_activity_by_id);

export default router;
