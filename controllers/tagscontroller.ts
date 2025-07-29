import { Request, Response } from "express";
import Tag from "../models/tagsmodel";
import Contact from "../models/contactmodel";
import { logActivity } from "../activitylogger";
import { ActivityTypes } from "../models/activityModel";

interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
  };
}

interface TagPayload {
  name: string;
  color: string;
}

export const create_tag = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, color } = req.body as TagPayload;
    const userId = authReq.user.uid;

    if (!name || !color) {
      res.status(400).json({ success: false, error: "Tag name and color are required" });
      return;
    }

    // Check if tag already exists
    const existingTag = await Tag.findOne({ user: userId, name });
    if (existingTag) {
      res.status(400).json({ success: false, error: "Tag already exists" });
      return;
    }

    const newTag = await Tag.create({ name, color, user: userId });

    await logActivity(
      userId,
      ActivityTypes.TAG_CREATED,
      `Created tag: ${name} with color ${color}`
    );

    res.status(201).json({
      success: true,
      message: "Tag created successfully",
      tag: newTag,
    });
  } catch (error: unknown) {
    console.error("Error creating tag:", error as string);
    res.status(500).json({ success: false, error: "Failed to create tag" });
  }
};

export const bulk_add_tags = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { tags } = req.body as { tags: TagPayload[] };
    const userId = authReq.user.uid;

    if (!Array.isArray(tags) || tags.length === 0) {
      res.status(400).json({ success: false, error: "Tags must be a non-empty array" });
      return;
    }

    const newTags: TagPayload[] = [];
    const createdTagNames: string[] = [];

    for (const tag of tags) {
      if (
        !tag ||
        typeof tag !== "object" ||
        typeof tag.name !== "string" ||
        typeof tag.color !== "string"
      ) {
        continue;
      }

      const exists = await Tag.findOne({ user: userId, name: tag.name });
      if (exists) continue;

      const newTag = await Tag.create({ name: tag.name, color: tag.color, user: userId });
      newTags.push(newTag);
      createdTagNames.push(tag.name);
    }

    if (newTags.length === 0) {
      res.status(400).json({
        success: false,
        message: "No new tags were created (duplicates or invalid entries).",
      });
      return;
    }

    // Log a single activity for bulk tag creation with all tag names
    if (createdTagNames.length > 0) {
      const tagList = createdTagNames.join(", ");
      await logActivity(
        userId,
        ActivityTypes.TAG_CREATED,
        `Bulk created ${createdTagNames.length} tags: ${tagList}`
      );
    }

    res.status(201).json({
      success: true,
      message: `${newTags.length} tag(s) created successfully`,
      tags: newTags,
    });
  } catch (error: unknown) {
    console.error("Error creating bulk tags:", error as string);
    res.status(500).json({ success: false, error: "Failed to create tags" });
  }
};

export const get_all_tags = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.uid;
    const { search = "", page = "1", limit = "10" } = req.query as {
      search?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = { user: userId };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Get tags with pagination
    const tags = await Tag.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const totalTags = await Tag.countDocuments(query);
    const totalPages = Math.ceil(totalTags / limitNum);

    // Get tag usage counts
    const tagCounts: { [key: string]: number } = {};
    for (const tag of tags) {
      const count = await Contact.countDocuments({
        user: userId,
        tags: tag.name,
      });
      tagCounts[tag.name] = count;
    }

    res.json({
      success: true,
      tags,
      tagCounts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTags,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching tags:", error as string);
    res.status(500).json({ success: false, error: "Failed to fetch tags" });
  }
};

export const edit_tag = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { tagId } = req.params;
    const { name, color } = req.body as TagPayload;
    const userId = authReq.user.uid;

    if (!name || !color) {
      res.status(400).json({ success: false, error: "Tag name and color are required" });
      return;
    }

    const tag = await Tag.findOne({ _id: tagId, user: userId });
    if (!tag) {
      res.status(404).json({ success: false, error: "Tag not found" });
      return;
    }

    const oldName = tag.name;
    const oldColor = tag.color;

    tag.name = name;
    tag.color = color;
    await tag.save();

    await logActivity(
      userId,
      ActivityTypes.TAG_EDITED,
      `Updated tag: ${oldName} (${oldColor}) → ${name} (${color})`
    );

    res.json({
      success: true,
      message: "Tag updated successfully",
      tag,
    });
  } catch (error: unknown) {
    console.error("Error updating tag:", error as string);
    res.status(500).json({ success: false, error: "Failed to update tag" });
  }
};

export const delete_tag = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { force } = req.query;
    const userId = authReq.user.uid;

    const tagToDelete = await Tag.findById(id);
    if (!tagToDelete) {
      res.status(404).json({ success: false, error: "Tag not found" });
      return;
    }

    const contactCount = await Contact.countDocuments({
      user: userId,
      tags: tagToDelete.name,
    });

    if (contactCount > 0) {
      if (force === "true") {
        await Contact.updateMany(
          { user: userId, tags: tagToDelete.name },
          { $pull: { tags: tagToDelete.name } }
        );

        await Tag.findByIdAndDelete(id);

        await logActivity(
          userId,
          ActivityTypes.FORCE_DELETE_TAG,
          `Force deleted tag "${tagToDelete.name}" and removed from ${contactCount} contacts`
        );

        res.status(200).json({
          message: `Tag "${tagToDelete.name}" force deleted and removed from ${contactCount} contacts`,
          success: true,
        });
      } else {
        res.status(400).json({
          error: `Cannot delete tag "${tagToDelete.name}" - it is currently used by ${contactCount} contact(s)`,
          success: false,
          tagName: tagToDelete.name,
          contactCount,
          suggestion: "Use ?force=true to remove tag from all contacts and delete it",
        });
      }
    } else {
      await Tag.findByIdAndDelete(id);

      await logActivity(
        userId,
        ActivityTypes.TAG_DELETED,
        `Deleted unused tag: "${tagToDelete.name}"`
      );

      res.status(200).json({
        message: `Tag "${tagToDelete.name}" deleted successfully`,
        success: true,
      });
    }
  } catch (error: unknown) {
    console.error("Error deleting tag:", error as string);
    res.status(500).json({ success: false, error: "Failed to delete tag" });
  }
};
