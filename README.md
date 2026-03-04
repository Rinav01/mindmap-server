# MindMap Server 🧠

A high-performance Node.js/Express backend designed for real-time collaborative mind mapping. This server handles complex tree structures, recursive operations, state-based versioning, user authentication, and multi-user synchronization using Socket.io.

## 🚀 Features

### 🌲 Hierarchical Node Management
- **Infinite Nesting**: Stores nodes with `parentId` references, allowing for deep hierarchy.
- **Recursive Integrity**: Automatically handles cascading deletions to prevent orphaned nodes.
- **Spatial Positioning**: Manages `x` and `y` coordinates for canvas-based rendering.
- **Rich Properties**: Supports custom colors, font sizes, and text content for each node.

### 👥 Real-Time Collaboration
- **Live Synchronization**: Instant updates for node creation, modification, movement, and deletion across all connected clients.
- **Presence Awareness**: See who is online, their cursor positions, and what they are selecting or editing in real-time.
- **Multi-User Editing**: Locks nodes while they are being edited to prevent conflicts.

### 🕒 Version Control & Snapshots
- **State Snapshots**: Capture the complete state of a mind map at any point in time.
- **One-Click Restore**: Revert a mind map to any previous version instantly.
- **Activity Logging**: Tracks changes and restorations for audit purposes.

### 📂 Organization & Security
- **Soft Deletion & Trash**: Recover accidentally deleted maps from the trash bin.
- **Starring**: Mark important maps for quick access.
- **Sharing**: Invite collaborators via email to work on maps together.
- **Secure Auth**: JWT-based authentication with password hashing.

---

## 🛠️ Technical Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/) (v5.x)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) (v9.x)
- **Real-Time Engine**: [Socket.io](https://socket.io/) (v4.x)
- **Authentication**: JSON Web Tokens (JWT) & BcryptJS
- **Architecture**: Controller-Service-Repository (CSR) pattern

---

## ⚙️ Prerequisites

Before running the server, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (Local instance or Atlas connection string)

---

## 📥 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd mindmap-server
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory and add the following variables:
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/mindmap
    JWT_SECRET=your_super_secure_jwt_secret_key
    ```

4.  **Start the Server**
    ```bash
    # Development mode (with hot-reload via nodemon)
    npm run dev

    # Production mode
    npm start
    ```

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user account | ❌ |
| `POST` | `/api/auth/login` | Login and receive a JWT token | ❌ |
| `GET` | `/api/auth/me` | Get current user profile details | ✅ |

### Mind Maps
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mindmaps` | Get all maps (owned & shared) |
| `POST` | `/api/mindmaps` | Create a new mind map |
| `GET` | `/api/mindmaps/trash` | Get all soft-deleted maps |
| `GET` | `/api/mindmaps/:id` | Get specific map details |
| `DELETE` | `/api/mindmaps/:id` | Soft-delete a map (move to trash) |
| `DELETE` | `/api/mindmaps/:id/permanent` | Permanently delete a map |
| `PATCH` | `/api/mindmaps/:id/star` | Toggle "starred" status |
| `PATCH` | `/api/mindmaps/:id/title` | Update map title |
| `PATCH` | `/api/mindmaps/:id/restore` | Restore map from trash |
| `POST` | `/api/mindmaps/:id/share` | Share map with another user by email |
| `GET` | `/api/mindmaps/:id/activity` | Get activity logs for a map |

### Nodes
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mindmaps/:id/nodes` | Get all nodes for a map |
| `POST` | `/api/mindmaps/nodes` | Create a new node |
| `PATCH` | `/api/mindmaps/nodes/:id` | Update node properties (x, y, color, size) |
| `PATCH` | `/api/mindmaps/nodes/:id/text` | Update node text content |
| `DELETE` | `/api/mindmaps/nodes/:id` | Delete a node (and its children) |

### Versioning
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mindmaps/:id/versions` | Get version history |
| `POST` | `/api/mindmaps/:id/versions` | Create a new snapshot/version |
| `POST` | `/api/mindmaps/:id/versions/:vid/restore` | Restore map to this version |
| `DELETE` | `/api/mindmaps/:id/versions/:vid` | Delete a specific version |

---

## 📡 WebSocket Events (Socket.io)

The server listens for and emits the following events for real-time interaction.

### Connection & Room Management
- `join-map`: Client joins a specific map room. Requires `{ mapId, user }`.
- `leave-map`: Client leaves a map room. Requires `mapId`.

### Node Operations (Broadcasts)
- `node-added`: A new node was created.
- `node-updated`: A node's properties were changed.
- `node-deleted`: A node was removed.
- `node-dragged`: High-frequency updates for node position during drag.

### Collaboration & Presence
- `cursor-moved`: Updates the position of a user's cursor.
- `selection-update`: Notifies which nodes a user has selected.
- `node-editing`: Signals that a user has started editing a node (locks it).
- `node-editing-stopped`: Signals that editing has finished (unlocks it).

### System Events
- `user-list`: Sent to a user upon joining, listing all active users.
- `user-joined`: Broadcast when a new user enters the room.
- `user-disconnected`: Broadcast when a user leaves.
- `map-versions-changed`: Notification to refresh version history.
- `map-restored`: Notification that the map was reverted to a previous state.

---

## 📂 Project Structure

```text
src/
├── config/             # Database connection and environment config
├── controllers/        # Request handlers (Business logic)
├── middleware/         # Express middleware (Auth, Validation)
├── models/             # Mongoose schemas (User, MindMap, Node, Version)
├── repositories/       # Data Access Layer (DB interactions)
├── routes/             # API route definitions
├── services/           # Complex business logic and reusable services
├── socket/             # Socket.io event handlers and logic
└── server.js           # Application entry point
```

## 🤝 Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

**License**: MIT
