const MindMap = require("../models/MindMap");
const MapMember = require("../models/MapMember");

/**
 * Check if a user has permission to edit a map.
 * Owner and Editor can edit. Viewer cannot.
 * For backwards compatibility, we also check if the user is the original owner
 * or in the collaborators array, in case MapMember documents aren't fully migrated.
 */
exports.canEditMap = async (userId, mapId) => {
    // 1. Check MapMember collection
    const member = await MapMember.findOne({ mindMapId: mapId, userId });
    if (member) {
        return member.role === "OWNER" || member.role === "EDITOR";
    }

    // 2. Fallback to older MindMap schema checks
    const map = await MindMap.findById(mapId);
    if (!map) return false;

    if (map.userId.toString() === userId.toString()) return true;
    if (map.collaborators && map.collaborators.includes(userId)) return true;

    return false;
};

/**
 * Check if a user has OWNER permission for a map.
 */
exports.isMapOwner = async (userId, mapId) => {
    const member = await MapMember.findOne({ mindMapId: mapId, userId });
    if (member) {
        return member.role === "OWNER";
    }

    const map = await MindMap.findById(mapId);
    if (!map) return false;

    return map.userId.toString() === userId.toString();
};

/**
 * Get the role of a user for a specific map.
 */
exports.getUserRole = async (userId, mapId) => {
    const member = await MapMember.findOne({ mindMapId: mapId, userId });
    if (member) return member.role;

    const map = await MindMap.findById(mapId);
    if (!map) return null;

    if (map.userId.toString() === userId.toString()) return "OWNER";
    if (map.collaborators && map.collaborators.includes(userId)) return "EDITOR";

    return null;
};
