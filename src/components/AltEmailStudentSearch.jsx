import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchStudents } from "../api/student";

/**
 * Magnifying-glass control next to "Alt email" checkbox: search Zaio by email or name, then pick a user.
 */
export default function AltEmailStudentSearch({ onSelectUser, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 3) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchStudents(term, "email");
      setLoading(false);
      if (res?.success && Array.isArray(res.users)) {
        setResults(res.users);
      } else {
        setResults([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, open]);

  const handlePick = (u) => {
    onSelectUser(u);
    setOpen(false);
    setQ("");
    setResults([]);
  };

  const handleClose = () => {
    setOpen(false);
    setQ("");
    setResults([]);
  };

  const overlay =
    open &&
    createPortal(
      <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          className="absolute inset-0 bg-black/60"
          aria-label="Close search"
          onClick={handleClose}
        />
        <div
          className="relative w-full max-w-md rounded-xl border border-white/15 bg-[#0d1117] shadow-2xl p-4 z-10"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-white">Search student in Zaio</span>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Email or name (min 3 characters)"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm placeholder-gray-500 mb-2"
            autoFocus
          />
          {loading && <p className="text-xs text-gray-500">Searching…</p>}
          <ul className="max-h-52 overflow-y-auto mt-2 space-y-1">
            {results.map((u) => (
              <li key={u._id}>
                <button
                  type="button"
                  onClick={() => handlePick(u)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 text-gray-200 border border-transparent hover:border-white/10"
                >
                  <span className="text-white font-medium">{u.username || "—"}</span>
                  <span className="block text-xs text-gray-400 truncate">{u.email}</span>
                  {u.studentNumber && (
                    <span className="text-xs text-gray-500">Student # {u.studentNumber}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {q.trim().length >= 3 && !loading && results.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">No matches</p>
          )}
          {q.trim().length > 0 && q.trim().length < 3 && (
            <p className="text-xs text-gray-500 mt-2">Type at least 3 characters</p>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="p-1 rounded text-gray-500 hover:text-violet-300 hover:bg-white/10 disabled:opacity-40"
        title="Search Zaio for this student (other email / name)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
      {overlay}
    </>
  );
}
