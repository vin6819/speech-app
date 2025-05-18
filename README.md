# 🗣️ Automated Speech Therapy Assistant

A full-stack AI-powered web application to assist users with speech and pronunciation. It provides real-time, interactive feedback by comparing user-spoken audio with reference pronunciations using **Google Text-to-Speech (TTS)**, **Speech-to-Text (STT)**, and **Dynamic Time Warping (DTW)** algorithms.

---

## 🔍 Features

- 🎤 **Audio Recording**: Record speech directly from the browser.
- 🗣️ **Google TTS**: Generate accurate reference pronunciations.
- ✍️ **Google STT**: Transcribe spoken words into text using Google’s Speech-to-Text API.
- 📊 **Pronunciation Comparison**: Compare user and reference audio using DTW for word-level analysis.
- 👩‍⚕️ **Therapist Dashboard**: View user history and monitor progress over time.

---

## 📁 Project Structure

```
.
├── client/      # Frontend (Next.js)
├── server/      # Backend (Flask)
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/vin6819/speech-app.git
cd speech-app
```

---

## 🧠 Prerequisites

Ensure the following are installed:

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **FFmpeg** (required for audio file processing)
- **Google Cloud Account** with access to:
  - Google Cloud Text-to-Speech API
  - Google Cloud Speech-to-Text API

> ⚠️ Download your Google Cloud **credentials JSON file** and save it as "google_credentials.json" in server folder.

---

## 🔧 Setup Instructions

### ▶️ Frontend (Next.js)

```bash
cd client
npm install
npm run dev
```

> The frontend will start at: [http://localhost:3000](http://localhost:3000)

---

### ⚙️ Backend (Flask)

```bash
cd server
pip install -r requirements.txt
flask --app app run --port 5001
```

> The backend will run at: [http://localhost:5001](http://localhost:5001)

---

## 📞 Contact

For issues or feature requests, feel free to open an [issue](https://github.com/vin6819/speech-app/issues).
