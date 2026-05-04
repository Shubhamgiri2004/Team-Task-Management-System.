# Team Task Manager

Full-stack **Team Task Manager**: React (Vite) + Tailwind frontend, Express + TypeScript + MongoDB API, JWT auth, and role-based access (`ADMIN` / `MEMBER`). Admins own projects and tasks; members work on assignments.

## What’s implemented (spec checklist)

| Area | Requirement |
|------|----------------|
| **Backend** | Node, Express, TypeScript, Mongoose, JWT, `bcrypt` hashing |
| **Auth** | `POST /auth/signup`, `POST /auth/login`, protect routes with JWT middleware |
| **Models** | User (name, email, password, role), Project (name, description, createdBy, members), Task (title, description, status, assignedTo, projectId, dueDate) |
| **Projects API** | `POST /projects` (admin), `GET /projects` (member of / creator), `POST /projects/:id/add-member` (admin) |
| **Tasks API** | `POST /tasks` (admin), `GET /tasks` (members: assigned only; admins: optional `?userId=` filter), `PATCH /tasks/:id` (members: assigned tasks; admins: broader edits) |
| **RBAC** | Admin-only create project/task & add member; member task updates limited to assigned tasks |
| **Validation** | Required fields, email format, sensible HTTP status codes |
| **Frontend** | Vite React, Tailwind (primary **#1C4D8D**), separate **Admin** vs **Member** sign-in, Axios, JWT in `localStorage`, protected routes |
| **Pages** | Login, Signup, Dashboard (totals / completed / overdue), Project detail, Task management table |
| **Dev** | `npm run dev` in `backend` and `frontend`; env examples; Railway-oriented deploy notes |

**Extra (helps the SPA):** `GET /auth/me` syncs profile/role from the database; `GET /projects/:id` loads one project. **API authorization uses the user’s role from MongoDB**, not only the JWT payload.

### Separate Admin vs Member authentication

- **Web:** `/` picks portal → **`/admin/login`** or **`/member/login`**. Signup is **member-only** at `/signup`. Legacy **`/login`** redirects to member sign-in.
- **API login** (`POST /auth/login`): optional body field **`portal`**: `"admin"` | `"member"`. If set, credentials must belong to that role or the API returns **403** (wrong portal). Omit `portal` to allow any role (e.g. API clients).
- **API signup** (`POST /auth/signup`): optional **`adminSignupSecret`** — if it matches **`ADMIN_SIGNUP_SECRET`** in `backend/.env` (8+ characters), the new user is **ADMIN**; otherwise **MEMBER**. Sending **`portal: "admin"`** without a valid secret returns **403**.

### Role-based access (Admin vs Member)

| Capability | Admin | Member |
|------------|-------|--------|
| Create projects | Yes | No |
| Add members to a project (must be on that project) | Yes | No |
| Create / assign tasks | Yes | No |
| List projects | Projects they created or joined | Same |
| List tasks | Tasks in those projects (optional `?userId=` filter) | Only tasks **assigned to them** |
| Update a task | Status, title, description, due date, assignee (assignee must be on project) | **Status only**, and only on **their** tasks |

## Tech stack

| Layer | Choices |
|--------|---------|
| API | Node.js, Express, TypeScript |
| Data | MongoDB, Mongoose |
| Auth | JWT, `bcrypt` password hashing |
| Web | React 18 (Vite), React Router |
| Styling | Tailwind CSS (primary **#1C4D8D**, white background, gray text) |
| HTTP | Axios (`src/services/api.js`) |

On Windows you may need [build tools](https://github.com/nodejs/node-gyp) for `bcrypt`; Linux/Railway images usually work out of the box.

## Project structure

```
Assesment/
├── README.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       │   └── database.ts
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── utils/
└── frontend/
    ├── .env.example
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── components/
        ├── pages/
        ├── services/
        ├── hooks/
        ├── context/
        ├── config/
        └── utils/
```

## Prerequisites

- **Node.js 18+**
- **MongoDB** (local or [Atlas](https://www.mongodb.com/cloud/atlas))

## Local setup

### Backend

```bash
cd backend
cp .env.example .env    # Windows: copy .env.example .env
```

Set `MONGODB_URI` and `JWT_SECRET` in `.env`, then:

```bash
npm install
npm run dev
```

Default API URL: **http://localhost:5000** (override with `PORT`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: **http://localhost:5173**. With `VITE_API_URL` unset, Vite proxies `/auth`, `/projects`, `/tasks`, `/health` to port 5000.

### First admin

Signups are **`MEMBER`**. Promote one user in MongoDB (`mongosh` or Atlas):

```js
db.users.updateOne(
  { email: "you@example.com" },
  { $set: { role: "ADMIN" } }
);
```

The UI refreshes role from **`GET /auth/me`**; protected API actions already use the **database** role.

### Production builds

```bash
cd backend && npm run build && npm start
cd frontend && npm run build
```

Static assets: `frontend/dist`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Listen port (default `5000`) |
| `MONGODB_URI` | Mongo connection string |
| `JWT_SECRET` | Secret for signing tokens |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `FRONTEND_URL` | CORS origin for your deployed SPA |

### Frontend (`frontend/.env` — production build)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Public API base URL, no trailing slash (e.g. `https://your-api.up.railway.app`) |

## Deployment (Railway)

### Backend

1. New project → add Mongo (plugin) or use Atlas; set `MONGODB_URI`.
2. Deploy repo with **Root Directory** `backend` (or monorepo equivalent).
3. **Install:** `npm install` · **Build:** `npm run build` · **Start:** `npm start`
4. Set `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL` (and `PORT` if not injected).

### Frontend

1. Service from `frontend`; **Build:** `npm install && npm run build`.
2. Set `VITE_API_URL` **before** build to your API URL.
3. Serve `frontend/dist` (Railway static or any static host).

### CORS

`FRONTEND_URL` on the API must match the browser origin of the SPA.

## API summary

| Method | Path | Access / notes |
|--------|------|----------------|
| POST | `/auth/signup` | `{ token, user }` — optional `adminSignupSecret` if it matches `ADMIN_SIGNUP_SECRET` → **ADMIN** |
| POST | `/auth/login` | `{ token, user }` — optional `portal: "admin"` \| `"member"` enforces role match |
| GET | `/auth/me` | Optional — current user from DB (Bearer token) |
| GET | `/projects` | Logged-in users (projects they belong to) |
| GET | `/projects/:id` | Optional — one project if allowed |
| POST | `/projects` | **Admin** |
| POST | `/projects/:id/add-member` | **Admin**, body `{ "email": "..." }` |
| GET | `/tasks` | Member: assigned tasks; Admin: optional `?userId=`, `?projectId=` |
| POST | `/tasks` | **Admin** |
| PATCH | `/tasks/:id` | Member: status on **assigned** tasks; Admin: status + assignee + fields |

Send `Authorization: Bearer <jwt>` on protected routes.

---

Architecture: thin routes → controllers → models; shared `authenticate` / `requireAdmin` middleware; one Axios instance and auth context on the client.
