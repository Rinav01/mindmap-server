const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");

const CURSOR_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e"
];

class AuthService {
    generateToken(id) {
        return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
            expiresIn: "30d",
        });
    }

    async registerUser(userData) {
        const { username, email, password } = userData;

        // Check if user exists
        const userExists = await userRepository.findByEmail(email);
        if (userExists) {
            throw new Error("User with this email already exists");
        }
        const usernameExists = await userRepository.findByUsername(username);
        if (usernameExists) {
            throw new Error("Username already taken");
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Pick random color
        const randomColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

        // Create user
        const user = await userRepository.createUser({
            username,
            email,
            password: hashedPassword,
            color: randomColor,
        });

        return {
            token: this.generateToken(user._id),
            user: {
                _id: user.id,
                username: user.username,
                name: user.username,
                email: user.email,
                color: user.color,
                hasCompletedOnboarding: user.hasCompletedOnboarding || false,
                hasCompletedAdvancedTutorial: user.hasCompletedAdvancedTutorial || false,
            },
        };
    }

    async loginUser(email, password) {
        const user = await userRepository.findByEmail(email);

        if (!user) {
            throw new Error("Invalid email or password");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error("Invalid email or password");
        }

        return {
            token: this.generateToken(user._id),
            user: {
                _id: user.id,
                username: user.username,
                name: user.username,
                email: user.email,
                color: user.color,
                hasCompletedOnboarding: user.hasCompletedOnboarding || false,
                hasCompletedAdvancedTutorial: user.hasCompletedAdvancedTutorial || false,
            },
        };
    }
}

module.exports = new AuthService();
