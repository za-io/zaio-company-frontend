import React, { useState, useEffect } from "react";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";

// Mock data for development - replace with actual API calls
const mockSessions = [
  {
    id: "1",
    learnerEmail: "john.doe@example.com",
    learnerName: "John Doe",
    startTime: "2024-01-15T10:30:00Z",
    endTime: "2024-01-15T11:30:00Z",
    duration: 60, // in minutes
    status: "completed",
    subject: "React Hooks and State Management",
    notes: "Student had difficulty understanding useEffect dependencies. Provided examples and practice exercises.",
    rating: 4.5,
    feedback: "Very helpful session, cleared up my confusion about hooks!"
  },
  {
    id: "2",
    learnerEmail: "jane.smith@example.com",
    learnerName: "Jane Smith",
    startTime: "2024-01-14T14:00:00Z",
    endTime: "2024-01-14T15:15:00Z",
    duration: 75,
    status: "completed",
    subject: "JavaScript Async/Await",
    notes: "Covered promises, async/await patterns, and error handling. Student made good progress.",
    rating: 5.0,
    feedback: "Excellent explanation of async concepts!"
  },
  {
    id: "3",
    learnerEmail: "mike.wilson@example.com",
    learnerName: "Mike Wilson",
    startTime: "2024-01-13T09:00:00Z",
    endTime: null,
    duration: 0,
    status: "cancelled",
    subject: "CSS Grid Layout",
    notes: "Session cancelled by student due to technical issues.",
    rating: null,
    feedback: null
  },
  {
    id: "4",
    learnerEmail: "sarah.johnson@example.com",
    learnerName: "Sarah Johnson",
    startTime: "2024-01-12T16:00:00Z",
    endTime: "2024-01-12T17:00:00Z",
    duration: 60,
    status: "completed",
    subject: "Node.js API Development",
    notes: "Worked on REST API endpoints and middleware. Student understood concepts well.",
    rating: 4.0,
    feedback: "Good session, helped me understand API structure better."
  },
  {
    id: "5",
    learnerEmail: "alex.brown@example.com",
    learnerName: "Alex Brown",
    startTime: "2024-01-11T11:00:00Z",
    endTime: "2024-01-11T12:30:00Z",
    duration: 90,
    status: "completed",
    subject: "Database Design and SQL",
    notes: "Covered database normalization, relationships, and complex queries. Student showed improvement.",
    rating: 4.8,
    feedback: "Really helped me understand database relationships!"
  }
];

const SupportSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, completed, cancelled, upcoming
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useUserStore();

  useEffect(() => {
    // Simulate API call
    const fetchSessions = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual API call
        // const response = await getSupportSessions({ tutorId: user._id });
        // setSessions(response.data);
        
        // Using mock data for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSessions(mockSessions);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSessions();
    }
  }, [user]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      upcoming: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800"
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig[status] || "bg-gray-100 text-gray-800"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredSessions = sessions.filter(session => {
    const matchesFilter = filter === "all" || session.status === filter;
    const matchesSearch = session.learnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.learnerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;
  const averageRating = sessions.filter(s => s.rating).reduce((acc, s) => acc + s.rating, 0) / sessions.filter(s => s.rating).length || 0;
  const totalDuration = sessions.filter(s => s.status === "completed").reduce((acc, s) => acc + s.duration, 0);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="px-36 py-12 bg-[#0d1e3a] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Support Sessions</h1>
          <p className="text-gray-300">Manage and view all your tutor support sessions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Sessions</p>
                <p className="text-2xl font-bold text-white">{totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-white">{completedSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Avg Rating</p>
                <p className="text-2xl font-bold text-white">{averageRating.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Hours</p>
                <p className="text-2xl font-bold text-white">{Math.round(totalDuration / 60)}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  filter === "all" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                All Sessions
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  filter === "completed" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setFilter("cancelled")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  filter === "cancelled" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Cancelled
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-300">No sessions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? "Try adjusting your search terms." : "You haven't conducted any support sessions yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Learner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">{session.learnerName}</div>
                          <div className="text-sm text-gray-400">{session.learnerEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{session.subject}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {formatDate(session.startTime)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatTime(session.startTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {session.duration > 0 ? `${session.duration} min` : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(session.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.rating ? (
                          <div className="flex items-center">
                            <span className="text-sm text-gray-300 mr-1">{session.rating}</span>
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-purple-400 hover:text-purple-300 mr-4">
                          View Details
                        </button>
                        {session.status === "completed" && (
                          <button className="text-blue-400 hover:text-blue-300">
                            View Notes
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportSessions;

