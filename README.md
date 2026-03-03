# MindMap Server 🧠

A high-performance Node.js/Express backend designed for real-time collaborative mind mapping. This server handles complex tree structures, recursive operations, state-based versioning, user authentication, and multi-user synchronization using Socket.io.

---

## 🚀 Core Capabilities

### 🌲 Hierarchical Node Management
- **Tree Persistence**: Stores nodes with `parentId` references, allowing for infinite nesting levels.
- **Recursive Integrity**: When a node is deleted, the server recursively identifies and removes all descendant nodes to prevent orphaned data.
- **Spatial Data**: Stores `x` and `y` coordinates for canvas-based rendering and real-time drag-and-drop.

### 👥 Real-Time Collaboration
- **Socket.io Integration**: Live updates across multiple clients for a seamless collaborative experience.
- **Presence Tracking**: Real-time cursor positions and user presence indicators.
- **Instant Synchronization**: Node additions, text updates, property changes, and dragging are broadcasted instantly to all connected peers in the same mind map room.
- **Map Sharing**: Invite other registered users to collaborate on your mind maps via email.

### 🕒 Advanced Versioning System (Snapshots)
- **State Snapshots**: Captures the entire state of a mind map (all nodes) into a single version document.
- **Relational Restoration**: During restoration, the server performs an "ID Mapping" operation. It maintains the correct `parentId` relationships while ensuring the restored tree is structurally identical to the captured state.
- **Action Tracking**: Categorizes versions by action (e.g., `manual`, `auto-layout`, `restore`).

### 📂 Organization & Trash
- **Soft Deletion**: Mind maps are flagged with `deletedAt` for a "Trash" system, allowing users to recover accidentally deleted maps.
- **Starring System**: Priority flagging for easy access to important maps.
- **Permanent Deletion**: Option to completely remove mind maps and all associated nodes from the database.

### 🔐 Secure Authentication
- **JWT-Based Auth**: Secure access to resources using JSON Web Tokens.
- **User Profiles**: Each user gets a unique profile with a system-assigned random color for their cursor in collaborative sessions.

---

## 🛠️ Technical Stack

- **Backend**: Node.js with Express 5.x.
- **Database**: MongoDB with Mongoose 9.x.
- **Real-Time**: Socket.io 4.x.
- **Security**: JWT for authentication, BcryptJS for password hashing.
- **Architecture**: Controller-Service-Repository pattern for better maintainability and testability.

---

## 📦 Database Schemas

### User
| Field | Type | Description |
| :--- | :--- | :--- |
| `username` | String | Unique username for the user. |
| `email` | String | Unique email address. |
| `password` | String | Hashed password. |
| `color` | String | Hex color assigned for collaboration cursors. |

### MindMap
| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | String | The display name of the map. |
| `userId` | ObjectId | Reference to the owner (User). |
| `collaborators` | [ObjectId] | Array of User references who can access the map. |
| `isStarred` | Boolean | Priority flag (default: false). |
| `deletedAt` | Date | Timestamp for soft-deletion (null if active). |

### Node
| Field | Type | Description |
| :--- | :--- | :--- |
| `mindMapId` | ObjectId | Reference to the parent MindMap. |
| `parentId` | ObjectId | Reference to the parent Node (null for root). |
| `text` | String | Label content of the node. |
| `x, y` | Number | Coordinates for visual placement. |
| `color` | String | Optional hex or CSS color code. |
| `fontSize` | Number | Optional font size in pixels. |

---

## 🔌 API Reference

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/register` | Register a new user. |
| `POST` | `/login` | Login and receive a JWT. |
| `GET` | `/me` | Get current user's profile (Requires Auth). |

### 2. Mind Map Endpoints (`/api/mindmaps`)
*All endpoints below require a valid JWT in the `Authorization` header.*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Get all maps (owned or collaborating). |
| `POST` | `/` | Create a new map (auto-generates root node). |
| `GET` | `/trash` | Get all soft-deleted mindmaps. |
| `GET` | `/:id` | Get a specific mindmap by ID. |
| `PATCH` | `/:id/star` | Toggle the `isStarred` status. |
| `PATCH` | `/:id/title` | Update the mindmap title. |
| `POST` | `/:id/share` | Invite a collaborator by email. |
| `PATCH` | `/:id/restore` | Restore a mindmap from the trash. |
| `DELETE` | `/:id` | Soft-delete a mindmap. |
| `DELETE` | `/:id/permanent` | Permanently delete map and its nodes. |

### 3. Node Endpoints (`/api/mindmaps`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/:id/nodes` | Get all nodes for a specific mindmap. |
| `POST` | `/nodes` | Create a new node. |
| `PATCH` | `/nodes/:id` | Update node properties (`x`, `y`, `color`, `fontSize`, `text`). |
| `PATCH` | `/nodes/:id/text` | Update node text specifically. |
| `DELETE` | `/nodes/:id` | Delete a node and all its descendants. |

### 4. Version Endpoints (`/api/mindmaps/:id/versions`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Get all versions for a mindmap. |
| `POST` | `/` | Create a new manual snapshot of the current state. |
| `POST` | `/:versionId/restore` | Restore nodes from a specific version. |
| `DELETE` | `/:versionId` | Delete a specific version snapshot. |

---

## 🔌 Socket.io Events

### Client to Server
- `join-map ({ mapId, user })`: Join a room for a specific mindmap with user profile.
- `leave-map (mapId)`: Leave a mindmap room.
- `node-added ({ mapId, node })`: Broadcast a new node addition.
- `node-updated ({ mapId, node })`: Broadcast node property changes.
- `node-deleted ({ mapId, nodeId })`: Broadcast node removal.
- `node-dragged ({ mapId, nodeId, position })`: High-frequency position updates.
- `node-editing ({ mapId, nodeId, user })`: Signal that a user is editing a specific node.
- `node-editing-stopped ({ mapId, nodeId })`: Signal that editing has finished.
- `map-versions-changed (mapId)`: Signal that versions have been updated.
- `map-restored ({ mapId, nodes, versionId })`: Signal that a map has been restored to a previous state.
- `cursor-moved ({ mapId, cursor })`: Broadcast user cursor position (`x`, `y`).

### Server to Client (Broadcast)
- `user-list`: Received upon joining, containing all active users in the room.
- `user-joined`: Received when a new user enters the room.
- `user-disconnected`: Received when a user leaves or disconnects.
- `node-added`: Received when another user adds a node.
- `node-updated`: Received when another user updates a node.
- `node-deleted`: Received when another user deletes a node.
- `node-dragged`: Received for smooth real-time dragging.
- `node-editing`: Shows which user is currently editing a node.
- `node-editing-stopped`: Clears the editing indicator.
- `map-versions-changed`: Notifies clients to refresh their version history.
- `map-restored`: Forces all clients to reload the map state.
- `cursor-moved`: Received for showing other users' presence and movement.

---

## ⚙️ Development Setup

1. **Prerequisites**:
   - Node.js (v18+)
   - MongoDB (Local instance or Atlas connection string)

2. **Installation**:
   ```bash
   npm install
   ```

3. **Environment (.env)**:
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/mindmap
   JWT_SECRET=your_super_secret_key_here
   ```

4. **Running**:
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

---

## 🏗️ Folder Structure
```text
src/
├── config/         # Database and app configurations
├── controllers/    # Request handlers (Business logic & tree operations)
├── middleware/     # Auth protection and other Express middlewares
├── models/         # Mongoose schemas (User, MindMap, Node, Version)
├── repositories/   # Data access layer (Direct DB interactions)
├── routes/         # Express API route definitions
├── services/       # Core business logic services (e.g., Auth logic)
├── socket/         # Socket.io event handlers and logic
└── server.js       # App entry point, middleware setup, and server start
```
