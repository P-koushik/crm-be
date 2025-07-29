// server/routes/auth.ts
import express, { Request, Response } from "express";
import admin from "../firebase";
import User from "../models/usermodel";

const router = express.Router();

interface VerifyTokenRequest extends Request {
  body: {
    token: string;
  };
}

interface RegisterRequest extends Request {
  body: {
    uid: string;
    email: string;
    name?: string;
    photoURL?: string;
  };
}

router.post("/verify-token", async (req: VerifyTokenRequest, res: Response) => {
  const { token } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email, displayName, picture } = decodedToken;

    let user = await User.findOne({ uid });
    if (!user) {
      user = await User.create({
        uid,
        email,
        displayName,
        photoURL: picture || "",
      });
    }

    res.status(200).json({ message: "Authenticated", user });
  } catch (err: unknown) {
    console.error("Token verification failed:", err as string);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

router.post("/auth/register", async (req: RegisterRequest, res: Response) => {
  try {
    const { uid, email, name, photoURL } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // First check if user exists by uid
    let user = await User.findOne({ uid });

    if (!user) {
      // If not found by uid, check by email
      user = await User.findOne({ email });
      
      if (!user) {
        // Create new user if not found by either uid or email
        user = new User({
          uid,
          email,
          name: name || "",
          photoURL: photoURL || "",
        });
        await user.save();
      } else {
        // User exists by email but not uid, update the uid
        user.uid = uid;
        if (name) user.name = name;
        if (photoURL) user.photoURL = photoURL;
        await user.save();
      }
    } else {
      // User exists by uid, update other fields if provided
      if (name) user.name = name;
      if (photoURL) user.photoURL = photoURL;
      await user.save();
    }

    res.status(201).json({ message: "User synced successfully", user });
  } catch (error: unknown) {
    console.error("Sync error:", error as string);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

export default router;
