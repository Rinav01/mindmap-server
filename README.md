# MindMap Server 🧠

A high-performance Node.js/Express backend designed for hierarchical data management and real-time mind mapping. This server handles complex tree structures, recursive operations, state-based versioning, and real-time collaboration using Socket.io.

---

## 🚀 Core Capabilities

### 🌲 Hierarchical Node Management
- **Tree Persistence**: Stores nodes with `parentId` references, allowing for infinite nesting.
- **Recursive Integrity**: When a node is deleted, the server recursively identifies and removes all descendant nodes to prevent orphaned data.
- **Spatial Data**: Stores `x` and `y` coordinates for canvas-based rendering.

### 🕒 Advanced Versioning System (Snapshots)
- **State Snapshots**: Captures the entire state of a mind map (all nodes) into a single version document.
- **Relational Restoration**: During restoration, the server performs an "ID Mapping" operation. It regenerates ObjectIDs for all nodes while maintaining the correct `parentId` relationships, ensuring the restored tree is structurally identical but uniquely indexed.
- **Action Tracking**: Categorizes versions by action (e.g., `manual`, `auto-layout`, `restore`).

### 📂 Organization & Trash
- **Soft Deletion**: Mind maps are flagged with `deletedAt` for a "Trash" system.
- **Starring System**: Priority flagging for easy access to important maps.
- **Restoration**: Easily restore maps from the trash or nodes from previous versions.

### ⚡ Real-Time Collaboration
- **Socket.io Integration**: Live updates across multiple clients.
- **Presence Tracking**: Real-time cursor positions and node selection.
- **Instant Synchronization**: Node additions, updates, deletions, and dragging are broadcasted instantly to all connected peers.

---

## 🛠️ Technical Stack

- **Backend**: Node.js with Express 5.x.
- **Real-Time**: Socket.io 4.x.
- **Database**: MongoDB with Mongoose 9.x.
- **Environment**: Dotenv for configuration.

---

## 📦 Database Schemas

### MindMap
| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | String | The display name of the map. |
| `isStarred` | Boolean | Priority flag. |
| `deletedAt` | Date | Timestamp for soft-deletion (null if active). |

### Node
| Field | Type | Description |
| :--- | :--- | :--- |
| `mindMapId` | ObjectId | Reference to the parent MindMap. |
| `parentId` | ObjectId | Reference to the parent Node (null for root). |
| `text` | String | Label content of the node. |
| `x, y` | Number | Coordinates for visual placement. |
| `color` | String | Hex or CSS color code. |
| `fontSize` | Number | Size in pixels. |

### Version
| Field | Type | Description |
| :--- | :--- | :--- |
| `mindMapId` | ObjectId | Reference to the MindMap. |
| `snapshot` | Array | Full array of Node objects at that point in time. |
| `label` | String | Custom name for the version. |
| `actionType` | Enum | `manual`, `auto-layout`, `align`, `delete`, `restore`. |

---

## 🔌 API Reference

### 1. Mind Map Endpoints (`/api/mindmaps`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Get all active (non-deleted) mindmaps. |
| `POST` | `/` | Create a new map with a root node. |
| `GET` | `/trash` | Get all soft-deleted mindmaps. |
| `GET` | `/:id` | Get a specific mindmap by ID. |
| `PATCH` | `/:id/star` | Toggle the `isStarred` status. |
| `PATCH` | `/:id/title` | Update the mindmap title. |
| `PATCH` | `/:id/restore` | Restore a mindmap from the trash. |
| `DELETE` | `/:id` | Soft-delete a mindmap (move to trash). |
| `DELETE` | `/:id/permanent` | Permanently delete a mindmap and its nodes. |

### 2. Node Endpoints (`/api/mindmaps/nodes`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/:id/nodes` | Get all nodes for a specific mindmap. |
| `POST` | `/nodes` | Create a new node. |
| `PATCH` | `/nodes/:id` | Update node properties (`x`, `y`, `color`, `fontSize`). |
| `PATCH` | `/nodes/:id/text` | Update node text specifically. |
| `DELETE` | `/nodes/:id` | Delete a node and all its descendants. |

### 3. Version Endpoints (`/api/mindmaps/:id/versions`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Get all versions for a mindmap. |
| `POST` | `/` | Create a new manual snapshot. |
| `POST` | `/:versionId/restore` | Restore nodes from a specific version. |
| `DELETE` | `/:versionId` | Delete a specific version. |

---

## 🔌 Socket.io Events

### Client to Server
- `join-map (mapId)`: Join a room for a specific mindmap.
- `leave-map (mapId)`: Leave a mindmap room.
- `node-added ({ mapId, node })`: Broadcast a new node.
- `node-updated ({ mapId, node })`: Broadcast node property changes.
- `node-deleted ({ mapId, nodeId })`: Broadcast node removal.
- `node-dragged ({ mapId, nodeId, position })`: High-frequency position updates.
- `cursor-moved ({ mapId, cursor })`: Broadcast user cursor position.

### Server to Client (Broadcast)
- `node-added`: Received when another user adds a node.
- `node-updated`: Received when another user updates a node.
- `node-deleted`: Received when another user deletes a node.
- `node-dragged`: Received for smooth real-time dragging.
- `cursor-moved`: Received for showing other users' presence.

---

## ⚙️ Development Setup

1. **Prerequisites**:
   - Node.js (v18+)
   - MongoDB (Local or Atlas)

2. **Installation**:
   ```bash
   npm install
   ```

3. **Environment (.env)**:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/mindmap
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
├── config/         # Database connection
├── controllers/    # Business logic & tree operations
├── models/         # Mongoose schemas
├── routes/         # Express API routes
├── socket/         # Socket.io event handlers
└── server.js       # App entry point & server setup
```
