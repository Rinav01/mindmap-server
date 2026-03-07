# 🧠 MindMap Pro — Backend Server

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=flat-square&logo=mongodb)](https://mongoosejs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3_70B-F55036?style=flat-square)](https://groq.com/)

A high-performance, real-time collaborative mind mapping backend. Handles hierarchical node management, role-based access control, versioning, activity logging, comment threads, map templates, **AI-powered map generation via Groq**, and multi-user WebSocket synchronization — built on a clean Controller → Service → Repository architecture.

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [📂 Project Structure](#-project-structure)
- [🗄️ Data Models](#️-data-models)
- [🔌 API Reference](#-api-reference)
- [📡 WebSocket Events](#-websocket-events)
- [🧰 Tech Stack](#-tech-stack)
- [🚦 Getting Started](#-getting-started)

---

## ✨ Features

### 🤖 AI Mindmap Generation (Groq)
- **One-prompt generation**: POST a topic string → Groq `llama3-70b-8192` returns a structured JSON tree → server converts to flat nodes and saves.
- **Prompt engineering**: A strict system prompt forces valid JSON output with up to 3 depth levels, 4–6 top-level subtopics, and 2–4 children each.
- **Subtree-centered layout**: A two-pass DFS algorithm computes each node's `x` and `y` so the tree is visually centered — no client-side layout pass required.
- **Clean slate**: The map's existing nodes are deleted before inserting the AI-generated tree, giving a fresh start.

### 🌲 Hierarchical Node Management
- **Infinite nesting** via `parentId` references.
- **Cascading deletes**: Removing a node recursively removes all descendants.
- **Spatial positioning**: Each node stores `x` and `y` for freeform canvas rendering.
- **Rich properties**: `color`, `fontSize`, `text`, `notes` per node.
- **Auto root node**: A "Central Idea" root node is created automatically for every new map.

### 👥 Role-Based Access Control
- **Three tiers**: `OWNER`, `EDITOR`, `VIEWER` — enforced at the API layer.
- Owner-exclusive actions: rename, delete, restore, share, permanently remove, manage members.
- Email-based invitations with duplicate and self-invite guards.
- Unique compound index on `(mindMapId, userId)` ensures a user holds only one role per map.

### 🔴 Real-Time Collaboration (Socket.io)
- Room-based architecture scoped per `mapId`.
- Live node sync: `node-added`, `node-updated`, `node-deleted`, `node-dragged`.
- Presence: `user-list`, `user-joined`, `user-disconnected`.
- Live cursors: `cursor-moved` relays real-time cursor positions with user identity.
- Edit locking: `node-editing` / `node-editing-stopped` prevent write conflicts.
- Remote selection highlights: `selection-update` shows which nodes peers are focused on.
- Graceful disconnect: edit locks and cursor data are automatically cleaned up.

### 🕒 Version Control & Snapshots
- Full-node snapshots stored as `Version` documents.
- Action types: `manual`, `auto-layout`, `align`, `delete`, `restore`.
- One-click restore broadcasts `map-restored` to all live collaborators.

### 📝 Activity Logging
- Automatic server-side logging for: `NODE_CREATED`, `NODE_DELETED`, `NODE_EDITED`, `NODE_MOVED`, `NODE_COLOR_CHANGED`.
- Rich `metadata` per entry (e.g., `{ oldColor, newColor }`, `{ text }`).
- Real-time `activity-log-added` broadcast.
- Compound index on `(mindMapId, createdAt)` for fast sorted retrieval.

### 💬 Node Comments
- Per-node threaded comments keyed by both `mapId` and `nodeId`.
- User details populated on retrieval (`username`, `color`).
- Real-time `comment-added` / `comment-deleted` events.
- Permissioned deletion: owners/editors can moderate; authors can delete their own.

### 🗂️ Templates
- Pre-built map blueprints: **Startup Planning**, **Project Breakdown**, **Study Notes**, **Brainstorm**.
- Auto-seeded on server start if the `templates` collection is empty.
- `POST /api/templates/from-template` re-allocates fresh ObjectIDs and rewires all parent-child relationships before creating the new map.

### 📦 Export
- `GET /api/mindmaps/:id/export/json` — full node AST as JSON.
- `GET /api/mindmaps/:id/export/md` — depth-mapped Markdown (`#` → `##` → `###`).

### 📁 Map Lifecycle
- **Soft delete & Trash Bin**: `deletedAt` timestamp instead of hard deletes.
- **Restore from Trash**: clears `deletedAt`.
- **Permanent delete**: irreversibly removes map and all associated data.
- **Starring**: `isStarred` toggle for bookmarking.

### 🔐 Authentication & Security
- JWT `Bearer` tokens — all protected routes require `Authorization` header.
- Passwords hashed with `bcryptjs` — never stored in plaintext.
- Stateless `protect` middleware: verifies token → fetches user → attaches to `req.user`.

---

## 🏗️ Architecture

```
HTTP Request
    │
    ▼
authMiddleware (JWT verify + user attach)
    │
    ▼
Route Handler
    │
    ▼
Controller  ──── calls ──── Service (business logic, permission checks)
    │                          │
    │                          └── calls ── Repository (DB queries)
    │
    └── emits Socket.io event to map room
```

All socket events are managed in `socket/index.js`, which maintains an in-memory `roomPresence` map of `{ mapId → { socketId → userInfo } }` for presence tracking.

---

## 📂 Project Structure

```
src/
├── config/
│   └── db.js                       # Mongoose connection + retry logic
│
├── controllers/
│   ├── mindMapController.js        # Map & node CRUD, export, activity log creation
│   ├── mapMemberController.js      # Invite, list, update role, remove members
│   ├── nodeCommentController.js    # Comment CRUD + socket broadcast
│   ├── aiController.js             # AI map generation via Groq (tree → nodes → DB)
│   └── templateController.js       # Template gallery + create-from-template
│
├── middleware/
│   └── authMiddleware.js           # JWT verification, req.user injection
│
├── models/
│   ├── User.js                     # email, password (hash), username, color
│   ├── MindMap.js                  # title, userId, isStarred, deletedAt
│   ├── Node.js                     # mindMapId, parentId, text, notes, x, y, color, fontSize
│   ├── MapMember.js                # mindMapId, userId, role (OWNER|EDITOR|VIEWER), invitedBy
│   ├── ActivityLog.js              # mindMapId, userId, action, nodeId, metadata
│   ├── NodeComment.js              # mapId, nodeId, userId, content
│   ├── Version.js                  # mindMapId, createdBy, snapshot[], label, actionType
│   └── Template.js                 # title, description, nodes[] (reusable blueprints)
│
├── repositories/
│   └── userRepository.js           # Data access layer for User documents
│
├── routes/
│   ├── authRoutes.js               # POST /api/auth/register|login, GET /api/auth/me
│   ├── mindmapRoutes.js            # /api/mindmaps — maps, nodes, members, versions, activity, export
│   ├── nodeCommentRoutes.js        # Nested under mindmapRoutes for comments
│   ├── versionRoutes.js            # Versioning endpoints
│   ├── templateRoutes.js           # GET /api/templates, POST /api/templates/from-template
│   └── aiRoutes.js                 # POST /api/ai/generate-mindmap
│
├── services/
│   ├── authService.js              # User creation, bcrypt hashing, JWT signing
│   ├── aiService.js                # Groq API client, prompt engineering, JSON parsing
│   └── mapPermissionService.js     # canEditMap(), isMapOwner(), getUserRole()
│
├── socket/
│   └── index.js                    # All Socket.io event handlers + room presence map
│
└── server.js                       # Express + Socket.io bootstrap, route mounting
```

---

## 🗄️ Data Models

### `User`
| Field | Type | Notes |
|---|---|---|
| `username` | String | Unique |
| `email` | String | Unique, lowercase |
| `password` | String | bcrypt hash |
| `color` | String | UI presence color (auto-assigned) |

### `MindMap`
| Field | Type | Notes |
|---|---|---|
| `title` | String | Required |
| `userId` | ObjectId → User | Owner |
| `isStarred` | Boolean | Default: `false` |
| `deletedAt` | Date | `null` = active, date = in trash |

### `Node`
| Field | Type | Notes |
|---|---|---|
| `mindMapId` | ObjectId → MindMap | Required, indexed |
| `parentId` | ObjectId | `null` = root |
| `text` | String | Default: `"Central Idea"` |
| `notes` | String | Multi-line description |
| `x`, `y` | Number | Canvas coordinates |
| `color` | String | Custom node color |
| `fontSize` | Number | Custom font size |

### `MapMember`
| Field | Type | Notes |
|---|---|---|
| `mindMapId` | ObjectId → MindMap | Compound unique index |
| `userId` | ObjectId → User | Compound unique index |
| `role` | Enum | `OWNER` \| `EDITOR` \| `VIEWER` |
| `invitedBy` | ObjectId → User | Who sent the invite |

### `ActivityLog`
| Field | Type | Notes |
|---|---|---|
| `mindMapId` | ObjectId → MindMap | Compound index with `createdAt` |
| `userId` | ObjectId → User | Actor |
| `action` | Enum | `NODE_CREATED` \| `NODE_DELETED` \| `NODE_EDITED` \| `NODE_MOVED` \| `NODE_COLOR_CHANGED` |
| `nodeId` | String | Affected node |
| `metadata` | Mixed | Contextual data (old/new values) |

### `Version`
| Field | Type | Notes |
|---|---|---|
| `mindMapId` | ObjectId | Indexed |
| `createdBy` | ObjectId → User | Snapshot author |
| `snapshot` | Array | Full copy of all nodes |
| `label` | String | Human-readable name |
| `actionType` | Enum | `manual` \| `auto-layout` \| `align` \| `delete` \| `restore` |

### `NodeComment`
| Field | Type | Notes |
|---|---|---|
| `mapId` | ObjectId → MindMap | Indexed |
| `nodeId` | String | Target node |
| `userId` | ObjectId → User | Author (populated on read) |
| `content` | String | Comment body |

### `Template`
| Field | Type | Notes |
|---|---|---|
| `title` | String | Display name |
| `description` | String | Short description |
| `nodes` | Array | Pre-wired node tree (titles + parentId refs) |
| `isPublic` | Boolean | Visibility flag |

---

## 🔌 API Reference

> All routes marked ✅ require `Authorization: Bearer <token>`

### 🔑 Authentication

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | ❌ | Create account |
| `POST` | `/api/auth/login` | ❌ | Login + receive JWT |
| `GET` | `/api/auth/me` | ✅ | Get current user profile |

### 🗺️ Mind Maps

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/mindmaps` | All accessible maps (owned + shared) with node counts |
| `POST` | `/api/mindmaps` | Create new map (auto-creates root node + OWNER membership) |
| `GET` | `/api/mindmaps/trash` | Soft-deleted maps |
| `GET` | `/api/mindmaps/:id` | Single map details |
| `PATCH` | `/api/mindmaps/:id/title` | Rename (Owner only) |
| `PATCH` | `/api/mindmaps/:id/star` | Toggle starred |
| `DELETE` | `/api/mindmaps/:id` | Soft-delete (to Trash) |
| `PATCH` | `/api/mindmaps/:id/restore` | Restore from Trash |
| `DELETE` | `/api/mindmaps/:id/permanent` | Permanently delete |
| `GET` | `/api/mindmaps/:id/activity` | Last 50 activity log entries |
| `GET` | `/api/mindmaps/:id/export/json` | Export full map as JSON |
| `GET` | `/api/mindmaps/:id/export/md` | Export map as Markdown |

### 🌿 Nodes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/mindmaps/:id/nodes` | All nodes for a map |
| `POST` | `/api/mindmaps/nodes` | Create node (`mindMapId` in body) |
| `PATCH` | `/api/mindmaps/nodes/:id` | Update node (`x`, `y`, `text`, `notes`, `color`, `fontSize`) |
| `PATCH` | `/api/mindmaps/nodes/:id/text` | Update node text only |
| `DELETE` | `/api/mindmaps/nodes/:id` | Delete node + all descendants |

### 👥 Members & Sharing

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/mindmaps/:id/members` | List members + roles |
| `POST` | `/api/mindmaps/:id/invite` | Invite by email (Owner only) |
| `PUT` | `/api/mindmaps/:id/members/:memberId` | Change role (Owner only) |
| `DELETE` | `/api/mindmaps/:id/members/:memberId` | Remove member (Owner only) |

### 💬 Comments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/mindmaps/:mapId/nodes/:nodeId/comments` | Get node comments |
| `POST` | `/api/mindmaps/:mapId/nodes/:nodeId/comments` | Post comment |
| `DELETE` | `/api/mindmaps/:mapId/nodes/:nodeId/comments/:commentId` | Delete comment |

### 🕒 Versioning

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/mindmaps/:id/versions` | Version history |
| `POST` | `/api/mindmaps/:id/versions` | Create snapshot |
| `POST` | `/api/mindmaps/:id/versions/:vid/restore` | Restore snapshot |
| `DELETE` | `/api/mindmaps/:id/versions/:vid` | Delete snapshot |

### 🗂️ Templates

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/templates` | List all public templates |
| `POST` | `/api/templates/from-template` | Create new map from template |

### 🤖 AI Generation

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/ai/generate-mindmap` | ✅ | Generate a full mindmap from a topic string using Groq |

**Request body:**
```json
{ "topic": "Machine Learning", "mindMapId": "64abc..." }
```

**What it does:**
1. Sends topic to Groq `llama3-70b-8192` with a strict JSON-forcing system prompt
2. Parses the returned tree (title + children[])
3. Runs a two-pass DFS to compute subtree-centered `x,y` positions for each node
4. Deletes all existing nodes in the map
5. Bulk-inserts the new AI-generated nodes
6. Returns the `NodeType[]` array

---

## 📡 WebSocket Events

Clients connect and join a room per `mapId`. All events are room-scoped.

### Connection & Presence

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join-map` | Client → Server | `{ mapId, user }` | Join room; receive full user list |
| `leave-map` | Client → Server | `mapId` | Leave room |
| `user-list` | Server → Client | `{ [socketId]: userInfo }` | Current users in room |
| `user-joined` | Server → Room | `{ id, name, color }` | New user joined |
| `user-disconnected` | Server → Room | `socketId` | User left |
| `cursor-moved` | Client → Server | `{ mapId, cursor }` | Relay cursor position to peers |

### Node Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `node-added` | Client → Server | `{ mapId, node }` | Broadcast new node |
| `node-updated` | Client → Server | `{ mapId, node }` | Broadcast node update |
| `node-deleted` | Client → Server | `{ mapId, nodeId }` | Broadcast deletion |
| `node-dragged` | Client → Server | `{ mapId, nodeId, position }` | High-frequency drag position relay |

### Collaborative Awareness

| Event | Direction | Payload | Description |
|---|---|---|---|
| `selection-update` | Client → Server | `{ mapId, nodeIds, user }` | Broadcast current selection |
| `node-editing` | Client → Server | `{ mapId, nodeId, user }` | Lock node during edit |
| `node-editing-stopped` | Client → Server | `{ mapId, nodeId }` | Unlock node after edit |

### Comments & Versioning

| Event | Direction | Payload | Description |
|---|---|---|---|
| `comment-added` | Server → Room | `NodeComment` | New comment posted |
| `comment-deleted` | Server → Room | `{ commentId }` | Comment removed |
| `activity-log-added` | Server → Room | `ActivityLog` | New activity entry |
| `map-versions-changed` | Client → Server | `mapId` | Prompt others to refresh version list |
| `map-restored` | Client → Server | `{ mapId, nodes, versionId }` | Prompt all clients to reload state |

---

## 🧰 Tech Stack

| Category | Technology |
|---|---|
| **Runtime** | Node.js 20+ |
| **Framework** | Express.js 5.x |
| **Database** | MongoDB + Mongoose 9.x |
| **Real-Time** | Socket.io 4.x |
| **Authentication** | `jsonwebtoken` + `bcryptjs` |
| **AI** | Groq SDK (`llama3-70b-8192`) |
| **Dev Server** | `nodemon` |
| **Architecture** | Controller → Service → Repository |

---

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone & Install
```bash
git clone https://github.com/your-username/mindmap-server.git
cd mindmap-server
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/mindmap
JWT_SECRET=your_super_secure_jwt_secret_key
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 3. Run
```bash
# Development (hot-reload via nodemon)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:5000`.

---

## 📜 License

MIT
