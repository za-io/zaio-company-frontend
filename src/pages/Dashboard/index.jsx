import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllBootcamps, getAllOCCohorts } from "../../api/company";
import { searchStudents } from "../../api/student";
import Loader from "../../components/loader/loader";
import ActiveBootcampsTable from "../../components/ActiveBootcamps/ActiveBootcampsTable";
import { useProgramStore } from "../../store/programStore";
import { useUserStore } from "../../store/UserProvider";
import { CompanyAppRoles } from "../../utils/appUtils";

// Student Search Component with enhanced styling
const StudentSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    const result = await searchStudents(query);
    if (result?.success) {
      setSearchResults(result.users || []);
      setShowDropdown(true);
    }
    setSearching(false);
  };

  const handleSelectStudent = (userId) => {
    setShowDropdown(false);
    setSearchQuery("");
    navigate(`/student-profile/${userId}`);
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search student by email or name..."
          className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 text-lg"
        />
        {searching && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
          </div>
        )}
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
    
    if (user?.role === "SUPER_STUDENT_ADMIN" || (bootcamps && !ocCohorts) || (!bootcamps && ocCohorts) || !user?._id) return;
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

      {user?.role === "SUPER_STUDENT_ADMIN" && (
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-white mb-1">Student Management</h1>
            <p className="text-gray-400">Search and manage student profiles, view bootcamp progress</p>
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
                <p className="text-sm text-gray-400">Search by email or name to view their profile</p>
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

      {!["SUPER_STUDENT_ADMIN", "TUTOR"]?.includes(user?.role) && (
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
          {/* <h1 className="text-4xl font-bold text-gray-100">Bootcamps:</h1>
          {user?.bootcamps?.length > 0 && (
            <div className="grid grid-cols-3 gap-16 mt-12">
              {user?.bootcamps?.map((program) => (
                <div
                  key={program.id}
                  className="flex flex-col w-full h-full bg-gray-200 rounded-xl"
                >
                  <div className="p-2 flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-bold mt-2">
                      {program.bootcampName}
                    </h1>

                    <Link
                      to={`/student/analytics?bootcamp=${program._id}`}
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
              ))}
            </div>
          )} */}
          <Link
            to={"/tutor/analytics"}
            className="bg-blue-500 ms-4 px-12 py-3 rounded font-medium text-white"
          >
            Analytics
          </Link>
        </>
      )}

      {loading && <Loader />}
    </div>
  );
};

export default Dashboard;
