# Smart Dental AI — Backend

A simple REST API backend for the Smart Dental AI graduation project.  
Built with **Node.js**, **Express.js**, and **MongoDB**.

---

## Project Structure

```
backend/
├── models/
│   ├── User.js          # User schema (name, email, hashed password, age, gender)
│   └── Diagnosis.js     # Diagnosis schema (image path, AI results, urgency, etc.)
├── routes/
│   ├── auth.js          # POST /api/auth/register  |  POST /api/auth/login
│   ├── diagnosis.js     # POST /api/diagnosis      |  POST /api/diagnosis/batch  |  GET /api/diagnosis/history
│   └── chat.js          # POST /api/chat
├── middleware/
│   └── auth.js          # JWT verification middleware
├── uploads/             # Uploaded images are saved here
├── server.js            # Entry point
├── .env                 # Environment variables
└── package.json
```

---

## Getting Started

### 0. Quick setup

If you are using Git Bash, WSL, or Linux/macOS, you can run:

```bash
bash setup.sh
```

This will:

- install npm dependencies
- create the `uploads/` folder if needed
- create `.env` from `.env.example` if `.env` does not exist

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Edit the `.env` file (already created) and set your values:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/smart-dental-ai
JWT_SECRET=change_this_to_a_long_random_secret_in_production
JWT_EXPIRES_IN=7d
AI_SERVER_URL=http://localhost:8000
```

### 3. Start MongoDB

Make sure MongoDB is running locally, or update `MONGO_URI` to point to your Atlas cluster.

### 4. Run the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The server will start on `http://localhost:5000`.

---

## API Endpoints

### Auth

| Method | Endpoint             | Description         | Auth required |
| ------ | -------------------- | ------------------- | ------------- |
| POST   | `/api/auth/register` | Register a new user | No            |
| POST   | `/api/auth/login`    | Login, returns JWT  | No            |

**Register body:**

```json
{
  "name": "Ahmed Ali",
  "email": "ahmed@example.com",
  "password": "secret123",
  "age": 25,
  "gender": "male"
}
```

**Login body:**

```json
{
  "email": "ahmed@example.com",
  "password": "secret123"
}
```

---

### Diagnosis

All diagnosis endpoints require the header:

```
Authorization: Bearer <token>
```

| Method | Endpoint                 | Description                          |
| ------ | ------------------------ | ------------------------------------ |
| POST   | `/api/diagnosis`         | Upload one image, get AI diagnosis   |
| POST   | `/api/diagnosis/batch`   | Upload up to 10 images               |
| GET    | `/api/diagnosis/history` | Get all past diagnoses for this user |

**Single diagnosis** — `multipart/form-data`:

- Field name: `image` (one file)

**Batch diagnosis** — `multipart/form-data`:

- Field name: `images` (up to 10 files)

---

### Chat

| Method | Endpoint    | Description           | Auth required |
| ------ | ----------- | --------------------- | ------------- |
| POST   | `/api/chat` | Ask the AI a question | Yes           |

**Chat body:**

```json
{
  "question": "What does urgency level high mean?",
  "context": "The patient has cavity detected in molar tooth."
}
```

---

## Notes

- Uploaded images are stored in the `uploads/` folder.
- The AI server URL is configured via `AI_SERVER_URL` in `.env`.
- The backend expects the external AI server to be running at that URL.
