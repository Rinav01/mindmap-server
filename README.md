# MindMap Server

A high-performance Node.js/Express backend designed for hierarchical data management and real-time mind mapping. This server handles complex tree structures, recursive operations, and state-based versioning for mind map diagrams.

---

## 🚀 Core Capabilities

### 🌲 Hierarchical Node Management
- **Tree Persistence**: Stores nodes with `parentId` references, allowing for infinite nesting.
- **Recursive Integrity**: When a node is deleted, the server recursively identifies and removes all descendant nodes to prevent orphaned data in the database.
- **Spatial Data**: Stores `x` and `y` coordinates for canvas-based rendering.

### 🕒 Advanced Versioning System (Snapshots)
- **State Snapshots**: Captures the entire state of a mind map (all nodes) into a single version document.
- **Relational Restoration**: During version restoration, the server performs an "ID Mapping" operation. It regenerates ObjectIDs for all nodes while maintaining the correct `parentId` relationships, ensuring the restored tree is structurally identical to the original snapshot but uniquely indexed.
- **Action Tracking**: Categorizes versions by action (e.g., `manual`, `auto-layout`, `restore`) for better audit trails.

### 📂 Organization
- **Soft Deletion**: Mind maps are flagged with `deletedAt` rather than being immediately purged, allowing for future "Trash" or "Restore" features.
- **Starring System**: Simple boolean flagging for priority maps.

---

## 🛠️ Technical Stack

- **Backend**: Node.js with Express 5.x (using the latest features).
- **Database**: MongoDB with Mongoose 9.x.
- **Validation/Safety**: Whitelisted field updates in controllers to prevent property injection.

---

## 📦 Database Schemas

### MindMap
| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | String | The display name of the map. |
| `isStarred` | Boolean | Priority flag. |
| `deletedAt` | Date | Timestamp for soft-deletion. |

### Node
| Field | Type | Description |
| :--- | :--- | :--- |
| `mindMapId` | ObjectId | Reference to the parent MindMap. |
| `parentId` | ObjectId | Reference to the parent Node (null for root). |
| `text` | String | Label content of the node. |
| `x, y` | Number | Coordinates for visual placement. |
| `color` | String | Hex or CSS color code. |
| `fontSize` | Number | Size in pixels. |

---

## 🔌 API Reference

### 1. Mind Map Endpoints

#### `POST /api/mindmaps`
Creates a new map and initializes it with a "Central Idea" root node.
- **Body**: `{ "title": "My New Project" }`
- **Response**: `201 Created` with the Map object.

#### `PATCH /api/mindmaps/:id/title`
- **Body**: `{ "title": "Updated Title" }`

#### `DELETE /api/mindmaps/:id`
Performs a soft delete by setting the `deletedAt` timestamp.

---

### 2. Node Endpoints

#### `POST /api/mindmaps/nodes`
Creates a new node as a child of another node.
- **Body**: 
  ```json
  {
    "mindMapId": "map_id",
    "parentId": "parent_node_id",
    "x": 150,
    "y": 100
  }
  ```

#### `PATCH /api/mindmaps/nodes/:id`
Update visual or content properties.
- **Accepted Fields**: `x`, `y`, `text`, `color`, `fontSize`.
- **Note**: This endpoint uses a whitelist to ensure only valid properties are modified.

#### `DELETE /api/mindmaps/nodes/:id`
Deletes the target node and triggers a recursive cleanup of all descendants.

---

### 3. Version Control Endpoints

#### `POST /api/mindmaps/:id/versions`
Creates a snapshot of the current node state.
- **Body**: `{ "label": "Before major refactor", "actionType": "manual" }`

#### `POST /api/mindmaps/:id/versions/:versionId/restore`
Wipes current nodes and replaces them with the snapshot state.
- **Response**: `200 OK` with the array of restored nodes.

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
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🏗️ Architecture Note
The project follows a modular structure:
- `routes/`: Handles HTTP routing and parameter injection.
- `controllers/`: Contains the logic for tree traversal and DB interaction.
- `models/`: Defines the data structure and indexing.
- `config/db.js`: Manages the MongoDB connection lifecycle.
