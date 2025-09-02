"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/server.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = __importDefault(require("./routes/auth"));
const contact_Routes_1 = __importDefault(require("./routes/contact-Routes"));
const tag_Routes_1 = __importDefault(require("./routes/tag-Routes"));
const profile_Routes_1 = __importDefault(require("./routes/profile-Routes"));
const activity_Routes_1 = __importDefault(require("./routes/activity-Routes"));
const chat_Routes_1 = __importDefault(require("./routes/chat-Routes"));
const search_Routes_1 = __importDefault(require("./routes/search-Routes"));
const ai_Routes_1 = __importDefault(require("./routes/ai-Routes"));
const message_Routes_1 = __importDefault(require("./routes/message-Routes"));
const dashboard_Routes_1 = __importDefault(require("./routes/dashboard-Routes"));
const notification_Routes_1 = __importDefault(require("./routes/notification-Routes"));
const team_Routes_1 = __importDefault(require("./routes/team-Routes"));
// Load environment variables
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";
const app = (0, express_1.default)();
// MongoDB connection
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error("MONGO_URI environment variable is not set");
    process.exit(1);
}
mongoose_1.default.connect(mongoUri).then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB error:", err);
});
// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001"
        ];
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            console.log("CORS blocked origin:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200
};
// Middlewares
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)(corsOptions));
// Add CORS preflight handling
app.options("*", (0, cors_1.default)(corsOptions));
// Routes
app.use("/api", auth_1.default);
app.use("/api", contact_Routes_1.default);
app.use("/api", tag_Routes_1.default);
app.use("/api", profile_Routes_1.default);
app.use("/api", activity_Routes_1.default);
app.use("/api", chat_Routes_1.default);
app.use("/api", search_Routes_1.default);
app.use("/api/ai", ai_Routes_1.default);
app.use("/api", message_Routes_1.default);
app.use("/api", dashboard_Routes_1.default);
app.use("/api", notification_Routes_1.default);
app.use("/api", team_Routes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Global error handler:", err);
    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({
            error: "CORS error",
            message: "Origin not allowed",
            details: req.headers.origin
        });
    }
    res.status(500).json({
        error: "Internal server error",
        message: err.message
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
