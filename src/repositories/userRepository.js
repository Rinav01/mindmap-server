const User = require("../models/User");

class UserRepository {
    async createUser(userData) {
        const user = new User(userData);
        return await user.save();
    }

    async findByEmail(email) {
        return await User.findOne({ email });
    }

    async findByUsername(username) {
        return await User.findOne({ username });
    }

    async findById(id) {
        return await User.findById(id).select("-password");
    }
}

module.exports = new UserRepository();
