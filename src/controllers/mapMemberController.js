const MapMember = require("../models/MapMember");
const MindMap = require("../models/MindMap");
const User = require("../models/User");
const { isMapOwner, getUserRole } = require("../services/mapPermissionService");

// GET /mindmaps/:id/members
exports.getMembers = async (req, res) => {
    try {
        const role = await getUserRole(req.user._id, req.params.id);
        if (!role) return res.status(403).json({ error: "Access denied" });

        // Ensure OWNER is in MapMembers if missing (Migration helper)
        const map = await MindMap.findById(req.params.id);
        if (!map) return res.status(404).json({ error: "Map not found" });

        // Fetch members and populate user details
        const members = await MapMember.find({ mindMapId: req.params.id })
            .populate("userId", "username email color")
            .populate("invitedBy", "username");

        // Small hack to ensure original owner is always in the list if MapMembers DB is empty
        const ownerExists = members.find(m => m.role === "OWNER");
        if (!ownerExists && map.userId) {
            const ownerDoc = await MapMember.create({
                mindMapId: map._id,
                userId: map.userId,
                role: "OWNER"
            });
            await ownerDoc.populate("userId", "username email color");
            members.push(ownerDoc);
        }

        res.json(members);
    } catch (err) {
        console.error("Error fetching map members:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// POST /mindmaps/:id/invite
exports.inviteMember = async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email || !role) return res.status(400).json({ error: "Email and role are required." });

        // Only Owners can invite for now
        const mapOwner = await isMapOwner(req.user._id, req.params.id);
        if (!mapOwner) return res.status(403).json({ error: "Only the map owner can invite members." });

        const userToInvite = await User.findOne({ email });
        if (!userToInvite) return res.status(404).json({ error: "User with this email not found." });

        if (req.user._id.toString() === userToInvite._id.toString()) {
            return res.status(400).json({ error: "You cannot invite yourself." });
        }

        const existingMember = await MapMember.findOne({ mindMapId: req.params.id, userId: userToInvite._id });
        if (existingMember) {
            return res.status(400).json({ error: "User is already a member of this map." });
        }

        const newMember = await MapMember.create({
            mindMapId: req.params.id,
            userId: userToInvite._id,
            role: role.toUpperCase(),
            invitedBy: req.user._id,
        });

        await newMember.populate("userId", "username email color");
        await newMember.populate("invitedBy", "username");

        // Deprecate: for backwards compatibility keep collaborators array synced
        const map = await MindMap.findById(req.params.id);
        if (map && !map.collaborators.includes(userToInvite._id)) {
            map.collaborators.push(userToInvite._id);
            await map.save();
        }

        res.status(201).json(newMember);
    } catch (err) {
        console.error("Error inviting member:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// PUT /mindmaps/:id/members/:memberId
exports.updateMemberRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) return res.status(400).json({ error: "Role is required." });

        const mapOwner = await isMapOwner(req.user._id, req.params.id);
        if (!mapOwner) return res.status(403).json({ error: "Only the map owner can change roles." });

        const member = await MapMember.findOne({ _id: req.params.memberId, mindMapId: req.params.id });
        if (!member) return res.status(404).json({ error: "Member not found on this map." });

        if (member.role === "OWNER") {
            return res.status(400).json({ error: "Cannot change the role of the map owner." });
        }

        member.role = role.toUpperCase();
        await member.save();

        await member.populate("userId", "username email color");
        await member.populate("invitedBy", "username");

        res.json(member);
    } catch (err) {
        console.error("Error updating member role:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// DELETE /mindmaps/:id/members/:memberId
exports.removeMember = async (req, res) => {
    try {
        const mapOwner = await isMapOwner(req.user._id, req.params.id);
        if (!mapOwner) return res.status(403).json({ error: "Only the map owner can remove members." });

        const member = await MapMember.findOne({ _id: req.params.memberId, mindMapId: req.params.id });
        if (!member) return res.status(404).json({ error: "Member not found." });

        if (member.role === "OWNER") {
            return res.status(400).json({ error: "Cannot remove the map owner." });
        }

        await MapMember.findByIdAndDelete(member._id);

        // Also remove from backwards-compatible array
        const map = await MindMap.findById(req.params.id);
        if (map) {
            map.collaborators = map.collaborators.filter(id => id.toString() !== member.userId.toString());
            await map.save();
        }

        res.json({ message: "Member removed successfully." });
    } catch (err) {
        console.error("Error removing member:", err);
        res.status(500).json({ error: "Server error" });
    }
};
