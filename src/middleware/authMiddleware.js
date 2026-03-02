const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "fallback_secret"
            );

            // Get user from the token
            req.user = await userRepository.findById(decoded.id);

            if (!req.user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }

            return next();
        } catch (error) {
            console.error("Auth Middleware Error:", error);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};

module.exports = { protect };
