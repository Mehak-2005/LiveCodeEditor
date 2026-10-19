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

    <div className="min-h-screen w-full bg-[#141414] text-zinc-100 flex flex-col">


      {/* ===================================================
          TOP APPLICATION HEADER
          =================================================== */}

      <header
        className="
          h-14
          bg-[#181818]
          border-b
          border-[#333333]
          px-6
          flex
          items-center
          justify-between
          shrink-0
          sticky
          top-0
          z-20
          shadow-md
        "
      >

        {/* -------------------------------------------------
            LEFT SIDE - APPLICATION BRAND
            ------------------------------------------------- */}

        <div className="flex items-center gap-3">

          <div
            className="
              w-8
              h-8
              rounded-lg
              bg-gradient-to-br
              from-[#007acc]
              to-[#005a9e]
              flex
              items-center
              justify-center
              shadow-md
              shadow-[#007acc]/20
            "
          >

            <Terminal className="w-4 h-4 text-white" />

          </div>


          <div className="flex flex-col">

            <span
              className="
                font-bold
                text-sm
                text-zinc-100
                tracking-tight
                leading-tight
              "
            >
              LiveCode
            </span>

            <span
              className="
                text-[10px]
                text-zinc-400
                font-mono
              "
            >
              Live Code Editor
            </span>

          </div>

        </div>


        {/* -------------------------------------------------
            RIGHT SIDE
            ------------------------------------------------- */}

        <div className="flex items-center gap-3">


          {/* Saved Code */}

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="
              inline-flex
              items-center
              gap-1.5
              px-3
              py-1.5
              rounded-md
              text-xs
              font-medium
              transition-colors
              border
              bg-[#252526]
              hover:bg-[#2d2d30]
              border-[#3e3e42]
              text-zinc-300
              hover:text-white
            "
            title="View saved code submissions"
          >

            <History className="w-3.5 h-3.5 text-zinc-400" />

            <span className="hidden sm:inline">
              Saved Code
            </span>

          </button>


          {/* User */}

          {user && (

            <div
              className="
                hidden
                md:flex
                items-center
                gap-2
                px-2.5
                py-1
                rounded
                bg-[#252526]
                border
                border-[#333333]
              "
            >

              <div
                className="
                  w-5
                  h-5
                  rounded-full
                  bg-[#007acc]/20
                  text-[#007acc]
                  flex
                  items-center
                  justify-center
                "
              >

                <User className="w-3 h-3" />

              </div>


              <span
                className="
                  text-xs
                  text-zinc-300
                  max-w-[140px]
                  truncate
                "
                title={user.email}
              >
                {user.email}
              </span>

            </div>

          )}


          {/* Sign Out */}

          <button
            onClick={signOut}
            className="
              inline-flex
              items-center
              gap-1.5
              px-2.5
              py-1.5
              rounded-md
              text-xs
              font-medium
              text-zinc-400
              hover:text-rose-300
              hover:bg-rose-950/40
              border
              border-transparent
              hover:border-rose-500/30
              transition-colors
            "
            title="Sign out of Live Code Editor"
          >

            <LogOut className="w-3.5 h-3.5" />

            <span className="hidden sm:inline">
              Sign Out
            </span>

          </button>

        </div>

      </header>


      {/* ===================================================
          MAIN CONTENT
          =================================================== */}

      <main
        className="
          flex-1
          max-w-5xl
          w-full
          mx-auto
          px-4
          sm:px-6
          pt-6
          pb-24
        "
      >


        {/* =================================================
            HERO SECTION
            ================================================= */}

        <div className="mb-6">

          <div className="flex items-center gap-2.5 mb-1.5">

            <BookOpen className="w-6 h-6 text-[#007acc]" />

            <h1
              className="
                text-2xl
                font-bold
                tracking-tight
                text-zinc-100
              "
            >
              Coding Problems
            </h1>

          </div>


          <p
            className="
              text-sm
              text-zinc-400
              max-w-xl
              leading-relaxed
            "
          >
            Practice coding problems and improve your
            problem-solving skills with live AWS execution
            in Python and Java.
          </p>


          {/* Question count */}

          {!isLoading && !error && (

            <p
              className="
                text-xs
                text-zinc-500
                mt-2
              "
            >
              {totalQuestions} coding problems available
            </p>

          )}

        </div>


        {/* =================================================
            SEARCH + FILTER TOOLBAR
            ================================================= */}

        <div
          className="
            flex
            flex-col
            sm:flex-row
            items-stretch
            sm:items-center
            justify-between
            gap-3
            mb-6
            bg-[#1e1e1e]
            p-3
            rounded-xl
            border
            border-[#333333]
          "
        >


          {/* Search Input */}

          <div className="relative flex-1">

            <Search
              className="
                w-4
                h-4
                text-zinc-500
                absolute
                left-3
                top-1/2
                -translate-y-1/2
              "
            />


            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              placeholder="Search problems by title, topic, or description..."
              className="
                w-full
                bg-[#181818]
                border
                border-[#333333]
                rounded-lg
                pl-9
                pr-3
                py-2
                text-xs
                text-zinc-100
                placeholder-zinc-500
                focus:outline-none
                focus:ring-1
                focus:ring-[#007acc]
                focus:border-[#007acc]
              "
            />

          </div>


          {/* Difficulty Filter */}

          <div
            className="
              flex
              items-center
              gap-1
              bg-[#181818]
              p-1
              rounded-lg
              border
              border-[#333333]
              shrink-0
            "
          >

            {['all', 'easy', 'medium', 'hard'].map(
              (diff) => (

                <button
                  key={diff}
                  onClick={() =>
                    setDifficultyFilter(diff)
                  }
                  className={`
                    px-3
                    py-1
                    rounded
                    text-xs
                    font-medium
                    capitalize
                    transition-colors
                    ${
                      difficultyFilter === diff
                        ? 'bg-[#007acc] text-white'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#252526]'
                    }
                  `}
                >
                  {diff}
                </button>

              )
            )}

          </div>

        </div>


        {/* =================================================
            LOADING STATE
            ================================================= */}

        {isLoading && (

          <div
            className="
              flex
              flex-col
              items-center
              justify-center
              p-16
              bg-[#1e1e1e]
              border
              border-[#333333]
              rounded-xl
            "
          >

            <Loader2
              className="
                w-8
                h-8
                text-[#007acc]
                animate-spin
                mb-4
              "
            />

            <p
              className="
                text-sm
                font-medium
                text-zinc-300
              "
            >
              Loading coding problems...
            </p>

            <p
              className="
                text-xs
                text-zinc-500
                mt-1
              "
            >
              Fetching questions from AWS DynamoDB
            </p>

          </div>

        )}


        {/* =================================================
            ERROR STATE
            ================================================= */}

        {!isLoading && error && (

          <div
            className="
              flex
              flex-col
              items-center
              justify-center
              p-12
              bg-[#1e1e1e]
              border
              border-red-900/50
              rounded-xl
              text-center
            "
          >

            <AlertCircle
              className="
                w-10
                h-10
                text-red-400
                mb-3
              "
            />


            <p
              className="
                text-sm
                font-medium
                text-zinc-200
              "
            >
              Unable to load coding problems
            </p>


            <p
              className="
                text-xs
                text-zinc-500
                mt-2
                max-w-md
              "
            >
              {error}
            </p>


            <button
              onClick={handleRetry}
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                bg-[#007acc]
                hover:bg-[#1f8ad2]
                text-white
                rounded
                text-xs
                font-medium
                transition-colors
              "
            >

              <RefreshCw className="w-3.5 h-3.5" />

              Try Again

            </button>

          </div>

        )}


        {/* =================================================
            QUESTION CARDS
            ================================================= */}

        {!isLoading &&
          !error &&
          filteredQuestions.length > 0 && (

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-4
              "
            >

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

        {!isLoading &&
          !error &&
          filteredQuestions.length === 0 && (

            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                p-12
                bg-[#1e1e1e]
                border
                border-[#333333]
                rounded-xl
                text-center
              "
            >

              <Filter
                className="
                  w-10
                  h-10
                  text-zinc-600
                  mb-3
                  stroke-1
                "
              />


              <p
                className="
                  text-sm
                  font-medium
                  text-zinc-300
                "
              >
                No coding problems found
              </p>


              <p
                className="
                  text-xs
                  text-zinc-500
                  mt-1
                "
              >
                Try adjusting your search query or
                difficulty filter.
              </p>


              <button
                onClick={() => {
                  setSearchQuery('');
                  setDifficultyFilter('all');
                }}
                className="
                  mt-4
                  px-3
                  py-1.5
                  bg-[#007acc]
                  hover:bg-[#1f8ad2]
                  text-white
                  rounded
                  text-xs
                  font-medium
                "
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