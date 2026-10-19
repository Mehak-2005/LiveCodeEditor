import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import Header from '../components/Header';
import QuestionPanel from '../components/QuestionPanel';
import CodeEditor from '../components/CodeEditor';
import OutputPanel from '../components/OutputPanel';
import SavedCodePanel from '../components/SavedCodePanel';
import Toast from '../components/Toast';

import { useAuth } from '../hooks/useAuth';

import {
  getQuestion,
  runCode,
  saveCode,
} from '../services/api';

import { normalizeTestResults } from '../utils/helpers';

import {
  BookOpen,
  Code,
  TerminalSquare,
} from 'lucide-react';


export default function Editor() {

  const { questionId: routeQuestionId } = useParams();

  const navigate = useNavigate();

  const currentQuestionId = routeQuestionId || 'two-sum';


  const {
    user,
    getIdToken,
    signOut,
  } = useAuth();


  // ============================================================
  // Core Workspace State
  // ============================================================

  const [selectedLanguage, setSelectedLanguage] = useState('python');

  const [question, setQuestion] = useState(null);

  const [editorCode, setEditorCode] = useState('');

  const starterCodeMap = useRef({});


  // ============================================================
  // Loading & Async Status
  // ============================================================

  const [loadingQuestion, setLoadingQuestion] = useState(true);

  const [questionError, setQuestionError] = useState(null);

  const [isRunning, setIsRunning] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  const [statusMessage, setStatusMessage] = useState('Ready');


  // ============================================================
  // Execution Results
  // ============================================================

  const [resultsData, setResultsData] = useState(null);

  const [executionError, setExecutionError] = useState(null);


  // ============================================================
  // Modals & Panels
  // ============================================================

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [activeMobileTab, setActiveMobileTab] = useState('editor');


  // ============================================================
  // Toast
  // ============================================================

  const [toast, setToast] = useState(null);


  const showToast = (message, type = 'info') => {
    setToast({
      message,
      type,
    });
  };


  // ============================================================
  // 1. LOAD QUESTION
  // ============================================================

  const loadQuestionData = useCallback(async (qId, lang) => {

    setLoadingQuestion(true);

    setQuestionError(null);

    try {

      const data = await getQuestion(qId, lang);

      setQuestion(data);


      // --------------------------------------------------------
      // Cache starter code for this question + language
      // --------------------------------------------------------

      const cacheKey = `${qId}_${lang}`;

      if (data.starterCode) {

        starterCodeMap.current[cacheKey] = data.starterCode;

        setEditorCode(data.starterCode);

        setIsSaved(false);
      }


      setStatusMessage('Question loaded');

    } catch (err) {

      console.error('Failed to load question:', err);

      setQuestionError(
        err.message ||
        `Problem '${qId}' was not found or could not be loaded.`
      );

      showToast(
        `Failed to load problem '${qId}'.`,
        'error'
      );

    } finally {

      setLoadingQuestion(false);

    }

  }, []);


  // ============================================================
  // LOAD QUESTION WHEN ROUTE CHANGES
  // ============================================================

  useEffect(() => {

    setResultsData(null);

    setExecutionError(null);

    setIsSaved(false);

    loadQuestionData(
      currentQuestionId,
      selectedLanguage
    );

  }, [
    currentQuestionId,
    loadQuestionData,
    selectedLanguage,
  ]);


  // ============================================================
  // 2. LANGUAGE CHANGE
  // ============================================================

  const handleLanguageChange = async (newLang) => {

    if (newLang === selectedLanguage) {
      return;
    }


    setSelectedLanguage(newLang);

    setStatusMessage(`Switched to ${newLang}`);

    setResultsData(null);

    setExecutionError(null);

    setIsSaved(false);


    const cacheKey = `${currentQuestionId}_${newLang}`;


    // ----------------------------------------------------------
    // Use cached starter code if available
    // ----------------------------------------------------------

    if (starterCodeMap.current[cacheKey]) {

      setEditorCode(
        starterCodeMap.current[cacheKey]
      );

    } else {

      // --------------------------------------------------------
      // Otherwise fetch from backend
      // --------------------------------------------------------

      await loadQuestionData(
        currentQuestionId,
        newLang
      );

    }

  };


  // ============================================================
  // 3. RUN CODE
  // ============================================================

  const handleRun = async () => {

    if (isRunning) {
      return;
    }


    if (loadingQuestion) {

      showToast(
        'Please wait until the question is loaded.',
        'warning'
      );

      return;
    }


    if (!editorCode.trim()) {

      showToast(
        'Cannot run empty code.',
        'warning'
      );

      return;
    }


    setIsRunning(true);

    setStatusMessage(
      'Running code in AWS Lambda...'
    );

    setExecutionError(null);

    setActiveMobileTab('output');


    try {

      const token = await getIdToken();


      if (!token) {

        throw new Error(
          'Your session has expired. Please log in again.'
        );

      }


      const response = await runCode(
        currentQuestionId,
        selectedLanguage,
        editorCode,
        token
      );


      const normalized =
        normalizeTestResults(response);


      setResultsData(normalized);


      if (normalized.error) {

        setExecutionError(
          normalized.error
        );

        setStatusMessage(
          'Execution finished with errors'
        );

        showToast(
          'Code execution completed with errors.',
          'warning'
        );

      } else if (
        normalized.failedTestCases === 0 &&
        normalized.passedTestCases > 0
      ) {

        setStatusMessage(
          'All test cases passed!'
        );

        showToast(
          `✓ All ${normalized.passedTestCases} test cases passed!`,
          'success'
        );

      } else {

        setStatusMessage(
          `${normalized.passedTestCases}/${normalized.totalTestCases} tests passed`
        );

        showToast(
          `Execution completed: ${normalized.passedTestCases}/${normalized.totalTestCases} passed.`,
          'warning'
        );

      }

    } catch (err) {

      console.error(
        'Run code error:',
        err
      );


      const errMsg =
        err.message ||
        'Unable to execute code.';


      setExecutionError(errMsg);

      setStatusMessage(
        'Execution failed'
      );


      showToast(
        errMsg,
        'error'
      );


      // --------------------------------------------------------
      // Session expired
      // --------------------------------------------------------

      if (err.status === 401) {

        setTimeout(() => {

          signOut();

          navigate('/login');

        }, 2000);

      }

    } finally {

      setIsRunning(false);

    }

  };


  // ============================================================
  // 4. SAVE CODE
  // ============================================================

  const handleSave = async () => {

    if (isSaving) {
      return;
    }


    if (loadingQuestion) {

      showToast(
        'Please wait until the question is loaded.',
        'warning'
      );

      return;
    }


    if (!editorCode.trim()) {

      showToast(
        'Cannot save empty code.',
        'warning'
      );

      return;
    }


    setIsSaving(true);

    setStatusMessage(
      'Saving code to cloud...'
    );


    try {

      // --------------------------------------------------------
      // Get Cognito ID token
      // --------------------------------------------------------

      const token = await getIdToken();


      if (!token) {

        throw new Error(
          'Your session has expired. Please log in again.'
        );

      }


      // --------------------------------------------------------
      // Save code
      //
      // IMPORTANT:
      // We DO NOT send userId.
      //
      // Backend gets user identity from Cognito.
      // --------------------------------------------------------

      const response = await saveCode(
        currentQuestionId,
        selectedLanguage,
        editorCode,
        token
      );


      console.log(
        'Save code response:',
        response
      );


      // --------------------------------------------------------
      // Update UI
      // --------------------------------------------------------

      setIsSaved(true);

      setStatusMessage(
        'Code saved successfully'
      );


      showToast(
        'Code saved successfully to your cloud account!',
        'success'
      );


      // Keep "Saved" state for 4 seconds
      setTimeout(() => {

        setIsSaved(false);

      }, 4000);


    } catch (err) {

      console.error(
        'Save code error:',
        err
      );


      const errMsg =
        err.message ||
        'Failed to save code.';


      setStatusMessage(
        'Failed to save code'
      );


      setIsSaved(false);


      showToast(
        errMsg,
        'error'
      );


      // --------------------------------------------------------
      // Session expired
      // --------------------------------------------------------

      if (err.status === 401) {

        setTimeout(() => {

          signOut();

          navigate('/login');

        }, 2000);

      }

    } finally {

      setIsSaving(false);

    }

  };


  // ============================================================
  // 5. LOAD SAVED CODE
  // ============================================================

  const handleLoadSavedCode = (code, lang) => {

    if (
      lang &&
      lang.toLowerCase() !== selectedLanguage
    ) {

      setSelectedLanguage(
        lang.toLowerCase()
      );

    }


    setEditorCode(code);

    setIsSaved(true);

    setStatusMessage(
      'Saved code loaded into editor'
    );


    showToast(
      'Saved code loaded into editor!',
      'info'
    );

  };


  // ============================================================
  // 6. RESET TO STARTER CODE
  // ============================================================

  const handleResetStarter = () => {

    const cacheKey =
      `${currentQuestionId}_${selectedLanguage}`;


    const starter =
      starterCodeMap.current[cacheKey];


    if (starter) {

      setEditorCode(starter);

      setIsSaved(false);

      setResultsData(null);

      setExecutionError(null);

      setStatusMessage(
        'Reset to original starter code'
      );


      showToast(
        'Reset to original starter code.',
        'info'
      );

    }

  };


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="h-screen w-screen flex flex-col bg-[#141414] overflow-hidden select-none">


      {/* ======================================================
          TOP HEADER
      ====================================================== */}

      <Header

        questionTitle={
          question?.title ||
          currentQuestionId
        }

        language={selectedLanguage}

        supportedLanguages={
          question?.supportedLanguages ||
          ['python', 'java']
        }

        onLanguageChange={
          handleLanguageChange
        }

        onRun={handleRun}

        isRunning={isRunning}

        onSave={handleSave}

        isSaving={isSaving}

        isSaved={isSaved}

        onOpenHistory={() =>
          setIsHistoryOpen(true)
        }

        user={user}

        onSignOut={async () => {

          await signOut();

          navigate('/login');

        }}

      />


      {/* ======================================================
          MOBILE / TABLET TABS
      ====================================================== */}

      <div className="flex md:hidden bg-[#1e1e1e] border-b border-[#333333] px-2 py-1 gap-1 shrink-0">


        <button

          onClick={() =>
            setActiveMobileTab('question')
          }

          className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeMobileTab === 'question'
              ? 'bg-[#007acc] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#252526]'
          }`}

        >

          <BookOpen className="w-3.5 h-3.5" />

          <span>
            Problem
          </span>

        </button>


        <button

          onClick={() =>
            setActiveMobileTab('editor')
          }

          className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeMobileTab === 'editor'
              ? 'bg-[#007acc] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#252526]'
          }`}

        >

          <Code className="w-3.5 h-3.5" />

          <span>
            Editor
          </span>

        </button>


        <button

          onClick={() =>
            setActiveMobileTab('output')
          }

          className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeMobileTab === 'output'
              ? 'bg-[#007acc] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#252526]'
          }`}

        >

          <TerminalSquare className="w-3.5 h-3.5" />

          <span>
            Output & Tests
          </span>


          {resultsData && (

            <span className="w-2 h-2 rounded-full bg-emerald-500" />

          )}

        </button>

      </div>


      {/* ======================================================
          MAIN WORKSPACE
      ====================================================== */}

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">


        {/* ====================================================
            LEFT PANEL - QUESTION
        ==================================================== */}

        <div

          className={`h-full md:w-[32%] lg:w-[28%] shrink-0 overflow-hidden ${
            activeMobileTab === 'question'
              ? 'flex flex-col'
              : 'hidden md:flex md:flex-col'
          }`}

        >

          <QuestionPanel

            question={question}

            loading={loadingQuestion}

            error={questionError}

            onRetry={() =>
              loadQuestionData(
                currentQuestionId,
                selectedLanguage
              )
            }

          />

        </div>


        {/* ====================================================
            CENTER PANEL - CODE EDITOR
        ==================================================== */}

        <div

          className={`h-full flex-1 overflow-hidden min-w-0 ${
            activeMobileTab === 'editor'
              ? 'flex flex-col'
              : 'hidden md:flex md:flex-col'
          }`}

        >

          <CodeEditor

            code={editorCode}

            language={selectedLanguage}

            onChange={(val) => {

              setEditorCode(val);

              // User changed the code,
              // so it is no longer the last saved version.

              setIsSaved(false);

            }}

            onRun={handleRun}

            onSave={handleSave}

            onResetStarter={
              handleResetStarter
            }

            hasStarterCode={
              !!starterCodeMap.current[
                `${currentQuestionId}_${selectedLanguage}`
              ]
            }

            readOnly={isRunning}

          />

        </div>


        {/* ====================================================
            RIGHT PANEL - OUTPUT
        ==================================================== */}

        <div

          className={`h-full md:w-[36%] lg:w-[34%] shrink-0 overflow-hidden ${
            activeMobileTab === 'output'
              ? 'flex flex-col'
              : 'hidden md:flex md:flex-col'
          }`}

        >

          <OutputPanel

            resultsData={resultsData}

            isRunning={isRunning}

            error={executionError}

            onClear={() => {

              setResultsData(null);

              setExecutionError(null);

              setStatusMessage(
                'Output cleared'
              );

            }}

          />

        </div>

      </main>


      {/* ======================================================
          BOTTOM STATUS BAR
      ====================================================== */}

      <footer className="h-6 bg-[#007acc] text-white px-3 flex items-center justify-between text-[11px] font-mono shrink-0 select-none z-10">


        <div className="flex items-center gap-3">

          <span className="flex items-center gap-1.5 font-sans font-medium">

            <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />

            <span>
              {statusMessage}
            </span>

          </span>


          <span className="hidden sm:inline opacity-70">
            |
          </span>


          <span className="hidden sm:inline opacity-90 capitalize">

            {
              selectedLanguage === 'python'
                ? 'Python 3.12 (AWS Lambda)'
                : 'Java 21 (AWS Lambda)'
            }

          </span>

        </div>


        <div className="flex items-center gap-3">

          <span className="hidden md:inline opacity-80">

            Cognito User: {
              user?.email ||
              'Authenticated'
            }

          </span>


          <span className="hidden sm:inline opacity-70">
            |
          </span>


          <span className="opacity-90">
            Cloud-Native IDE
          </span>

        </div>

      </footer>


      {/* ======================================================
          SAVED CODE HISTORY
      ====================================================== */}

      <SavedCodePanel

        isOpen={isHistoryOpen}

        onClose={() =>
          setIsHistoryOpen(false)
        }

        onLoadCode={
          handleLoadSavedCode
        }

        getIdToken={getIdToken}

        currentLanguage={
          selectedLanguage
        }

      />


      {/* ======================================================
          TOAST
      ====================================================== */}

      {toast && (

        <Toast

          message={toast.message}

          type={toast.type}

          onClose={() =>
            setToast(null)
          }

        />

      )}

    </div>

  );

}