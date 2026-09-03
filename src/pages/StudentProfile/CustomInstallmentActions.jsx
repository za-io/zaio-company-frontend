import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Compact actions for instalment rows — one optional primary link + dropdown menu.
 * Menu renders in a portal so it is not clipped by table/card overflow.
 */
export default function CustomInstallmentActions({
  menuKey,
  openMenuKey,
  setOpenMenuKey,
  primaryLink,
  sections,
}) {
  const open = openMenuKey === menuKey;
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  const visibleSections = (sections || [])
    .map((section) => ({
      ...section,
      items: (section.items || []).filter((item) => item.show !== false),
    }))
    .filter((section) => section.items.length > 0);

  const updateMenuPosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuHeightEstimate = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeightEstimate && rect.top > menuHeightEstimate;
    setMenuStyle({
      position: "fixed",
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
      transform: openUpward ? "translateY(-100%)" : undefined,
      zIndex: 9999,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, menuKey]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const inRoot = rootRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inRoot && !inMenu) setOpenMenuKey(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, setOpenMenuKey]);

  if (!primaryLink && !visibleSections.length) return <span className="text-xs text-gray-400">—</span>;

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="min-w-[11rem] py-1 bg-white border border-gray-200 rounded-lg shadow-lg"
            role="menu"
          >
            {visibleSections.map((section, sIdx) => (
              <div key={section.title || sIdx}>
                {sIdx > 0 ? <div className="my-1 border-t border-gray-100" /> : null}
                {section.title ? (
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {section.title}
                  </p>
                ) : null}
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      setOpenMenuKey(null);
                      item.onClick?.();
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      item.danger ? "text-red-700 hover:bg-red-50" : "text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                    {item.badge != null && item.badge !== "" ? (
                      <span className="ml-1.5 text-xs text-gray-500">({item.badge})</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex items-center gap-1.5" ref={rootRef}>
      {primaryLink ? (
        <a
          href={primaryLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100"
        >
          {primaryLink.label}
        </a>
      ) : null}
      {visibleSections.length > 0 ? (
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpenMenuKey(open ? null : menuKey)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            Actions
            <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {menu}
        </div>
      ) : null}
    </div>
  );
}
