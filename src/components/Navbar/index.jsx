import React, { useState, useRef, useEffect, useCallback } from "react";
import logo from "../../assets/img/logo/zaio-logo-light.png";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../../store/UserProvider";
import { getAssessorLateSubmissions, getTutorLateVerifications } from "../../api/company";

const Navbar = () => {
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem("TOKEN");
    localStorage.clear();
    navigate("/login");
    setUser(null);
  };

  const canManagePrograms = ["SUPER_ADMIN", "COMPANY_ADMIN", "SUPER_STUDENT_ADMIN"].includes(user?.role);
  const isCompanyAdmin = user?.role === "COMPANY_ADMIN";
  const canManageTeam = ["SUPER_ADMIN", "SUPER_STUDENT_ADMIN"].includes(user?.role);
  const canViewOC = ["SUPER_ADMIN", "COMPANY_ADMIN", "SUPER_STUDENT_ADMIN", "ASSESSOR", "MODERATOR", "TUTOR"].includes(user?.role);
  const isSuperAdmin = ["SUPER_ADMIN"].includes(user?.role);
  const financeNavRoles = ["SUPER_STUDENT_ADMIN", "SUPER_ADMIN"];
  const showFinanceNav = user?.email && financeNavRoles.includes(user?.role);
  const isAssessor = user?.role === "ASSESSOR";
  const isTutor = user?.role === "TUTOR";
  const [latePendingCount, setLatePendingCount] = useState(0);
  const [lateCountLoading, setLateCountLoading] = useState(false);
  const lateCountRequestRef = useRef(null);
  const [lateVerificationCount, setLateVerificationCount] = useState(0);
  const [lateVerificationLoading, setLateVerificationLoading] = useState(false);
  const lateVerificationRequestRef = useRef(null);

  const refreshLatePendingCount = useCallback(async () => {
    if (!isAssessor || !user?.email) {
      setLatePendingCount(0);
      setLateCountLoading(false);
      return;
    }
    setLateCountLoading(true);
    try {
      if (lateCountRequestRef.current) {
        const res = await lateCountRequestRef.current;
        if (res?.success) {
          setLatePendingCount(Number(res.data?.totals?.pendingCount) || 0);
        }
        return;
      }
      lateCountRequestRef.current = getAssessorLateSubmissions({
        pendingOnly: true,
        countOnly: true,
      }).finally(() => {
        lateCountRequestRef.current = null;
      });
      const res = await lateCountRequestRef.current;
      if (res?.success) {
        setLatePendingCount(Number(res.data?.totals?.pendingCount) || 0);
      }
    } finally {
      setLateCountLoading(false);
    }
  }, [isAssessor, user?.email]);

  const refreshLateVerificationCount = useCallback(async () => {
    if (!isTutor || !user?.email) {
      setLateVerificationCount(0);
      setLateVerificationLoading(false);
      return;
    }
    setLateVerificationLoading(true);
    try {
      if (lateVerificationRequestRef.current) {
        const res = await lateVerificationRequestRef.current;
        if (res?.success) {
          setLateVerificationCount(Number(res.data?.totals?.pendingCount) || 0);
        }
        return;
      }
      lateVerificationRequestRef.current = getTutorLateVerifications({
        pendingOnly: true,
        countOnly: true,
      }).finally(() => {
        lateVerificationRequestRef.current = null;
      });
      const res = await lateVerificationRequestRef.current;
      if (res?.success) {
        setLateVerificationCount(Number(res.data?.totals?.pendingCount) || 0);
      }
    } finally {
      setLateVerificationLoading(false);
    }
  }, [isTutor, user?.email]);

  useEffect(() => {
    if (!isTutor) return undefined;
    refreshLateVerificationCount();
    const interval = window.setInterval(refreshLateVerificationCount, 120000);
    const onUpdated = (e) => {
      const count = Number(e?.detail?.pendingCount);
      if (Number.isFinite(count)) setLateVerificationCount(count);
    };
    window.addEventListener("zaio-late-verifications-updated", onUpdated);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("zaio-late-verifications-updated", onUpdated);
    };
  }, [isTutor, refreshLateVerificationCount]);

  useEffect(() => {
    if (!isAssessor) return undefined;
    refreshLatePendingCount();
    const interval = window.setInterval(refreshLatePendingCount, 120000);
    const onUpdated = (e) => {
      const count = Number(e?.detail?.pendingCount);
      if (Number.isFinite(count)) setLatePendingCount(count);
    };
    window.addEventListener("zaio-late-submissions-updated", onUpdated);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("zaio-late-submissions-updated", onUpdated);
    };
  }, [isAssessor, refreshLatePendingCount]);

  const showLateBlink =
    isAssessor && latePendingCount > 0 && location.pathname !== "/late-submissions";

  const showLateVerificationBlink =
    isTutor && lateVerificationCount > 0 && location.pathname !== "/late-verifications";

  const menuItems = [
    // Program Management
    ...(canManagePrograms ? [
      { label: "New Bootcamp", path: "/program/add", icon: "plus" },
      { label: "Add to Existing", path: "/program/add/exiting", icon: "add" },
      { label: "Manage Bootcamps", path: "/program/manage", icon: "settings" },
      { label: "OC Cohort", path: "/oc-cohort/create", icon: "cohort" },
    ] : []),
    // Admin only
    ...(isSuperAdmin ? [
      { divider: true },
      { label: "New Company", path: "/company/add", icon: "building" },
      { label: "New Tutor", path: "/tutor/add", icon: "user" },
      { label: "New Assessor", path: "/assessor/add", icon: "clipboard" },
      { label: "New Moderator", path: "/moderator/add", icon: "shield" },
    ] : []),
  ];

  const getIcon = (type) => {
    switch (type) {
      case "plus":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case "add":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      case "settings":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case "building":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case "user":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case "clipboard":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case "shield":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "cohort":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case "team":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-[#0D1117] border-b border-gray-800">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo & User */}
          <Link to="/" className="flex items-center gap-3">
            <img className="h-8" src={logo} alt="Zaio" />
          {user?.email && user?.role !== "TUTOR" && (
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-700">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {user?.company_username?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="text-gray-300 text-xs font-medium truncate max-w-[120px]">
                  {user?.company_username}
                </span>
              </div>
          )}
        </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Management Dropdown */}
            {user?.email && canManagePrograms && !isCompanyAdmin && menuItems.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                    showDropdown
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="hidden sm:inline">Create</span>
                  <svg className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#161B22] rounded-xl border border-gray-800 shadow-xl overflow-hidden z-50">
                    <div className="py-1">
                      {menuItems.map((item, idx) => (
                        item.divider ? (
                          <div key={idx} className="my-1 border-t border-gray-800" />
                        ) : (
                          <button
                            key={idx}
                            onClick={() => {
                              navigate(item.path);
                              setShowDropdown(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              location.pathname === item.path
                                ? "bg-blue-600/20 text-blue-400"
                                : "text-gray-300 hover:bg-gray-800 hover:text-white"
                            }`}
                          >
                            <span className="text-gray-500">{getIcon(item.icon)}</span>
                            {item.label}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Finance & roster (not shown for COMPANY_ADMIN — Zaio staff / SSM only) */}
            {showFinanceNav && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/finance")}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    location.pathname === "/finance"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-emerald-600/20 hover:text-emerald-400"
                  }`}
                >
                  Finance
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/deferred-students")}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    location.pathname === "/deferred-students"
                      ? "bg-yellow-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-yellow-600/20 hover:text-yellow-400"
                  }`}
                >
                  Deferred Students
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/qcto-payments")}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    location.pathname === "/qcto-payments"
                      ? "bg-teal-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-teal-600/20 hover:text-teal-400"
                  }`}
                >
                  QCTO payments
                </button>
              </>
            )}

            {/* Tutor bookings (SUPER_STUDENT_ADMIN) */}
            {user?.email && user?.role === "SUPER_STUDENT_ADMIN" && (
              <button
                onClick={() => navigate("/tutor-bookings-admin")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/tutor-bookings-admin"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-amber-600/20 hover:text-amber-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden md:inline">Tutor bookings</span>
              </button>
            )}

            {/* Manage Team */}
            {user?.email && canManageTeam && !isCompanyAdmin && (
              <button
                onClick={() => navigate("/manage-team")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/manage-team"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-indigo-600/20 hover:text-indigo-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="hidden md:inline">Manage Team</span>
              </button>
            )}

            {/* Bootcamps (tutors) - was Analytics */}
            {user?.email && user?.role === "TUTOR" && (
              <button
                onClick={() => navigate("/tutor/analytics")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname.startsWith("/tutor/analytics")
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-blue-600/20 hover:text-blue-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="hidden md:inline">Bootcamps</span>
              </button>
            )}

            {/* My availability (tutors) */}
            {user?.email && user?.role === "TUTOR" && (
              <button
                onClick={() => navigate("/tutor-availability")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/tutor-availability"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-amber-600/20 hover:text-amber-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden md:inline">My availability</span>
              </button>
            )}

            {/* My bookings (tutors) */}
            {user?.email && user?.role === "TUTOR" && (
              <button
                onClick={() => navigate("/my-bookings")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/my-bookings"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-amber-600/20 hover:text-amber-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden md:inline">My bookings</span>
              </button>
            )}

            {/* Reviews (tutors) */}
            {user?.email && user?.role === "TUTOR" && (
              <button
                onClick={() => navigate("/reviews")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/reviews"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-amber-600/20 hover:text-amber-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span className="hidden md:inline">Reviews</span>
              </button>
            )}

            {/* Settings (tutors) */}
            {user?.email && user?.role === "TUTOR" && (
            <button
                onClick={() => navigate("/tutor-settings")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/tutor-settings"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-amber-600/20 hover:text-amber-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline">Settings</span>
            </button>
          )}
          
            {/* View OC Programs */}
            {user?.email && canViewOC && !isCompanyAdmin && (
            <button
              onClick={() => navigate("/oc-programs")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/oc-programs" ||
                  (location.pathname.startsWith("/oc-programs/") &&
                    !location.pathname.startsWith("/oc-programs/student/"))
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-emerald-600/20 hover:text-emerald-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="hidden md:inline">OC Programs</span>
            </button>
          )}

            {user?.email && isTutor && (
              <button
                onClick={() => navigate("/late-verifications")}
                disabled={lateVerificationLoading}
                aria-busy={lateVerificationLoading}
                className={`relative flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all disabled:cursor-wait ${
                  location.pathname === "/late-verifications"
                    ? "bg-amber-600 text-white"
                    : showLateVerificationBlink
                      ? "animate-late-nav-blink ring-2 ring-orange-400 ring-offset-2 ring-offset-[#0d1e3a]"
                      : "bg-gray-800 text-gray-300 hover:bg-amber-600/20 hover:text-amber-400"
                } ${lateVerificationLoading ? "opacity-90" : ""}`}
              >
                {lateVerificationLoading ? (
                  <svg
                    className="w-4 h-4 shrink-0 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
                <span className="hidden md:inline">
                  {lateVerificationLoading ? "Loading…" : "Late verifications"}
                </span>
                {!lateVerificationLoading && lateVerificationCount > 0 && (
                  <span
                    className={`inline-flex min-w-[1.35rem] h-[1.35rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white leading-none ${
                      showLateVerificationBlink ? "animate-late-badge-pulse" : ""
                    }`}
                    title={`${lateVerificationCount} pending late verification${lateVerificationCount === 1 ? "" : "s"}`}
                  >
                    {lateVerificationCount > 99 ? "99+" : lateVerificationCount}
                  </span>
                )}
              </button>
            )}

            {/* Assessor late submissions */}
            {user?.email && user?.role === "ASSESSOR" && (
              <button
                onClick={() => navigate("/late-submissions")}
                disabled={lateCountLoading}
                aria-busy={lateCountLoading}
                className={`relative flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all disabled:cursor-wait ${
                  location.pathname === "/late-submissions"
                    ? "bg-amber-600 text-white"
                    : showLateBlink
                      ? "animate-late-nav-blink ring-2 ring-orange-400 ring-offset-2 ring-offset-[#0d1e3a]"
                      : "bg-gray-800 text-gray-300 hover:bg-amber-600/20 hover:text-amber-400"
                } ${lateCountLoading ? "opacity-90" : ""}`}
              >
                {lateCountLoading ? (
                  <svg
                    className="w-4 h-4 shrink-0 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="hidden md:inline">
                  {lateCountLoading ? "Loading…" : "Late submissions"}
                </span>
                {!lateCountLoading && latePendingCount > 0 && (
                  <span
                    className={`inline-flex min-w-[1.35rem] h-[1.35rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white leading-none ${
                      showLateBlink ? "animate-late-badge-pulse" : ""
                    }`}
                    title={`${latePendingCount} pending late assessment${latePendingCount === 1 ? "" : "s"}`}
                  >
                    {latePendingCount > 99 ? "99+" : latePendingCount}
                  </span>
                )}
              </button>
            )}

            {user?.email && user?.role === "ASSESSOR" && (
              <button
                onClick={() => navigate("/assessor-earnings")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/assessor-earnings"
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-green-600/20 hover:text-green-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:inline">Earnings</span>
              </button>
            )}

            {user?.email && user?.role === "ASSESSOR" && (
              <button
                onClick={() => navigate("/assessor-settings")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/assessor-settings"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-amber-600/20 hover:text-amber-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline">Settings</span>
              </button>
            )}

            {user?.email && user?.role === "MODERATOR" && (
            <button
              onClick={() => navigate("/moderator-earnings")}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                location.pathname === "/moderator-earnings"
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-green-600/20 hover:text-green-400"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden md:inline">Earnings</span>
            </button>
          )}

            {user?.email && user?.role === "MODERATOR" && (
            <button
              onClick={() => navigate("/moderation-queue")}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                location.pathname.startsWith("/moderation-queue")
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-violet-600/20 hover:text-violet-300"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="hidden md:inline">Moderation queue</span>
            </button>
          )}

            {user?.email && user?.role === "MODERATOR" && (
              <button
                onClick={() => navigate("/moderator-settings")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  location.pathname === "/moderator-settings"
                    ? "bg-violet-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-violet-600/20 hover:text-violet-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline">Settings</span>
              </button>
            )}
          
            {/* Divider */}
            {user?.email && (
              <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block" />
            )}

            {/* Logout */}
          {user?.email && (
            <button
              onClick={handleLogout}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
