import React, { useEffect, useState } from 'react';
import { History, X, RefreshCw, Upload, Calendar, FileCode, CheckCircle2 } from 'lucide-react';
import { getSavedCode } from '../services/api';
import { formatDate } from '../utils/helpers';
import LoadingSpinner from './LoadingSpinner';

export default function SavedCodePanel({
  isOpen,
  onClose,
  onLoadCode,
  getIdToken,
  currentLanguage,
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadedId, setLoadedId] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Please sign in to view your saved code.');
      }
      const data = await getSavedCode(token);
      if (data && Array.isArray(data.savedCode)) {
        setHistory(data.savedCode);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to fetch saved code:', err);
      setError(err.message || 'Unable to retrieve saved code.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoad = (item) => {
    onLoadCode(item.code, item.language);
    setLoadedId(item.saveId);
    setTimeout(() => {
      setLoadedId(null);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg h-full bg-[#0a0e17] border-l border-slate-800/80 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0e1422] border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-snug">Saved Code History</h2>
              <p className="text-[11px] text-slate-400 font-mono">DynamoDB Cloud Submissions</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-[#151d30] text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-800"
              title="Refresh saved code"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#151d30] text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-800"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <LoadingSpinner size="lg" className="text-sky-400 mb-3" />
              <p className="text-xs font-mono">Fetching your saved submissions from DynamoDB...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-rose-200 text-xs shadow-lg">
              <div className="font-semibold text-sm mb-1 text-rose-300">Error loading saved code</div>
              <p className="text-slate-400 mb-3 leading-relaxed">{error}</p>
              <button
                onClick={fetchHistory}
                className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-sans text-xs font-semibold hover:from-sky-400 hover:to-blue-500 shadow-md shadow-blue-500/20"
              >
                Retry
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
              <div className="w-14 h-14 rounded-2xl bg-[#0e1422] border border-slate-800 flex items-center justify-center mb-3 text-slate-400">
                <FileCode className="w-7 h-7 stroke-1 text-sky-400" />
              </div>
              <p className="text-sm font-semibold text-slate-200">No saved code found</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                When you click "Save" in the editor, your code will be stored in your AWS account and show up here.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isCurrentLang = (item.language || '').toLowerCase() === (currentLanguage || '').toLowerCase();
              const isLoaded = loadedId === item.saveId;

              return (
                <div
                  key={item.saveId}
                  className="rounded-2xl border border-slate-800/80 bg-[#0e1422]/90 p-4 space-y-3 hover:border-slate-700/80 transition-all shadow-md group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold text-slate-200 uppercase px-2 py-0.5 rounded-md bg-[#070b13] border border-slate-800 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.language?.toLowerCase() === 'python' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                        <span>{item.language}</span>
                      </span>
                      <span className="text-xs font-semibold text-sky-300 capitalize bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
                        {item.questionId || 'two-sum'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{formatDate(item.savedAt)}</span>
                    </div>
                  </div>

                  {/* Code snippet preview */}
                  <pre className="bg-[#070b13] p-3.5 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-300 max-h-36 overflow-hidden overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                    {item.code}
                  </pre>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-1">
                    {!isCurrentLang && (
                      <span className="text-[11px] text-amber-400/90 font-medium font-mono">
                        Switches editor to {item.language}
                      </span>
                    )}
                    <div className="ml-auto">
                      <button
                        onClick={() => handleLoad(item)}
                        disabled={isLoaded}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
                          isLoaded
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-950/40'
                            : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-blue-500/20 active:scale-95'
                        }`}
                      >
                        {isLoaded ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Loaded!</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Load into Editor</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
