import { Request, Response } from "express";
import User from "../models/usermodel";
import Contact from "../models/contactmodel";
import Tag from "../models/tagsmodel";
import Activity from "../models/activityModel";
import ChatMessage from "../models/chatModel";
import { v2 as cloudinary } from "cloudinary";
import { logActivity } from "../activitylogger";
import { ActivityTypes } from "../models/activityModel";

// 👤 Extend Express Request to include authenticated user
interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
  };
}

// 📦 Define the structure for expected update body
interface UpdateProfileBody {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  avatar?: string;
}

// ⚙️ Cloudinary config (should be in .env for production)
cloudinary.config({
  cloud_name: 'ddlrkl4jy',
  api_key: '212535856243683',
  api_secret: 'nGJwawCFcUd0VXpesvJI_VHTxeg',
});

// ✅ GET /profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await User.findOne({ uid: authReq.user.uid });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({
      user: {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        company: user.company || "",
        photoUrl: user.photoUrl || "",
      },
      message: "Profile retrieved successfully",
      success: true,
    });
  } catch (error: unknown) {
    console.error("Error retrieving profile:", error as string);
    res.status(500).json({ error: "Failed to retrieve profile" });
  }
};

// ✅ PUT /update-profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, email, phone, company, avatar } = req.body as UpdateProfileBody;

    if (!name || !email) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }

    const existingUser = await User.findOne({ uid: authReq.user.uid });
    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let photoUrl = existingUser.photoUrl;

    if (avatar) {
      if (avatar.startsWith("data:")) {
        try {
          const uploadResult = await cloudinary.uploader.upload(avatar, {
            folder: "avatars",
            public_id: `avatar_${authReq.user.uid}`,
            overwrite: true,
            resource_type: "image",
          });
          photoUrl = uploadResult.secure_url;
        } catch (uploadError: unknown) {
          console.error("Cloudinary upload failed:", uploadError as string);
          res.status(500).json({ error: "Failed to upload image to Cloudinary" });
          return;
        }
      } else if (avatar.startsWith("http")) {
        photoUrl = avatar;
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { uid: authReq.user.uid },
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone || "",
        company: company || "",
        photoUrl,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({ error: "User not found after update" });
      return;
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        company: updatedUser.company,
        photoUrl: updatedUser.photoUrl,
      },
      success: true,
    });
  } catch (error: unknown) {
    console.error("Error updating profile:", error as string);

    if (error === "ValidationError") {
      res.status(400).json({ error: error });
      return;
    }

    if (error === 11000) {
      res.status(400).json({ error: "Email already exists" });
      return;
    }

    res.status(500).json({ error: "Failed to update profile" });
  }
};

// ✅ DELETE /profile - Delete user account and all related data
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.uid;

    // Find the user first to get their details for logging
    const user = await User.findOne({ uid: userId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get counts for logging
    const contactCount = await Contact.countDocuments({ user: userId });
    const tagCount = await Tag.countDocuments({ user: userId });
    const activityCount = await Activity.countDocuments({ user: userId });
    const chatCount = await ChatMessage.countDocuments({ user: userId });

    // Delete all related data with cascade deletion
    const deletePromises = [
      Contact.deleteMany({ user: userId }),
      Tag.deleteMany({ user: userId }),
      Activity.deleteMany({ user: userId }),
      ChatMessage.deleteMany({ user: userId }),
      User.deleteOne({ uid: userId })
    ];

    await Promise.all(deletePromises);

    // Log the account deletion activity (this will be the last activity for this user)
    await logActivity(
      userId,
      ActivityTypes.ACCOUNT_DELETED,
      `Account deleted - Removed ${contactCount} contacts, ${tagCount} tags, ${activityCount} activities, ${chatCount} chat messages`
    );

    res.status(200).json({
      message: "Account deleted successfully. All data has been permanently removed.",
      success: true,
      deletedData: {
        contacts: contactCount,
        tags: tagCount,
        activities: activityCount,
        chatMessages: chatCount
      }
    });
  } catch (error: unknown) {
    console.error("Error deleting user account:", error as string);
    res.status(500).json({ error: "Failed to delete account" });
  }
};
