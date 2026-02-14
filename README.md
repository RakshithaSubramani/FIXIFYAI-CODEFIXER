# ⚡ Fixify AI - Enterprise-Grade Code Debugging Platform

**Fixify AI** is a powerful, GenAI-powered code debugging and optimization platform designed for developers. It analyzes code in multiple languages, detects logical and syntax errors, provides structured fixes, and generates optimized versions—all with a professional, developer-centric UI.

---

## 🚀 Key Features

*   **🤖 Multi-Language AI Analysis**: Supports JavaScript, Python, Java, C++, Go, and TypeScript.
*   **🔍 Hybrid Analysis Engine**: Combines static analysis (ESLint, syntax checks) with advanced LLM reasoning (Gemini Pro/Flash).
*   **📊 Structured Reports**: Returns strict JSON outputs with:
    *   **Quality Score** (A-F grading).
    *   **Confidence Metrics** (0-100% per issue).
    *   **Detailed Problems** with severity levels and line numbers.
*   **🛠️ Smart Fixes**: Provides step-by-step explanations for every correction.
*   **⚡ Code Optimization**: Generates a refactored, performance-optimized version of your code.
*   **📝 Monaco Editor Integration**: Professional VS Code-like editing experience.
*   **🆚 Real-time Diff View**: Side-by-side comparison of original vs. fixed code.
*   **🎨 Cyberpunk UI**: A modern, dark-themed interface with glassmorphism and neon accents.
*   **🛡️ Robust Error Handling**: Self-healing JSON parsing to handle erratic LLM outputs.

---

## 🛠️ Tech Stack

*   **Frontend**: React.js, Monaco Editor, React Diff Viewer, CSS Variables (Cyberpunk Theme).
*   **Backend**: Node.js, Express.js, MongoDB (optional), Zod (Validation), JSON5.
*   **AI Engine**: Google Gemini API (1.5 Flash / 1.5 Pro).

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
*   **Node.js** (v16 or higher)
*   **npm** (Node Package Manager)
*   **Google Gemini API Key** (Get it from [Google AI Studio](https://aistudio.google.com/))

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd FIXIFYAI-CODEFIXER
```

### 2. Backend Setup
Navigate to the backend folder and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
# backend/.env
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Database (Optional - system falls back to file storage if disabled)
MONGO_URI=mongodb+srv://...
DISABLE_DB=1  # Set to 0 to enable MongoDB
```

Start the backend server:
```bash
npm start
# Output: Backend running at http://localhost:5000
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend folder, and install dependencies:

```bash
cd frontend
npm install
```

Start the React development server:
```bash
npm start
# Output: Opens the app at http://localhost:3000
```

---

## 🎮 How to Use

1.  **Open the App**: Go to `http://localhost:3000` in your browser.
2.  **Select Language**: Choose the programming language or toggle "Auto-detect".
3.  **Paste Code**: Paste your buggy code into the Monaco Editor.
4.  **Select Mode**: Choose between "Fast" (Flash model) or "Accurate" (Pro model).
5.  **Click "Fix & Explain"**:
    *   The AI will analyze your code.
    *   You'll see a **Quality Score** and **Confidence Bar**.
    *   Review the **Detected Problems** and **Fix Explanations**.
    *   Compare the changes in the **Diff Viewer**.
    *   Check the **Optimized Code** tab for a refactored version.

---

## 🔧 Troubleshooting

*   **"Unparseable model output"**:
    *   This usually happens if the AI returns invalid JSON. The system has built-in self-repair, but if it persists, try reducing the code length or switching to the "Accurate" model.
*   **"Backend not connecting"**:
    *   Ensure the backend is running on port 5000. Check the console logs for any startup errors.
*   **"Gemini API Key missing"**:
    *   Make sure you created the `.env` file in the `backend/` folder and added your key.

---

## 📄 License

This project is licensed under the MIT License.
