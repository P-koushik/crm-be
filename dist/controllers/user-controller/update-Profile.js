"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.update_profile = void 0;
const zod_1 = require("zod");
const user_Model_1 = __importDefault(require("../../models/user-Model"));
const cloudinary_1 = require("cloudinary");
const activitylogger_1 = require("../../activitylogger");
const types_1 = require("../../types");
// Cloudinary config
cloudinary_1.v2.config({
    cloud_name: 'ddlrkl4jy',
    api_key: '212535856243683',
    api_secret: 'nGJwawCFcUd0VXpesvJI_VHTxeg',
});
// Zod Schema for validation
const UpdateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name is required").max(100, "Name too long"),
        email: zod_1.z.string().email("Invalid email format"),
        phone: zod_1.z.string().optional(),
        company: zod_1.z.string().optional(),
        photoUrl: zod_1.z.string().optional(),
    }),
});
const update_profile = async (req, res) => {
    try {
        // Validate request
        const validatedData = UpdateProfileSchema.parse(req);
        const { name, email, phone, company, photoUrl: newPhotoUrl } = validatedData.body;
        const authReq = req;
        const existingUser = await user_Model_1.default.findOne({ uid: authReq.user.uid });
        if (!existingUser) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        let finalPhotoUrl = existingUser.photoUrl;
        if (newPhotoUrl) {
            if (newPhotoUrl.startsWith("data:")) {
                try {
                    const uploadResult = await cloudinary_1.v2.uploader.upload(newPhotoUrl, {
                        folder: "avatars",
                        public_id: `avatar_${authReq.user.uid}`,
                        overwrite: true,
                        resource_type: "image",
                    });
                    finalPhotoUrl = uploadResult.secure_url;
                }
                catch (uploadError) {
                    const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
                    console.error("Cloudinary upload failed:", errorMessage);
                    res.status(500).json({ error: "Failed to upload image to Cloudinary" });
                    return;
                }
            }
            else if (newPhotoUrl.startsWith("http")) {
                finalPhotoUrl = newPhotoUrl;
            }
        }
        const updatedUser = await user_Model_1.default.findOneAndUpdate({ uid: authReq.user.uid }, {
            name: name.trim(),
            email: email.trim(),
            phone: phone || "",
            company: company || "",
            photoUrl: finalPhotoUrl,
        }, { new: true, runValidators: true });
        if (!updatedUser) {
            res.status(404).json({ error: "User not found after update" });
            return;
        }
        // Log profile update activity
        await (0, activitylogger_1.log_activity)(authReq.user.uid, types_1.ActivityTypes.CONTACT_EDITED, `Updated profile: ${updatedUser.name} (${updatedUser.email})`);
        res.status(200).json({
            success: true,
            user: {
                _id: updatedUser._id,
                uid: updatedUser.uid,
                name: updatedUser.name || "",
                email: updatedUser.email || "",
                phone: updatedUser.phone || "",
                company: updatedUser.company || "",
                photoUrl: updatedUser.photoUrl || "",
                role: updatedUser.role || "",
                organizationName: updatedUser.organizationName || "",
                teamCode: updatedUser.teamCode || "",
                team: updatedUser.team,
                isActive: updatedUser.isActive,
                lastLoginAt: updatedUser.lastLoginAt,
                walkthrough: updatedUser.walkthrough || [],
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
            },
            message: "Profile updated successfully",
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("Validation error:", error.errors);
            res.status(400).json({
                error: "Invalid request data",
                details: error.errors
            });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error updating profile:", errorMessage);
        res.status(500).json({ error: "Failed to update profile" });
    }
};
exports.update_profile = update_profile;
