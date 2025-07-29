import { Request, Response } from "express";
import Activity from "../models/activityModel";

interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
  };
}

export const get_paginated_activities = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const skip = (page - 1) * limit;

    const activities = await Activity.find({ user: authReq.user.uid })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(activities);
  } catch (err: unknown) {
    console.error("[ActivityController] Error fetching activities:", err);
    res.status(500).json({ error: err as string });
  }
};

export const get_activity_by_id = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { contactId } = req.params;
    
    // Find all activities for this contact and user
    const activities = await Activity.find({ 
      contactId: contactId,
      user: authReq.user.uid 
    })
    .sort({ timestamp: -1 })
    .lean();

    res.json({ 
      success: true,
      activities: activities,
      count: activities.length
    });
  } catch (err: unknown) {
    console.error("Error fetching activities for contact:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch activities",
      activities: [] 
    });
  }
};

