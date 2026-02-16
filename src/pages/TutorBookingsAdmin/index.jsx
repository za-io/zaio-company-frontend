import React, { useState, useEffect, useMemo } from "react";
import { getAdminTutorBookings } from "../../api/company";
import Loader from "../../components/loader/loader";

const formatDateTime = (dateStr) =>
  new Date(dateStr).toLocaleString("en-GB", {
    timeZone: "Africa/Harare",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const joinedLabel = (v) => {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  if (v === "no_show") return "No show";
  return "—";
};

function ReviewCell({ b }) {
  if (!b.reviewedAt) return <span className="text-gray-500 text-sm">—</span>;
  const lines = [];
  if (b.rating != null && b.rating >= 1 && b.rating <= 5) {
    lines.push(`${"★".repeat(b.rating)}${"☆".repeat(5 - b.rating)} (${b.rating}/5)`);
  }
  lines.push(`Joined on time: ${joinedLabel(b.joinedOnTime)}`);
  lines.push(`Helpful: ${b.sessionHelpful === "yes" ? "Yes" : b.sessionHelpful === "no" ? "No" : "—"}`);
  lines.push(`Would book again: ${b.wouldBookAgain === "yes" ? "Yes" : b.wouldBookAgain === "no" ? "No" : "—"}`);
  if (b.reviewComments) lines.push(`Comments: ${b.reviewComments}`);
  return (
    <div className="text-sm text-gray-300 space-y-0.5 max-w-xs">
      {lines.map((line, i) => (
        <div key={i} className="truncate" title={line}>{line}</div>
      ))}
    </div>
  );
}

function toDateOnly(dateStr) {
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
}

export default function TutorBookingsAdmin() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filterTutorId, setFilterTutorId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminTutorBookings()
      .then((res) => {
        if (cancelled) return;
        setBookings(Array.isArray(res?.bookings) ? res.bookings : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const tutors = useMemo(() => {
    const map = new Map();
    (bookings || []).forEach((b) => {
      if (b.tutorId?._id) {
        const id = b.tutorId._id.toString();
        if (!map.has(id)) {
          map.set(id, { id, label: b.tutorId.company_username || b.tutorId.email || id });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [bookings]);

  const dateFilteredBookings = useMemo(() => {
    let list = bookings;
    if (filterDateFrom) {
      list = list.filter((b) => toDateOnly(b.start) >= filterDateFrom);
    }
    if (filterDateTo) {
      list = list.filter((b) => toDateOnly(b.start) <= filterDateTo);
    }
    return list;
  }, [bookings, filterDateFrom, filterDateTo]);

  const filteredBookings = useMemo(() => {
    if (!filterTutorId) return dateFilteredBookings;
    return dateFilteredBookings.filter((b) => b.tutorId?._id?.toString() === filterTutorId);
  }, [dateFilteredBookings, filterTutorId]);

  const bookingsPerTutor = useMemo(() => {
    const counts = new Map();
    dateFilteredBookings.forEach((b) => {
      if (b.tutorId?._id) {
        const id = b.tutorId._id.toString();
        const label = b.tutorId.company_username || b.tutorId.email || id;
        counts.set(id, { id, label, count: (counts.get(id)?.count ?? 0) + 1 });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [dateFilteredBookings]);

  if (loading) return <Loader />;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Tutor bookings</h1>
      <p className="text-gray-400 mb-4">
        All one-on-one tutor session bookings across students and tutors.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {bookings.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <label className="text-gray-500 text-sm">Filter by tutor:</label>
              <select
                value={filterTutorId}
                onChange={(e) => setFilterTutorId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500 min-w-[180px]"
              >
                <option value="">All tutors</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <span className="text-gray-500 text-sm">Date from:</span>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-gray-500 text-sm">to:</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500"
              />
              {(filterTutorId || filterDateFrom || filterDateTo) && (
                <span className="text-gray-500 text-sm">
                  {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {filteredBookings.length === 0 ? (
            <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
              <p className="text-gray-400">
                {bookings.length === 0
                  ? "No tutor bookings yet."
                  : "No bookings match the selected filters."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-sm font-semibold text-gray-300">Date & time</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-300">Student</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-300">Bootcamp</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-300">Tutor</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-300">Meet link</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-300">Review</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b._id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white text-sm whitespace-nowrap">
                      {formatDateTime(b.start)}
                    </td>
                    <td className="px-4 py-3 text-white text-sm">
                      {b.studentId?.username || b.studentId?.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {b.learningPathId?.learningpathname || "—"}
                    </td>
                    <td className="px-4 py-3 text-white text-sm">
                      {b.tutorId?.company_username || b.tutorId?.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm capitalize px-2 py-0.5 rounded ${
                        b.status === "scheduled" ? "bg-emerald-500/20 text-emerald-400" :
                        b.status === "completed" ? "bg-gray-500/20 text-gray-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {b.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.meetLink ? (
                        <a
                          href={b.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm"
                        >
                          Join
                        </a>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ReviewCell b={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          )}
        </div>

        {bookings.length > 0 && (
          <aside className="lg:w-64 flex-shrink-0">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sticky top-4">
              <h2 className="text-sm font-semibold text-white mb-3">Bookings per tutor</h2>
              {filterDateFrom || filterDateTo ? (
                <p className="text-gray-500 text-xs mb-3">
                  In selected date range
                </p>
              ) : null}
              <ul className="space-y-2">
                {bookingsPerTutor.map(({ id, label, count }) => (
                  <li
                    key={id}
                    className={`flex justify-between items-center text-sm py-1.5 px-2 rounded ${
                      filterTutorId === id ? "bg-amber-500/20 text-amber-400" : "text-gray-300"
                    }`}
                  >
                    <span className="truncate mr-2" title={label}>{label}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm font-medium text-white">
                <span>Total</span>
                <span className="tabular-nums">{dateFilteredBookings.length}</span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
