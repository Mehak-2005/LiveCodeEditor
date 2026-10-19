# Live Code Editor — React Frontend

A production-grade, VS Code-inspired live code editor built with React, Vite, Monaco Editor, Tailwind CSS, and AWS Cognito authentication, fully integrated with the pre-deployed AWS Serverless Backend.

---

## 🚀 Key Features

1. **AWS Cognito Authentication**
   - Direct integration with AWS Cognito User Pool (`ap-south-1_IdYDzF7Eo`) and App Client (`2p1fmfr1nic8mu9nubkb7o9jmn`).
   - Sign up with live password policy validation.
   - Email verification code confirmation flow.
   - Sign in with `USER_PASSWORD_AUTH` flow yielding standard JWT ID Tokens.
   - Persistent session with automatic token refresh.

2. **Preloaded Problem Workspace**
   - Automatically loads question `two-sum` from the existing `GET /question` API.
   - Dynamic problem title, difficulty badge ("Easy"), problem description, function signature, and test cases count.
   - Loads starter code directly from AWS backend (no hardcoded starter code).

3. **Monaco Code Editor**
   - Full VS Code dark theme (`vs-dark`).
   - Line numbers, code folding, bracket pair colorization, minimap, auto-indentation.
   - Multi-language syntax highlighting for Python and Java.
   - Keyboard shortcuts:
     - `Ctrl + Enter` (or `Cmd + Enter`) — Run code
     - `Ctrl + S` (or `Cmd + S`) — Save code

4. **Multi-Language Support (Python & Java)**
   - Language selector dropdown seamlessly switches between Python 3 and Java 21.
   - Dynamically loads language-specific starter code from `GET /question?questionId=two-sum&language=<language>`.

5. **Code Execution & Test Cases (`POST /run`)**
   - Executes code in AWS Lambda with Cognito `Authorization: Bearer <ID_TOKEN>`.
   - Real-time loading states and prevention of duplicate concurrent submissions.
   - Comprehensive test results view:
     - Total, passed, and failed test metrics.
     - Visual progress bar.
     - Detailed test case cards showing Expected vs Actual outputs.
     - Raw console and execution error stack traces for compile/runtime issues.

6. **Cloud Code Persistence (`POST /save` & `GET /saved-code`)**
   - Saves code directly to DynamoDB for the authenticated Cognito user.
   - **Complies strictly with security requirements**: Does NOT send `userId` in the payload (backend extracts user `sub` directly from Cognito authorizer claims).
   - "Saved Code" drawer fetches user's historical submissions and allows loading any previous code snippet directly back into the Monaco Editor.

7. **Responsive & Modern Developer UI**
   - Desktop 3-panel layout: Problem (Left), Editor (Center), Test Results (Right).
   - Responsive tab navigation on tablet and mobile viewports (`[Problem]`, `[Editor]`, `[Output & Tests]`).
   - Bottom status bar displaying language environment, active user session, and execution status.

---

## 🛠 Project Structure

```
LiveCodeEditor/
├── src/
│   ├── components/
│   │   ├── Header.jsx           # Application toolbar & navigation
│   │   ├── QuestionPanel.jsx    # Problem description & function signature
│   │   ├── CodeEditor.jsx       # Monaco Editor integration & shortcuts
│   │   ├── LanguageSelector.jsx # Python/Java selector
│   │   ├── RunButton.jsx        # Execution trigger with spinner
│   │   ├── SaveButton.jsx       # Save trigger with cloud status
│   │   ├── OutputPanel.jsx      # Test cases and console tabs
│   │   ├── TestResults.jsx      # Summary metrics and progress bar
│   │   ├── TestCaseCard.jsx     # Individual test card (Expected vs Actual)
│   │   ├── SavedCodePanel.jsx   # Slide-over drawer for DynamoDB saved code
│   │   ├── LoadingSpinner.jsx   # SVG spinner
│   │   └── Toast.jsx            # Floating notification toasts
│   ├── pages/
│   │   ├── Login.jsx            # Authentication page
│   │   ├── Signup.jsx           # Registration & email verification code
│   │   └── Editor.jsx           # Main IDE workspace
│   ├── services/
│   │   ├── api.js               # Centralized AWS API Gateway client
│   │   └── auth.js              # Cognito IDP authentication client
│   ├── hooks/
│   │   └── useAuth.jsx          # Authentication context & state hook
│   ├── utils/
│   │   └── helpers.js           # Date formatting, JWT & test result normalizers
│   ├── App.jsx                  # Root component & view router
│   ├── main.jsx                 # DOM entry point
│   └── index.css                # Custom VS Code styling & scrollbars
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── .env
```

---

## ⚙️ Environment Variables

The application uses `.env` in the root:

```env
VITE_API_BASE_URL=https://ehy8q4vw9b.execute-api.ap-south-1.amazonaws.com/Prod
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=ap-south-1_IdYDzF7Eo
VITE_COGNITO_CLIENT_ID=2p1fmfr1nic8mu9nubkb7o9jmn
```

---

## 🏃 Running the Application

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

3. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🔐 Verified Test Account

You can sign up with your own email, or use the pre-verified test credentials:
- **Email**: `test_dev_agent@example.com`
- **Password**: `Password123!`

---

## 🛡️ Backend Integrity Confirmation

- **Zero modifications** were made to the backend AWS Lambda functions, DynamoDB tables, or `template.yaml`.
- All interactions strictly use the deployed AWS endpoints.
