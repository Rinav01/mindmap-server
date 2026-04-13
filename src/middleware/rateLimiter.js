const rateLimit = require("express-rate-limit");

// Shared handler for all limiters
const rateLimitHandler = (req, res) => {
  res.status(429).json({ message: "Too many requests, please try again later." });
};

// Global baseline – applies to every route
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Stricter limiter for auth routes (login / register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Tightest limiter for AI routes (expensive Groq calls)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = { globalLimiter, authLimiter, aiLimiter };
