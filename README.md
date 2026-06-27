<div align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/React-Dark.svg" alt="React" width="60" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NodeJS-Dark.svg" alt="Node" width="60" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/ExpressJS-Dark.svg" alt="Express" width="60" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/MongoDB.svg" alt="MongoDB" width="60" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TailwindCSS-Dark.svg" alt="Tailwind" width="60" />
  <br />
  <img src="./frontend/public/logo.png" alt="InternVue Logo" width="120" />
  <h1 align="center">InternVue</h1>

  <p align="center">
    <strong>A Premium Next-Generation Internship Portal Built with the MERN Stack.</strong>
    <br />
    Leveraging the power of Groq LLM, Murf TTS, Firebase, and real-time job aggregation to help students land their dream careers.
  </p>

  <p align="center">
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#environment-variables">Environment Setup</a>
  </p>
</div>

<br />

## 📸 Platform Preview

<div align="center">
  <img src="https://i.postimg.cc/wxS3vrQj/Screenshot-2026-02-28-012048.png" alt="InternVue Student Dashboard Screenshot" width="100%" />
</div>

<br />

## ✨ Features

- 🎨 **Premium UI/UX:** Built with Tailwind CSS, Framer Motion, and Glassmorphism design principles. Includes full Dark/Light mode support with persistence.
- 🔐 **Robust Authentication:** Secure JWT-based email/password registration alongside Social OAuth (Google, GitHub) handled via Firebase and synced to MongoDB.
- ⚡ **Automated Job Ingestion:** Uses Apify and background workers to aggregate internships and job postings from multiple public sources, normalize listings, and store them in MongoDB for efficient querying.
- 🧠 **Dynamic AI Matching Engine:** Uses a Groq-based prompt pipeline to enrich job postings (skill extraction, company signals) and a MongoDB aggregation pipeline to score and rank jobs against user profiles.
- 🎙️ **Interview-Ready Voice Mentor:** Uses Murf TTS for high-quality audio generation of mock interview questions and mentor replies.
- ✨ **AI Cover Letter & Outreach:** Generates personalized outreach emails and cover letters tailored to a student's profile and job description using Groq LLM.
- 📊 **Kanban Pipeline Tracker:** A beautifully interactive, drag-and-drop Kanban board enabling students to track application statuses (`Saved`, `Applied`, `Interviewing`, `Accepted`).
- 📍 **Location-Aware Filtering:** Browser Geolocation API integration automatically detects city/state for hyper-local internship results.

## 🛠 Tech Stack

### Frontend
- **Framework:** React 18 & Vite
- **Styling:** Tailwind CSS (with native Dark Mode) & Framer Motion
- **Routing:** React Router v6
- **Context:** React Context API for Global Auth & Theme State

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ORM with advanced Aggregation Pipelines)
- **AI Integration:** Groq LLM (server-side prompt orchestration)
- **Voice Integration:** Murf TTS (server-side synthesis for mock interviews)
- **Authentication:** Firebase Admin SDK (JWT Validation)

## 🚀 Quick Start

Follow these steps to set up the project locally on your machine.

### Prerequisites

Ensure you have the following installed:
- Node.js (v18+)
- MongoDB (Local instance or MongoDB Atlas cluster URI)
- Firebase Project Setup (for Web client and Service Account keys)

### 1. Clone & Install Dependencies

Open your terminal and clone the repository, then navigate to both directories to install dependencies.

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Run the Development Servers

You will need two terminal windows to run both ends concurrently.

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## 🔒 Environment Variables

To fully run this project, you will need to set up `.env` files in both the `frontend` and `backend` directories.

### Backend (`/backend/.env`)
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
# Firebase service account (JSON or individual env vars)
FIREBASE_CREDENTIALS_JSON='{"type":"service_account", ... }'
GROQ_API_KEY=your_groq_api_key
MURF_API_KEY=your_murf_api_key
APIFY_TOKEN=your_apify_actor_token
```

### Frontend (`/frontend/.env`)
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_API_BASE_URL=http://localhost:5000
```

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is open-source and available under the MIT License.
