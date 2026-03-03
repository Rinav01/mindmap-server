const authService = require("../services/authService");

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

        const userData = await authService.registerUser({ username, email, password });
        res.status(201).json(userData);
    } catch (error) {
        console.error("Register Error:", error.message);
        if (error.message === "User with this email already exists" || error.message === "Username already taken") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Server error" });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

        const userData = await authService.loginUser(email, password);
        res.status(200).json(userData);
    } catch (error) {
        console.error("Login Error:", error.message);
        if (error.message === "Invalid email or password") {
            return res.status(401).json({ message: error.message });
        }
        res.status(500).json({ message: "Server error" });
    }
};

const getMe = async (req, res) => {
    // req.user is already set by the protect middleware
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Not authorized" });
    }
    res.status(200).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        color: user.color || "#3b82f6",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    });
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
};
