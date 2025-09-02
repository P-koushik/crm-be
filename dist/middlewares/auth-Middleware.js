"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = __importDefault(require("../firebase"));
const authMiddleware = async (req, res, next) => {
    let token;
    // Get token from Authorization header or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }
    try {
        const decodedToken = await firebase_1.default.auth().verifyIdToken(token);
        req.user = { uid: decodedToken.uid };
        next();
    }
    catch (err) {
        if (err instanceof Error) {
            console.error("Auth middleware error:", err.message);
        }
        else {
            console.error("Unknown error in auth middleware");
        }
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};
exports.default = authMiddleware;
