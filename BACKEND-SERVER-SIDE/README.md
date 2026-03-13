# Smart Dental AI Backend (Server Side)

REST API backend for Smart Dental AI, built with Node.js, Express, and MongoDB.

## Current Project Structure

```text
BACKEND-SERVER-SIDE/
|-- middleware/
|   |-- asyncHandler.js
|   |-- auth.js
|   `-- errorHandler.js
|-- models/
|   |-- ChatSession.js
|   |-- Diagnosis.js
|   `-- User.js
|-- routes/
|   |-- auth.js
|   |-- chat.js
|   |-- diagnosis.js
|   `-- doc.js
|-- services/
|   |-- authService.js
|   |-- chatService.js
|   |-- diagnosisService.js
|   `-- docService.js
|-- uploads/
|   |-- diagnosis/
|   |   |-- input/
|   |   `-- output/
|   `-- profiles/
|-- utils/
|   `-- ServiceError.js
|-- .env.example
|-- package.json
|-- server.js
|-- setup.sh
`-- README.md
```

## Requirements

- Node.js 18+ (recommended)
- npm
- MongoDB (local or remote)
- External AI server reachable at AI_SERVER_URL

## Environment Variables

Create a .env file (or let setup.sh create it from .env.example) and configure:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/smart-dental-ai
JWT_SECRET=change_this_to_a_long_random_secret_in_production
JWT_EXPIRES_IN=7d
AI_SERVER_URL=http://localhost:8000
```

Notes:

- JWT_SECRET is required. The server exits on startup if it is missing.
- Optional FRONTEND_URL can be set as comma-separated values for CORS allowlist.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Prepare environment:

```bash
cp .env.example .env
```

3. Start the server:

```bash
npm run dev
```

4. Health check:

```http
GET /
```

Expected response:

```json
{
  "message": "Smart Dental AI Backend is running"
}
```

## setup.sh Usage

The setup.sh script helps you prepare and run the backend with checks for Node, npm, project files, and MongoDB.

### Run interactive menu

```bash
bash setup.sh
```

Menu options:

- Setup
- System Status
- Run Server
- Exit

### Run direct commands

```bash
# Full setup (install deps, create uploads, create .env from .env.example if missing)
bash setup.sh setup

# Show status checks
bash setup.sh status

# Start backend server (development mode)
bash setup.sh run

# Help
bash setup.sh --help
```

### Windows note

On Windows, run setup.sh using Git Bash or WSL.

## API Overview

Base URL:

- http://localhost:3000 (or your configured PORT)

### Auth routes

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/profile (auth required)
- PUT /api/auth/profile (auth required)
- PUT /api/auth/change-password (auth required)
- POST /api/auth/profile/image (auth required, multipart field: image)
- GET /api/auth/profile/image (auth required)

### Diagnosis routes

- POST /api/diagnosis (auth required, multipart field: image)
- POST /api/diagnosis/batch (auth required, multipart field: images, max 10)
- GET /api/diagnosis/history (auth required)
- GET /api/diagnosis/:id (auth required)

### Chat routes

- POST /api/chat (auth required)
- GET /api/chat/sessions (auth required)
- GET /api/chat/sessions/:session_id (auth required)

### Docs route

- GET /api/doc

## Postman Collection

A Postman collection is provided at:

- ../smart-dental-ai.json

It includes all main request types with ready-to-use examples, including:

- Auth requests
- Diagnosis (single and batch) requests
- Chat and sessions requests
- Documentation endpoint request

Import this file into Postman to test the API quickly.

## Notes

- Uploaded files are served from /uploads.
- Diagnosis input images are saved under uploads/diagnosis/input.
- Diagnosis output images are saved under uploads/diagnosis/output.
- Profile images are saved under uploads/profiles.
- You can also inspect endpoint metadata at GET /api/doc.
