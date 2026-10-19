# Live Code Editor

A cloud-native live coding platform featuring a VS Code-inspired interface built with React, Monaco Editor, and Tailwind CSS, fully integrated with an existing AWS serverless backend (API Gateway, AWS Lambda, DynamoDB, and Cognito).

---

## 📁 Repository Structure

```
LiveCodeEditor/
├── backend/            # Pre-deployed AWS Serverless SAM application (Untouched)
│   └── code-editor-api/
│
└── frontend/           # React + Vite + Monaco Editor Web Application
    ├── src/
    │   ├── components/ # Header, QuestionPanel, CodeEditor, OutputPanel, etc.
    │   ├── pages/      # Login, Signup, Editor
    │   ├── services/   # AWS API Gateway & Cognito client services
    │   ├── hooks/      # useAuth context hook
    │   └── utils/      # Helpers & token utilities
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── .env
```

---

## 🚀 How to Run the Frontend

### Step 1: Open a terminal and navigate to `frontend`
```bash
cd frontend
```

### Step 2: Install dependencies (if running for the first time)
```bash
npm install
```

### Step 3: Start the local development server
```bash
npm run dev
```

### Step 4: Open in your browser
Navigate to:
```
http://localhost:5173
```

---

## 🔐 Verified Login Credentials

You can sign up with your own email, or use the pre-verified test credentials:
- **Email**: `test_dev_agent@example.com`
- **Password**: `Password123!`

---

## ⚙️ Environment Configuration

The frontend configuration resides in `frontend/.env`:

```env
VITE_API_BASE_URL=https://ehy8q4vw9b.execute-api.ap-south-1.amazonaws.com/Prod
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=ap-south-1_IdYDzF7Eo
VITE_COGNITO_CLIENT_ID=2p1fmfr1ic8mu9nubkb7o9jmn
```
