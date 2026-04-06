# 🔐 AgentProxy — AI Agent API Key Manager

A lightweight self-hosted proxy server that sits between your AI subagents and their API keys. Built to solve a real problem: when you're running multiple AI agents on a VPS, you lose track of which agent used which key, and when. AgentProxy gives you full visibility and an authorization checkpoint for every API call your agents make.

---

## 🧩 What Problem Does This Solve?

When managing multiple AI subagents on a VPS, a few issues come up fast:

- **No audit trail** — you have no idea which subagent hit which API key and at what time
- **No access control** — agents run freely with no authorization layer above them
- **Scattered secrets** — API keys are spread across agent configs with no central management

AgentProxy centralizes all of this. Every request from an agent goes through the proxy, which verifies the agent's identity and capabilities, fetches the correct secret, forwards the request, and logs the entire interaction to Firestore.

---

## ⚙️ How It Works

```
AI Subagent  →  POST /api/proxy  →  Verify Agent + Capability  →  Fetch Secret from Firestore  →  Forward to Target API  →  Log to auditLogs  →  Return Response
```

1. An AI agent sends a POST request to `/api/proxy` with its `agentId`, `capabilityId`, `ownerId`, `targetUrl`, and `payload`
2. The server verifies the agent exists in Firestore and belongs to the correct owner
3. It checks the agent actually has the requested capability
4. It looks up the appropriate API key from the `secrets` collection in Firestore
5. It forwards the request to the target URL with the correct auth header format per API type
6. It writes a full audit log entry — agent, owner, API type, endpoint, status, timestamp
7. The response is returned to the calling agent

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Server & API | [Express.js](https://expressjs.com/) |
| Frontend (Dev) | [Vite](https://vitejs.dev/) (served via Express middleware) |
| Frontend (Prod) | Express static file serving from `/dist` |
| Database | [Firebase Firestore](https://firebase.google.com/docs/firestore) (via Firebase Admin SDK) |
| Auth & Secrets | Firebase Admin SDK with service account credentials |
| Runtime | Node.js (ESM) |
| Language | TypeScript |

Both frontend and backend run on a **single port (3000)** — no separate dev servers, no CORS issues, easy to deploy on a VPS behind a reverse proxy like Nginx.

---

## 🗂️ Firestore Collections

The following collections are expected in your Firestore database:

### `agents`
Stores registered AI agents.
```
{
  ownerId: string,        // ID of the owner
  capabilities: string[]  // List of capability IDs this agent is allowed to use
}
```

### `capabilities`
Defines what an API capability maps to.
```
{
  api: string   // e.g. "gemini", "chatgpt", "stripe", "custom"
}
```

### `secrets`
Stores API keys per owner.
```
{
  ownerId: string,  // Owner this key belongs to
  key: string,      // e.g. "GEMINI_KEY", "CHATGPT_KEY", "STRIPE_KEY"
  value: string     // The actual API key
}
```

### `auditLogs`
Auto-created by the proxy on every request.
```
{
  agentId: string,
  ownerId: string,
  api: string,
  endpoint: string,
  status: number,
  timestamp: string,
  payload: string
}
```

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js v18 or higher
- A Firebase project with Firestore enabled
- Firebase Admin SDK service account key

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/agentproxy.git
cd agentproxy
```

---

### Step 2 — Install Dependencies

```bash
npm install
```

---

### Step 3 — Set Up Firebase

#### 3a. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable **Firestore Database** from the Build menu

#### 3b. Generate a Service Account Key
1. In Firebase Console → Project Settings → **Service Accounts**
2. Click **Generate new private key**
3. Download the `.json` file
4. Place it in the **root of the project directory**

#### 3c. Create `firebase-applet-config.json`
Create this file in the **root of the project directory**:

```json
{
  "projectId": "your-firebase-project-id",
  "firestoreDatabaseId": "(default)"
}
```

> Set `firestoreDatabaseId` to `"(default)"` unless you have created a named Firestore database.

#### 3d. Update `server.ts` with your service account filename
In `server.ts`, update this import to match your downloaded service account filename:

```ts
import serviceAccount from './your-service-account-filename.json' assert { type: 'json' };
```

Also update the project ID constant if needed:
```ts
const configProjectId = "your-firebase-project-id";
```

---

### Step 4 — Run in Development

```bash
npm run dev
```

The server starts at `http://localhost:3000`. Vite middleware is injected for hot-reloading the frontend. The Express API is available at the same port under `/api/*`.

---

### Step 5 — Build & Run in Production

```bash
npm run build     # Builds frontend to /dist
npm start         # Runs the server in production mode
```

---

## 📡 API Reference

### `GET /api/health`
Returns server health status.
```json
{ "status": "ok", "timestamp": "..." }
```

---

### `GET /api/test`
Returns Firebase initialization status.
```json
{
  "message": "API is reachable",
  "dbInitialized": true,
  "projectId": "your-project-id",
  "databaseId": "your-db-id"
}
```

---

### `GET /api/audit-logs`
Returns the last 10 audit log entries ordered by most recent.
```json
{
  "success": true,
  "count": 10,
  "logs": [...]
}
```

---

### `POST /api/proxy`
The main proxy endpoint. Called by your AI agents.

**Request Body:**
```json
{
  "agentId": "agent-doc-id",
  "capabilityId": "capability-doc-id",
  "ownerId": "owner-id",
  "targetUrl": "https://api.openai.com/v1/chat/completions",
  "payload": { }
}
```

**Response:**
```json
{
  "success": true,
  "agentId": "...",
  "capabilityId": "...",
  "apiType": "chatgpt",
  "secretFound": true,
  "data": { },
  "timestamp": "..."
}
```

## 🖥️ Deploying on a VPS

1. SSH into your VPS and clone the repo
2. Follow the setup steps above
3. Build the project: `npm run build`
4. Use a process manager to keep it running:

```bash
npm install -g pm2
pm2 start npm --name "agentproxy" -- start
pm2 save
```


## 🤝 Contributing

This started as a personal tool. If you're running AI agent pipelines and hit the same walls, contributions are welcome. Open an issue, fork it, or submit a PR.

---

## 📄 License

MIT
