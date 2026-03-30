import React, { useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "zaio_finance_unlocked";

/** Default matches product requirement; override with REACT_APP_FINANCE_PAGE_PASSWORD at build time. */
const FINANCE_PAGE_PASSWORD =
  process.env.REACT_APP_FINANCE_PAGE_PASSWORD ?? "Collections2026!";

function readUnlocked() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Extra gate for /finance: password once per browser tab session.
 */
const FinancePasswordGate = ({ children }) => {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (password === FINANCE_PAGE_PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      setUnlocked(true);
      setPassword("");
    } else {
      setError("Incorrect password.");
    }
  };

  if (unlocked) {
    return children;
  }

  return (
    <div className="px-6 lg:px-12 py-16 max-w-md mx-auto text-sm">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
        <h1 className="text-xl font-bold text-white mb-1">Finance</h1>
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
          Enter the Finance access password to continue.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="finance-gate-password" className="block text-[11px] text-gray-500 mb-1.5">
              Password
            </label>
            <input
              id="finance-gate-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="••••••••••••"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
          >
            Continue
          </button>
        </form>
        <p className="mt-5 text-center">
          <Link to="/" className="text-xs text-blue-400 hover:text-blue-300">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
};

export default FinancePasswordGate;
