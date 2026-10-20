import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal,
  Search,
  LogOut,
  History,
  User,
  BookOpen,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Code2,
} from 'lucide-react';

import QuestionCard from '../components/QuestionCard';
import SavedCodePanel from '../components/SavedCodePanel';
import { useAuth } from '../hooks/useAuth';


// =========================================================
// API CONFIGURATION
// =========================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://ehy8q4vw9b.execute-api.ap-south-1.amazonaws.com/Prod';


// =========================================================
// QUESTION LIBRARY
// =========================================================

export default function QuestionLibrary() {

  const navigate = useNavigate();

  const {
    user,
    signOut,
    getIdToken,
  } = useAuth();


  // =======================================================
  // STATE
  // =======================================================

  const [questions, setQuestions] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState('');

  const [totalQuestions, setTotalQuestions] = useState(0);


  // =======================================================
  // LOAD QUESTIONS FROM AWS
  // =======================================================

  const loadQuestions = async () => {

    try {

      setIsLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/questions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );


      // ---------------------------------------------------
      // Check HTTP response
      // ---------------------------------------------------

      if (!response.ok) {

        throw new Error(
          `Failed to load questions. Server returned ${response.status}.`
        );
      }


      // ---------------------------------------------------
      // Convert response to JSON
      // ---------------------------------------------------

      const data = await response.json();


      // ---------------------------------------------------
      // Check backend success response
      // ---------------------------------------------------

      if (!data.success) {

        throw new Error(
          data.error || 'Unable to load questions.'
        );
      }


      // ---------------------------------------------------
      // Convert API question format to frontend format
      //
      // API:
      // questionId
      //
      // QuestionCard:
      // id
      // ---------------------------------------------------

      const formattedQuestions = (data.questions || []).map(
        (question) => ({
          ...question,

          // QuestionCard expects "id"
          id: question.questionId,

          // Keep questionId as well because the editor
          // navigation uses the real DynamoDB question ID.
          questionId: question.questionId,

          // The API currently does not return category.
          // Keep it empty so the search logic remains safe.
          category: question.category || '',
        })
      );


      // ---------------------------------------------------
      // Save questions in React state
      // ---------------------------------------------------

      setQuestions(formattedQuestions);

      setTotalQuestions(
        data.totalQuestions ?? formattedQuestions.length
      );

    } catch (err) {

      console.error(
        'Error loading questions:',
        err
      );

      setError(
        err.message ||
        'Something went wrong while loading questions.'
      );

    } finally {

      setIsLoading(false);
    }
  };


  // =======================================================
  // LOAD QUESTIONS WHEN PAGE OPENS
  // =======================================================

  useEffect(() => {

    loadQuestions();

  }, []);


  // =======================================================
  // FILTER QUESTIONS
  // =======================================================

  const filteredQuestions = useMemo(() => {

    const search = searchQuery
      .trim()
      .toLowerCase();


    return questions.filter((question) => {

      // ---------------------------------------------------
      // Search matching
      // ---------------------------------------------------

      const matchesSearch =
        !search ||

        (question.title || '')
          .toLowerCase()
          .includes(search) ||

        (question.description || '')
          .toLowerCase()
          .includes(search) ||

        (question.category || '')
          .toLowerCase()
          .includes(search);


      // ---------------------------------------------------
      // Difficulty matching
      // ---------------------------------------------------

      const matchesDifficulty =
        difficultyFilter === 'all' ||

        (question.difficulty || '')
          .toLowerCase() ===
          difficultyFilter.toLowerCase();


      return (
        matchesSearch &&
        matchesDifficulty
      );
    });

  }, [
    questions,
    searchQuery,
    difficultyFilter,
  ]);


  // =======================================================
  // SELECT QUESTION
  // =======================================================

  const handleSelectQuestion = (questionId) => {

    navigate(
      `/editor/${questionId}`
    );
  };


  // =======================================================
  // LOAD SAVED CODE
  // =======================================================

  const handleLoadSavedCode = (code, language) => {

    // The SavedCodePanel currently loads the saved code
    // through the editor flow.
    //
    // Keep the existing behavior of opening Two Sum.
    // This can later be improved to store the questionId
    // with every saved submission.

    navigate('/editor/two-sum');
  };


  // =======================================================
  // RETRY
  // =======================================================

  const handleRetry = () => {

    loadQuestions();
  };


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="min-h-screen w-full bg-[#080c14] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Ambient background light gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[360px] bg-gradient-to-b from-blue-600/10 via-sky-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-48 left-1/4 w-[400px] h-[300px] bg-indigo-600/5 blur-3xl pointer-events-none" />

      {/* ===================================================
          TOP APPLICATION HEADER
          =================================================== */}
      <header className="h-14 bg-[#090d16]/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm">
        {/* Left Side: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/25 ring-1 ring-white/20">
            <Terminal className="w-4 h-4 text-white" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight leading-none">
                LiveCode
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-blue-500/10 border border-blue-500/20 text-sky-400 font-medium">
                Cloud IDE
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
              Serverless Technical Challenges
            </span>
          </div>
        </div>

        {/* Right Side: Navigation & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Framework Workspace */}
          <button
            type="button"
            onClick={() => navigate('/frameworks')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#0e1422] hover:bg-[#151d30] border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
            title="Open Django and Spring Boot projects"
          >
            <Layers className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden md:inline">Framework Workspace</span>
          </button>

          {/* Saved Code */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#0e1422] hover:bg-[#151d30] border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
            title="View saved code submissions"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Saved Code</span>
          </button>

          {/* User Profile */}
          {user && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0e1422] border border-slate-800">
              <div className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center ring-1 ring-sky-500/30">
                <User className="w-3 h-3" />
              </div>
              <span className="text-xs text-slate-300 max-w-[130px] truncate font-medium" title={user.email}>
                {user.email}
              </span>
            </div>
          )}

          {/* Sign Out */}
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-800/30 transition-all"
            title="Sign out of Live Code Editor"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* ===================================================
          MAIN CONTENT
          =================================================== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 pb-24 z-10">
        {/* =================================================
            HERO SECTION
            ================================================= */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>AWS Cloud Execution Environment</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Coding Problems
            </h1>

            <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
              Sharpen your problem-solving algorithms with instant execution in Python 3.12 and Java 21, powered by AWS Lambda.
            </p>
          </div>

          {!isLoading && !error && (
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0e1422] border border-slate-800 text-xs text-slate-300 self-start md:self-auto font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <span>{totalQuestions} challenges available</span>
            </div>
          )}
        </div>

        {/* =================================================
            SEARCH + FILTER TOOLBAR
            ================================================= */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-8 bg-[#0e1422]/90 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-slate-800/80 shadow-xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problems by title, topic, or description..."
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/60 transition-all font-sans"
            />
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1 bg-[#080c14] p-1 rounded-xl border border-slate-800 shrink-0">
            {['all', 'easy', 'medium', 'hard'].map((diff) => {
              const isActive = difficultyFilter === diff;
              return (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-blue-500/25 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================
            LOADING STATE
            ================================================= */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-16 bg-[#0e1422]/80 backdrop-blur-sm border border-slate-800/80 rounded-2xl shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
              <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Loading coding problems...
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Fetching catalog from AWS DynamoDB
            </p>
          </div>
        )}

        {/* =================================================
            ERROR STATE
            ================================================= */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center p-12 bg-[#0e1422]/80 border border-rose-500/20 rounded-2xl text-center shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>

            <p className="text-base font-semibold text-slate-200">
              Unable to load coding problems
            </p>

            <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
              {error}
            </p>

            <button
              onClick={handleRetry}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* =================================================
            QUESTION CARDS
            ================================================= */}
        {!isLoading && !error && filteredQuestions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onSelect={handleSelectQuestion}
              />
            ))}
          </div>
        )}

        {/* =================================================
            NO RESULTS
            ================================================= */}
        {!isLoading && !error && filteredQuestions.length === 0 && (
          <div className="flex flex-col items-center justify-center p-14 bg-[#0e1422]/80 border border-slate-800/80 rounded-2xl text-center shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-3">
              <Filter className="w-6 h-6 text-slate-400" />
            </div>

            <p className="text-base font-semibold text-slate-200">
              No coding problems found
            </p>

            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              No results match your search query or difficulty filter.
            </p>

            <button
              onClick={() => {
                setSearchQuery('');
                setDifficultyFilter('all');
              }}
              className="mt-5 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* ===================================================
          SAVED CODE DRAWER
          =================================================== */}
      <SavedCodePanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadCode={handleLoadSavedCode}
        getIdToken={getIdToken}
        currentLanguage="python"
      />
    </div>
  );
}