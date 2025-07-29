import { Request, Response } from "express";
import Contact from "../models/contactmodel";
import Tag from "../models/tagsmodel";
import Activity from "../models/activityModel";

interface SearchQuery {
  q?: string;
}

// Extend the Request interface to match your auth middleware
interface AuthenticatedRequest extends Request<unknown, unknown, unknown, SearchQuery> {
  user?: {
    uid: string;
  };
}

export const search = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const q = req.query.q;
  const userId = req.user?.uid; // Get userId from req.user.uid


  if (!q?.trim()) {
    res.json({ contacts: [], tags: [], activities: [] });
    return;
  }

  if (!userId) {
    res.status(401).json({ error: "User not authenticated" });
    return;
  }

  const regex = new RegExp(q, "i");

  try {
    const [contacts, tags, activities] = await Promise.all([
      Contact.find({
        $and: [
          { user: userId }, // Filter by user
          { $or: [{ name: regex }, { email: regex }] }
        ]
      }).limit(5),
      Tag.find({
        $and: [
          { user: userId }, // Filter by user
          { name: regex }
        ]
      }).limit(5),
      Activity.find({
        $and: [
          { user: userId }, // Filter by user
          { details: regex }
        ]
      }).limit(5), 
    ]);

    res.json({ contacts, tags, activities });
  } catch (err: unknown) {
    res.status(500).json({ error: "Search failed", details: err as string });
  }
};