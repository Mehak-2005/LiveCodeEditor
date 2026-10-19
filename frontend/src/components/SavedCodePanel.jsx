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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg h-full bg-[#1e1e1e] border-l border-[#333333] shadow-2xl flex flex-col animate-slide-in-right">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#252526] border-b border-[#333333]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#007acc]" />
            <h2 className="text-base font-semibold text-zinc-100">Saved Code History</h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 rounded hover:bg-[#333333] text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh saved code"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#333333] text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-400">
              <LoadingSpinner size="lg" className="text-[#007acc] mb-3" />
              <p className="text-xs">Fetching your saved submissions from DynamoDB...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-200 text-xs">
              <div className="font-semibold text-sm mb-1 text-rose-300">Error loading saved code</div>
              <p>{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-3 px-3 py-1.5 bg-[#007acc] text-white rounded font-sans text-xs hover:bg-[#1f8ad2]"
              >
                Retry
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500">
              <FileCode className="w-12 h-12 text-zinc-600 mb-3 stroke-1" />
              <p className="text-sm font-medium text-zinc-400">No saved code found</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
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
                  className="rounded-lg border border-[#333333] bg-[#252526]/70 p-4 space-y-3 hover:border-[#444444] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-zinc-200 uppercase px-2 py-0.5 rounded bg-[#181818] border border-[#333333]">
                        {item.language}
                      </span>
                      <span className="text-xs text-zinc-400 capitalize">
                        {item.questionId || 'two-sum'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      <span>{formatDate(item.savedAt)}</span>
                    </div>
                  </div>

                  {/* Code snippet preview */}
                  <pre className="bg-[#181818] p-3 rounded border border-[#2e2e2e] text-xs font-mono text-zinc-300 max-h-32 overflow-hidden overflow-y-auto whitespace-pre-wrap select-text">
                    {item.code}
                  </pre>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-1">
                    {!isCurrentLang && (
                      <span className="text-[11px] text-amber-400/90 font-medium">
                        Switches editor to {item.language}
                      </span>
                    )}
                    <div className="ml-auto">
                      <button
                        onClick={() => handleLoad(item)}
                        disabled={isLoaded}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                          isLoaded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#007acc] hover:bg-[#1f8ad2] text-white'
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
