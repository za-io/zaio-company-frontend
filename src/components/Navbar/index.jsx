import React, { useState, useRef, useEffect } from "react";
import logo from "../../assets/img/logo/zaio-logo-light.png";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../../store/UserProvider";

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
  const canViewOC = ["SUPER_ADMIN", "COMPANY_ADMIN", "SUPER_STUDENT_ADMIN", "ASSESSOR", "MODERATOR", "TUTOR"].includes(user?.role);
  const isSuperAdmin = ["SUPER_ADMIN"].includes(user?.role);

  const menuItems = [
    // Program Management
    ...(canManagePrograms ? [
      { label: "New Bootcamp", path: "/program/add", icon: "plus" },
      { label: "Add to Existing", path: "/program/add/exiting", icon: "add" },
      { label: "Manage Bootcamps", path: "/program/manage", icon: "settings" },
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
                <span className="text-gray-300 text-sm font-medium">
                  {user?.company_username}
                </span>
              </div>
            )}
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Management Dropdown */}
            {user?.email && canManagePrograms && menuItems.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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

            {/* Tutor bookings (SUPER_STUDENT_ADMIN) */}
            {user?.email && user?.role === "SUPER_STUDENT_ADMIN" && (
              <button
                onClick={() => navigate("/tutor-bookings-admin")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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

            {/* OC Cohort Button */}
            {user?.email && canManagePrograms && (
              <button
                onClick={() => navigate("/oc-cohort/create")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === "/oc-cohort/create"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-purple-600/20 hover:text-purple-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="hidden md:inline">OC Cohort</span>
              </button>
            )}

            {/* Bootcamps (tutors) - was Analytics */}
            {user?.email && user?.role === "TUTOR" && (
              <button
                onClick={() => navigate("/tutor/analytics")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
            {user?.email && canViewOC && (
              <button
                onClick={() => navigate("/oc-programs")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === "/oc-programs"
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

            {/* Divider */}
            {user?.email && (
              <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block" />
            )}

            {/* Logout */}
            {user?.email && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
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
