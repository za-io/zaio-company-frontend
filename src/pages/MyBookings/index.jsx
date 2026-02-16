import React, { useState, useEffect } from "react";
import { getMyTutorBookings } from "../../api/company";
import Loader from "../../components/loader/loader";

const formatDateTime = (dateStr) =>
  new Date(dateStr).toLocaleString("en-GB", {
    timeZone: "Africa/Harare",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

export default function MyBookings() {
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);
  const [completed, setCompleted] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyTutorBookings();
      if (res?.success) {
        setUpcoming(Array.isArray(res.upcoming) ? res.upcoming : []);
        setCompleted(Array.isArray(res.completed) ? res.completed : []);
      }
    } catch (e) {
      setUpcoming([]);
      setCompleted([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">My bookings</h1>
      <p className="text-gray-400 mb-6">
        Upcoming sessions and completed tutor bookings. Use the link to join the meeting when it’s time.
      </p>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming sessions.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((b) => (
              <li key={b._id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <p className="text-white font-medium">
                      {b.studentId?.username || b.studentId?.email || "Student"}
                    </p>
                    <p className="text-gray-500 text-sm">{formatDateTime(b.start)}</p>
                    {b.learningPathId?.learningpathname && (
                      <p className="text-gray-400 text-sm mt-0.5">Bootcamp: {b.learningPathId.learningpathname}</p>
                    )}
                  </div>
                  {b.meetLink && (
                    <a
                      href={b.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-sm font-medium whitespace-nowrap"
                    >
                      Join meeting
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Completed</h2>
        {completed.length === 0 ? (
          <p className="text-gray-500 text-sm">No completed sessions yet.</p>
        ) : (
          <ul className="space-y-2">
            {completed.map((b) => (
              <li
                key={b._id}
                className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10 opacity-80"
              >
                <div>
                  <p className="text-white">
                    {b.studentId?.username || b.studentId?.email || "Student"}
                  </p>
                  <p className="text-gray-500 text-sm">{formatDateTime(b.start)}</p>
                  {b.learningPathId?.learningpathname && (
                    <p className="text-gray-400 text-sm mt-0.5">Bootcamp: {b.learningPathId.learningpathname}</p>
                  )}
                </div>
                <span className="text-gray-500 text-sm capitalize">{b.status || "completed"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
