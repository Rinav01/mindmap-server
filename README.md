# MindMap Server 🧠

A high-performance, real-time collaborative mind mapping backend built with Node.js and Express. This server powers complex hierarchical node management, role-based access control, state-based versioning, activity logging, comment threads, and live multi-user synchronization — all on a clean Controller-Service-Repository architecture.

---

## 🚀 Features

### 🌲 Hierarchical Node Management
- **Infinite Nesting**: Nodes reference their parent via `parentId`, allowing arbitrarily deep trees.
- **Recursive Cascading Deletes**: Deleting a node recursively removes all its children, preventing orphaned nodes.
- **Spatial Positioning**: Each node stores `x` and `y` coordinates for freeform canvas-based rendering on the client.
- **Rich Properties**: Supports custom `color`, `fontSize`, `text`, and `notes` per node.
- **Automatic Root Node**: A "Central Idea" root node is created automatically whenever a new mind map is created.

### 👥 Role-Based Collaboration & Access Control
- **Three-Tier Permissions**: Users are assigned `OWNER`, `EDITOR`, or `VIEWER` roles on a per-map basis via the `MapMember` model.
- **Ownership Enforcement**: Only the `OWNER` can rename, delete, restore, share, or permanently remove a map.
- **Editor Permissions**: `EDITOR` and `OWNER` roles can create, modify, and delete nodes.
- **Email-Based Invitations**: Owners can invite other registered users to a map by their email address.
- **Self-Invitation Guard**: Owners cannot invite themselves.
- **Unique Membership**: A unique compound index on `(mindMapId, userId)` ensures users can only hold one role per map.

### 🔴 Real-Time Collaboration (Socket.io)
- **Room-Based Architecture**: Clients join dedicated rooms per `mapId`, ensuring updates are scoped correctly.
- **Live Node Sync**: `node-added`, `node-updated`, `node-deleted`, and `node-dragged` events are broadcast to all room members in real time.
- **Presence Awareness**: Users receive a full `user-list` on join; `user-joined` and `user-disconnected` events are broadcast to notify others.
- **Live Cursors**: `cursor-moved` events relay real-time cursor positions and user identity across all collaborators.
- **Selection Highlighting**: `selection-update` broadcasts which nodes each user currently has selected.
- **Edit Locking**: `node-editing` and `node-editing-stopped` events allow clients to lock and unlock nodes while they are being edited, preventing conflicts.
- **Graceful Disconnect**: On disconnect, any active edit lock is automatically released, and the user's remote selection is cleared.

### 🕒 Version Control & Snapshots
- **State Snapshots**: A `Version` document stores a full array snapshot of all nodes at a given point in time.
- **Action Types**: Versions are tagged with an `actionType` (`manual`, `auto-layout`, `align`, `delete`, `restore`) for a descriptive changelog.
- **Custom Labels**: Snapshots can have a human-readable `label` for quick identification.
- **One-Click Restore**: Restore a map to any snapshot via a dedicated endpoint; the restoration is broadcast via `map-restored` to all live collaborators.
- **Version History**: Retrieve a sorted list of all versions for a given map.

### 📝 Activity Logging
- **Automatic Tracking**: Server-side activity logs are created for every significant node action: `NODE_CREATED`, `NODE_DELETED`, `NODE_EDITED`, `NODE_MOVED`, `NODE_COLOR_CHANGED`.
- **Rich Metadata**: Each log entry stores a `metadata` object (e.g., `{ oldColor, newColor }` or `{ text }`) for meaningful change descriptions.
- **Real-Time Broadcast**: Activity logs are emitted to the map room via `activity-log-added` so all collaborators see the audit feed update instantly.
- **Optimized Queries**: The `ActivityLog` collection has a compound index on `(mindMapId, createdAt)` for fast, sorted retrieval.

### 💬 Node Comments
- **Threaded Discussions**: Users can post comments directly on individual nodes, keyed by both `mapId` and `nodeId`.
- **Populated Responses**: User details (`name`, `username`, `color`) are populated on comment retrieval for a rich UI experience.
- **Chronological Ordering**: Comments are sorted oldest-first (`createdAt: 1`) for a natural conversation flow.
- **Permissioned Deletion**: A user can delete their own comments; Editors/Owners can also delete any comment for moderation.
- **Real-Time Events**: `comment-added` and `comment-deleted` events are broadcast to the map room in real time.

### 📂 Lifecycle & Organization
- **Soft Deletion & Trash Bin**: Maps are soft-deleted by setting a `deletedAt` timestamp; they are excluded from the main dashboard but accessible in a trash view.
- **Restore from Trash**: One-click restoration clears the `deletedAt` field, bringing the map back to active status.
- **Permanent Deletion**: Irreversibly removes the map document from the database.
- **Starring**: Users can toggle a `isStarred` flag on any accessible map for quick-access bookmarking.

### 🔐 Authentication & Security
- **JWT-Based Auth**: All protected routes require a valid `Bearer` token in the `Authorization` header.
- **Password Hashing**: User passwords are hashed with `bcryptjs` before storage — plain-text passwords are never persisted.
- **Stateless Middleware**: The `protect` middleware is a single, stateless async function that verifies the token, fetches the user from the repository, and attaches it to `req.user`.

---

## 🛠️ Technical Stack

| Category | Technology |
| :--- | :--- |
| **Runtime** | [Node.js](https://nodejs.org/) v18+ |
| **Framework** | [Express.js](https://expressjs.com/) v5.x |
| **Database** | [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) v9.x |
| **Real-Time** | [Socket.io](https://socket.io/) v4.x |
| **Authentication** | `jsonwebtoken` + `bcryptjs` |
| **Dev Server** | `nodemon` |
| **Architecture** | Controller → Service → Repository (CSR) |

---

## ⚙️ Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB** (local instance or a MongoDB Atlas connection string)

---

## 📥 Installation & Setup

1. **Clone the repository**
    ```bash
    git clone <repository-url>
    cd mindmap-server
    ```

2. **Install dependencies**
    ```bash
    npm install
    ```

3. **Configure Environment**

    Create a `.env` file in the project root:
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/mindmap
    JWT_SECRET=your_super_secure_jwt_secret_key
    ```

4. **Start the Server**
    ```bash
    # Development (hot-reload via nodemon)
    npm run dev

    # Production
    npm start
    ```

---

## 📂 Project Structure

```
src/
├── config/
│   └── db.js                     # Mongoose connection logic
│
├── controllers/
│   ├── mindMapController.js      # Map & node CRUD, activity log creation
│   ├── mapMemberController.js    # Invite, list, update, remove members
│   └── nodeCommentController.js  # Comment CRUD + socket broadcast
│
├── middleware/
│   └── authMiddleware.js         # JWT verification, attaches req.user
│
├── models/
│   ├── User.js                   # email, password (hashed), username, color
│   ├── MindMap.js                # title, userId, collaborators[], isStarred, deletedAt
│   ├── Node.js                   # mindMapId, parentId, text, notes, x, y, color, fontSize
│   ├── MapMember.js              # mindMapId, userId, role (OWNER|EDITOR|VIEWER), invitedBy
│   ├── ActivityLog.js            # mindMapId, userId, action, nodeId, metadata
│   ├── NodeComment.js            # mapId, nodeId, userId, content
│   ├── Version.js                # mindMapId, createdBy, snapshot[], label, actionType
│   └── Template.js               # Reusable map templates
│
├── repositories/
│   └── userRepository.js         # Data access layer for User documents
│
├── routes/
│   ├── authRoutes.js             # /api/auth — register, login, me
│   ├── mindmapRoutes.js          # /api/mindmaps — maps, nodes, members, versions, activity
│   ├── nodeCommentRoutes.js      # /:mapId/nodes/:nodeId/comments (nested router)
│   └── versionRoutes.js          # /api — versioning endpoints
│
├── services/
│   ├── authService.js            # User creation, password hashing, JWT signing
│   └── mapPermissionService.js   # canEditMap(), isMapOwner(), getUserRole()
│
├── socket/
│   └── index.js                  # All Socket.io event handlers & room presence map
│
└── server.js                     # App entry point (Express + Socket.io bootstrap)
```

---

## 🔌 API Reference

> All routes marked ✅ require an `Authorization: Bearer <token>` header.

### 🔑 Authentication

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Create a new user account | ❌ |
| `POST` | `/api/auth/login` | Log in and receive a JWT | ❌ |
| `GET` | `/api/auth/me` | Get the current user's profile | ✅ |

### 🗺️ Mind Maps

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mindmaps` | Get all accessible maps (owned & shared), with node counts |
| `POST` | `/api/mindmaps` | Create a new map (auto-creates root node & OWNER membership) |
| `GET` | `/api/mindmaps/trash` | Get all soft-deleted maps for the current user |
| `GET` | `/api/mindmaps/:id` | Get a single map's details |
| `PATCH` | `/api/mindmaps/:id/title` | Update the map's title (Owner only) |
| `PATCH` | `/api/mindmaps/:id/star` | Toggle the starred status |
| `DELETE` | `/api/mindmaps/:id` | Soft-delete a map (move to Trash) |
| `PATCH` | `/api/mindmaps/:id/restore` | Restore a map from the Trash |
| `DELETE` | `/api/mindmaps/:id/permanent` | Permanently delete a map |
| `GET` | `/api/mindmaps/:id/activity` | Get the last 50 activity log entries for a map |

### 🌿 Nodes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mindmaps/:id/nodes` | Get all nodes for a map |
| `POST` | `/api/mindmaps/nodes` | Create a new node (requires `mindMapId` in body) |
| `PATCH` | `/api/mindmaps/nodes/:id` | Update node properties (`x`, `y`, `text`, `notes`, `color`, `fontSize`) |
| `PATCH` | `/api/mindmaps/nodes/:id/text` | Update node text only |
| `DELETE` | `/api/mindmaps/nodes/:id` | Delete a node and all its descendants |

### 👥 Members & Sharing

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mindmaps/:id/members` | List all members and their roles |
| `POST` | `/api/mindmaps/:id/invite` | Invite a user by email (Owner only) |
| `PUT` | `/api/mindmaps/:id/members/:memberId` | Change a member's role (Owner only) |
| `DELETE` | `/api/mindmaps/:id/members/:memberId` | Remove a member (Owner only) |

### 💬 Node Comments

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mindmaps/:mapId/nodes/:nodeId/comments` | Get all comments for a node |
| `POST` | `/api/mindmaps/:mapId/nodes/:nodeId/comments` | Post a new comment |
| `DELETE` | `/api/mindmaps/:mapId/nodes/:nodeId/comments/:commentId` | Delete a comment |

### 🕒 Versioning

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mindmaps/:id/versions` | Get version history for a map |
| `POST` | `/api/mindmaps/:id/versions` | Create a new snapshot/version |
| `POST` | `/api/mindmaps/:id/versions/:vid/restore` | Restore the map to this version |
| `DELETE` | `/api/mindmaps/:id/versions/:vid` | Delete a specific version snapshot |

---

## 📡 WebSocket Events (Socket.io)

Clients connect and join a room for a specific map. All events are scoped within that room.

### Connection & Presence

| Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join-map` | Client → Server | `{ mapId, user }` | Join a map's room; receive user list |
| `leave-map` | Client → Server | `mapId` | Explicitly leave a map's room |
| `user-list` | Server → Client | `{ [socketId]: userInfo }` | Sent to newly joined user with all active users |
| `user-joined` | Server → Room | `{ id, name, color }` | Broadcast when a new user joins |
| `user-disconnected` | Server → Room | `socketId` | Broadcast when a user disconnects |
| `cursor-moved` | Client → Server | `{ mapId, cursor }` | Relay live cursor position to others |

### Node Events

| Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `node-added` | Client → Server | `{ mapId, node }` | Broadcast new node to room |
| `node-updated` | Client → Server | `{ mapId, node }` | Broadcast updated node to room |
| `node-deleted` | Client → Server | `{ mapId, nodeId }` | Broadcast deletion to room |
| `node-dragged` | Client → Server | `{ mapId, nodeId, position }` | High-frequency position relay during drag |

### Collaborative Awareness

| Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `selection-update` | Client → Server | `{ mapId, nodeIds, user }` | Broadcast which nodes a user has selected |
| `node-editing` | Client → Server | `{ mapId, nodeId, user }` | Lock a node while a user is editing it |
| `node-editing-stopped` | Client → Server | `{ mapId, nodeId }` | Unlock a node when editing ends |

### Versioning Events

| Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `map-versions-changed` | Client → Server | `mapId` | Signal all clients to refresh version history |
| `map-restored` | Client → Server | `{ mapId, nodes, versionId }` | Signal all clients to reload map state |

---

## 🗄️ Data Models

### `User`
| Field | Type | Notes |
| :--- | :--- | :--- |
| `username` | String | Unique |
| `email` | String | Unique |
| `password` | String | bcrypt hash |
| `color` | String | Assigned user color for UI presence |

### `MindMap`
| Field | Type | Notes |
| :--- | :--- | :--- |
| `title` | String | Required |
| `userId` | ObjectId → User | Owner |
| `collaborators` | [ObjectId → User] | Legacy array; superseded by `MapMember` |
| `isStarred` | Boolean | Default: `false` |
| `deletedAt` | Date | `null` = active, date = in trash |

### `Node`
| Field | Type | Notes |
| :--- | :--- | :--- |
| `mindMapId` | ObjectId → MindMap | Required |
| `parentId` | ObjectId | `null` = root node |
| `text` | String | Default: `"Central Idea"` |
| `notes` | String | Rich text notes |
| `x`, `y` | Number | Canvas position |
| `color` | String | Custom node color |
| `fontSize` | Number | Custom font size |

### `MapMember`
| Field | Type | Notes |
| :--- | :--- | :--- |
| `mindMapId` | ObjectId → MindMap | Indexed |
| `userId` | ObjectId → User | Indexed |
| `role` | Enum | `OWNER`, `EDITOR`, `VIEWER` |
| `invitedBy` | ObjectId → User | Who sent the invite |

### `ActivityLog`
| Field | Type | Notes |
| :--- | :--- | :--- |
| `mindMapId` | ObjectId → MindMap | Indexed with `createdAt` |
| `userId` | ObjectId → User | Who performed the action |
| `action` | Enum | `NODE_CREATED`, `NODE_DELETED`, `NODE_EDITED`, `NODE_MOVED`, `NODE_COLOR_CHANGED` |
| `nodeId` | String | Reference to affected node |
| `metadata` | Mixed | Contextual data (e.g., old/new text or color) |

### `Version`
| Field | Type | Notes |
| :--- | :--- | :--- |
| `mindMapId` | ObjectId → MindMap | Indexed |
| `createdBy` | ObjectId → User | Snapshot author |
| `snapshot` | Array | Full copy of all nodes at time of save |
| `label` | String | Optional human-readable label |
| `actionType` | Enum | `manual`, `auto-layout`, `align`, `delete`, `restore` |

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request.

---

**License**: MIT
