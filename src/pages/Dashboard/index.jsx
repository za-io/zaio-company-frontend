import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAllBootcamps,
  getAllOCCohorts,
  getMyTutorBookings,
  getTutorClassroomConnectionStatus,
  getTutorClassroomSubmissions,
} from "../../api/company";
import { searchStudents } from "../../api/student";
import Loader from "../../components/loader/loader";
import ActiveBootcampsTable from "../../components/ActiveBootcamps/ActiveBootcampsTable";
import { useProgramStore } from "../../store/programStore";
import { useUserStore } from "../../store/UserProvider";
import { CompanyAppRoles } from "../../utils/appUtils";

// Student Search Component with enhanced styling
const DEBOUNCE_MS = 300;

const SEARCH_TYPES = { email: "email", student_number: "student_number" };

const StudentSearch = () => {
  const [searchType, setSearchType] = useState(SEARCH_TYPES.student_number);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const latestQueryRef = useRef("");
  const runSearch = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const q = query.trim();
    setSearching(true);
    const result = await searchStudents(q, searchType);
    if (latestQueryRef.current === q && result?.success) {
      setSearchResults(result.users || []);
      setShowDropdown(true);
    }
    setSearching(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    latestQueryRef.current = query;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);
  useEffect(() => {
    if (searchQuery.trim().length >= 3) {
      runSearch(searchQuery);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchType]);

  const handleSelectStudent = (userId) => {
    setShowDropdown(false);
    setSearchQuery("");
    navigate(`/student-profile/${userId}`);
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm font-medium cursor-pointer"
        >
          <option value={SEARCH_TYPES.email} className="bg-[#161B22] text-white">Search by email or name</option>
          <option value={SEARCH_TYPES.student_number} className="bg-[#161B22] text-white">Search by student number</option>
        </select>
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchType === SEARCH_TYPES.student_number ? "Enter student number..." : "Enter email or name..."}
            className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 text-lg"
          />
        {searching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Search Results Dropdown - high z-index so it appears above table */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-[100] w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-72 overflow-y-auto shadow-lg">
          {searchResults.map((user, idx) => (
            <div
              key={user._id}
              onClick={() => handleSelectStudent(user._id)}
              className={`px-5 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 ${idx !== searchResults.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {user.username?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{user.username}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    {user.studentNumber && (
                      <p className="text-xs text-gray-400">#{user.studentNumber}</p>
                    )}
                  </div>
                </div>
                {user.accBlocked && (
                  <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full">Blocked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showDropdown && searchResults.length === 0 && searchQuery.length >= 3 && !searching && (
        <div className="absolute z-[100] w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 shadow-lg">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">No students found for "{searchQuery}"</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Tutor: group upcoming bookings into today, tomorrow, rest of week
const TIMEZONE = "Africa/Harare";
const formatBookingTime = (dateStr) =>
  new Date(dateStr).toLocaleString("en-GB", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const OVERDUE_HOURS = 48;
const IN_TALKS_EXTRA_DAYS = 3;

function bucketBookings(upcoming) {
  const list = upcoming || [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const today = list.filter((b) => {
    const start = new Date(b.start);
    return start >= todayStart && start < tomorrowStart;
  });
  const tomorrow = list.filter((b) => {
    const start = new Date(b.start);
    return start >= tomorrowStart && start < tomorrowEnd;
  });
  const restOfWeek = list.filter((b) => {
    const start = new Date(b.start);
    return start >= tomorrowEnd;
  });
  return { today, tomorrow, restOfWeek };
}

const TutorAssignmentStats = () => {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [urgent, setUrgent] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTutorClassroomConnectionStatus()
      .then((res) => {
        if (cancelled || !res?.connected) {
          setConnected(false);
          setTotal(0);
          setUrgent(0);
          return;
        }
        setConnected(true);
        return getTutorClassroomSubmissions();
      })
      .then((res) => {
        if (cancelled || !res?.data) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setTotal(list.length);
        const extraMs = IN_TALKS_EXTRA_DAYS * 24 * 60 * 60 * 1000;
        const deadlineMs = OVERDUE_HOURS * 60 * 60 * 1000;
        const urgentCount = list.filter((item) => {
          const submittedAt = item.assignment?.submittedAt;
          if (!submittedAt) return false;
          const extra = item.inTalks ? extraMs : 0;
          return new Date(submittedAt).getTime() + deadlineMs + extra < Date.now();
        }).length;
        setUrgent(urgentCount);
      })
      .catch(() => {
        if (!cancelled) setTotal(0);
        setUrgent(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loading && !connected) return null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-32 mb-3" />
          <div className="h-8 bg-white/10 rounded w-16" />
        </div>
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-40 mb-3" />
          <div className="h-8 bg-white/10 rounded w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      <Link
        to="/tutor/analytics?q=markings"
        className="block p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Assignments to mark</p>
            <p className="text-2xl font-bold text-white">{total}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        </div>
      </Link>
      <Link
        to="/tutor/analytics?q=markings"
        className="block p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Need urgent attention</p>
            <p className={`text-2xl font-bold ${urgent > 0 ? "text-amber-400" : "text-white"}`}>{urgent}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${urgent > 0 ? "bg-amber-500/20" : "bg-gray-500/20"}`}>
            <svg className={`w-6 h-6 ${urgent > 0 ? "text-amber-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        {urgent > 0 && (
          <p className="text-amber-400/80 text-xs mt-2">Not marked within 48 hours of submission</p>
        )}
      </Link>
    </div>
  );
};

const TutorDashboardBookings = () => {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState({ today: [], tomorrow: [], restOfWeek: [] });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyTutorBookings()
      .then((res) => {
        if (cancelled || !res?.success) return;
        const upcoming = Array.isArray(res.upcoming) ? res.upcoming : [];
        setBookings(bucketBookings(upcoming));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const BookingCard = ({ b }) => (
    <div className="flex justify-between items-start flex-wrap gap-2 p-4 rounded-xl bg-white/5 border border-white/10">
      <div>
        <p className="text-white font-medium">{b.studentId?.username || b.studentId?.email || "Student"}</p>
        <p className="text-gray-500 text-sm">{formatBookingTime(b.start)}</p>
        {b.learningPathId?.learningpathname && (
          <p className="text-gray-400 text-sm mt-0.5">Bootcamp: {b.learningPathId.learningpathname}</p>
        )}
      </div>
      {b.meetLink && (
        <a href={b.meetLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm font-medium whitespace-nowrap">
          Join meeting
        </a>
      )}
    </div>
  );

  if (loading) return <Loader />;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-1">My bookings</h1>
      <p className="text-gray-400 mb-6">Your scheduled sessions for today, tomorrow and the rest of the week.</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Today</h2>
        {bookings.today.length === 0 ? (
          <p className="text-gray-500 text-sm">No sessions today.</p>
        ) : (
          <ul className="space-y-2">
            {bookings.today.map((b) => (
              <li key={b._id}><BookingCard b={b} /></li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Tomorrow</h2>
        {bookings.tomorrow.length === 0 ? (
          <p className="text-gray-500 text-sm">No sessions tomorrow.</p>
        ) : (
          <ul className="space-y-2">
            {bookings.tomorrow.map((b) => (
              <li key={b._id}><BookingCard b={b} /></li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Rest of the week</h2>
        {bookings.restOfWeek.length === 0 ? (
          <p className="text-gray-500 text-sm">No other sessions this week.</p>
        ) : (
          <ul className="space-y-2">
            {bookings.restOfWeek.map((b) => (
              <li key={b._id}><BookingCard b={b} /></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const Program = ({ program }) => {
  return (
    <div
      key={program.id}
      className="flex flex-col w-full h-full bg-gray-200 rounded-xl"
    >
      {/* <img src={programImg} alt="programImg" /> */}
      <div className="p-2 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mt-2">{program.bootcampName}</h1>
        {/* <h1 className="text-2xl text-gray-500 mt-2">
          {program.description || "No desc"}
        </h1> */}
        <Link
          to={`/program/${program._id}`}
          state={{
            program,
          }}
          className="w-full"
        >
          <button className="bg-blue-700 w-full py-2 rounded-xl mt-2 text-gray-100">
            View Users
          </button>
        </Link>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [bootcamps, setBootcamps] = useState(null);
  const [ocCohorts, setOcCohorts] = useState(null);
  const [loading, setLoading] = useState(false);
  const setPrograms = useProgramStore((state) => state.setPrograms);
  const { user } = useUserStore();
  const navigate = useNavigate();

  const init = () => {
    setLoading(true);
    
    // For ASSESSOR and MODERATOR, fetch OC cohorts instead of bootcamps
    if (user?.role === "ASSESSOR" || user?.role === "MODERATOR") {
      getAllOCCohorts()
        .then((res) => {
          console.log(res);
          if (res?.status === 200 && res?.success) {
            setOcCohorts(res?.data || []);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // For other roles, fetch bootcamps
      getAllBootcamps({
        company_id: user?._id,
      })
        .then((res) => {
          console.log(res);
          if (res?.status === 200) {
            setBootcamps(res?.allBootcamps);
            setPrograms(res?.allBootcamps);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };
  
  useEffect(() => {
    // Redirect assessors and moderators directly to OC Programs page
    if (user?.role === "ASSESSOR" || user?.role === "MODERATOR") {
      navigate("/oc-programs");
      return;
    }
    
    // Students see their enrolled bootcamps via ActiveBootcampsTable - no need to call init()
    if (user?.role === CompanyAppRoles.STUDENT) {
      return;
    }
    
    if (
      ["SUPER_STUDENT_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(user?.role) ||
      (bootcamps && !ocCohorts) ||
      (!bootcamps && ocCohorts) ||
      !user?._id
    ) {
      return;
    }
    if (user?.role === CompanyAppRoles.STUDENT_SUCCESS_MANAGER) {
      navigate("/ssm/tutor/all");
    }
    init();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="px-36 py-12">
      {/* Student Dashboard - Show enrolled bootcamps */}
      {user?.role === CompanyAppRoles.STUDENT && (
        <ActiveBootcampsTable />
      )}

      {["SUPER_STUDENT_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(user?.role) && (
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="mb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Student Management</h1>
              <p className="text-gray-400">Search and manage student profiles, open a bootcamp for full analytics</p>
            </div>
            {user?.role !== "COMPANY_ADMIN" && (
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  to="/finance"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm border border-white/10 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Finance
                </Link>
                <Link
                  to="/roster-payment-check"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600/80 to-indigo-600/80 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm border border-white/10 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Roster vs plans
                </Link>
                <Link
                  to="/roster-tasks"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600/70 to-orange-600/70 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm border border-white/10 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Roster tasks
                </Link>
              </div>
            )}
          </div>

          {/* Student Search Card - relative z-20 so dropdown stacks above table below */}
          <div className="relative z-20 overflow-visible bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Find a Student</h2>
                <p className="text-sm text-gray-400">Select search type, then enter email/name or student number</p>
              </div>
            </div>
            <StudentSearch />
          </div>
          
          {/* Bootcamps Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Active Bootcamps</h2>
                <p className="text-sm text-gray-400">View and manage all bootcamp programs</p>
              </div>
            </div>
            <ActiveBootcampsTable />
          </div>
        </div>
      )}

      {!["SUPER_STUDENT_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN", "TUTOR"]?.includes(user?.role) && (
        <>
          <h1 className="text-4xl font-bold text-gray-100">
            {["ASSESSOR", "MODERATOR"]?.includes(user?.role) ? "My OC Programs" : "My Programs"}
          </h1>
          
          {/* Show OC Cohorts for Assessors and Moderators */}
          {["ASSESSOR", "MODERATOR"]?.includes(user?.role) && (
            <>
              {ocCohorts?.length > 0 && (
                <div className="grid grid-cols-3 gap-16 mt-12">
                  {ocCohorts?.map((cohort) => (
                    <div
                      key={cohort._id}
                      className="flex flex-col w-full h-full bg-gray-200 rounded-xl"
                    >
                      <div className="p-2 flex flex-col items-center justify-center">
                        <h1 className="text-4xl font-bold mt-2">{cohort.cohortName}</h1>
                        <p className="text-lg text-gray-600 mt-2">
                          {cohort.learningPathName || "N/A"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {cohort.studentCount || 0} Students
                        </p>
                        <button
                          onClick={() => navigate("/oc-programs")}
                          className="bg-blue-700 w-full py-2 rounded-xl mt-2 text-gray-100"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && ocCohorts?.length === 0 && (
                <div className="mt-4">
                  <p className="text-xl text-center text-gray-100">
                    No OC Programs assigned to you yet
                  </p>
                  <button
                    onClick={() => navigate("/oc-programs")}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium mt-4 mx-auto block"
                  >
                    View OC Programs
                  </button>
                </div>
              )}
            </>
          )}

          {/* Show Bootcamps for other roles */}
          {!["ASSESSOR", "MODERATOR"]?.includes(user?.role) && (
            <>
              {bootcamps?.length > 0 && (
                <div className="grid grid-cols-3 gap-16 mt-12">
                  {bootcamps?.map((program) => (
                    <Program program={program} />
                  ))}
                </div>
              )}

              {!loading && bootcamps?.length === 0 && (
                <div className="mt-4">
                  <p className="text-xl text-center text-gray-100">
                    No Bootcamps found for {user?.company_name}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {["TUTOR"]?.includes(user?.role) && (
        <>
          <TutorAssignmentStats />
          <TutorDashboardBookings />
        </>
      )}

      {loading && <Loader />}
    </div>
  );
};

export default Dashboard;
