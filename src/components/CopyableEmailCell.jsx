import React, { useCallback, useState } from "react";

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Email with copy control: click the address or the copy icon to copy.
 */
export default function CopyableEmailCell({ email, className = "", textClassName = "" }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (e) => {
      e?.stopPropagation?.();
      if (!email) return;
      await copyToClipboard(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [email]
  );

  if (!email) {
    return <span className="text-gray-500">—</span>;
  }

  return (
    <div className={`flex items-center gap-1.5 min-w-0 group ${className}`}>
      <button
        type="button"
        onClick={copy}
        className={`text-left truncate flex-1 min-w-0 rounded px-0.5 -mx-0.5 hover:bg-white/5 ${textClassName}`}
        title="Click to copy email"
      >
        {email}
      </button>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-white/10"
        title="Copy email"
        aria-label="Copy email"
      >
        {copied ? (
          <span className="text-[10px] font-medium text-emerald-400 whitespace-nowrap">Copied</span>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
