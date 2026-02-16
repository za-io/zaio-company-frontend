import React, { useState, useEffect } from "react";
import { getMyTutorReviews } from "../../api/company";
import Loader from "../../components/loader/loader";

const formatSessionDate = (dateStr) =>
  new Date(dateStr).toLocaleString("en-GB", {
    timeZone: "Africa/Harare",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatReviewedAt = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-GB", {
    timeZone: "Africa/Harare",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const joinedLabel = (v) => {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  if (v === "no_show") return "He didn't rock up at all";
  return v || "—";
};

const PAGE_SIZE = 10;
const STAR_FILTER_OPTIONS = [
  { value: "all", label: "All stars" },
  { value: 5, label: "5 stars" },
  { value: 4, label: "4 stars" },
  { value: 3, label: "3 stars" },
  { value: 2, label: "2 stars" },
  { value: 1, label: "1 star" },
];

const Stars = ({ rating }) => {
  if (rating == null || rating < 1 || rating > 5) return null;
  const full = Math.floor(rating);
  const empty = 5 - full;
  return (
    <span className="flex items-center gap-0.5 text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: full }, (_, i) => (
        <span key={`f-${i}`} className="text-lg">★</span>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e-${i}`} className="text-lg text-gray-500">☆</span>
      ))}
      <span className="text-gray-400 text-sm ml-1">({rating}/5)</span>
    </span>
  );
};

export default function MyReviews() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [starFilter, setStarFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyTutorReviews()
      .then((res) => {
        if (cancelled) return;
        setReviews(Array.isArray(res?.reviews) ? res.reviews : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredReviews =
    starFilter === "all"
      ? reviews
      : reviews.filter((r) => r.rating != null && r.rating === Number(starFilter));

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const paginatedReviews = filteredReviews.slice(start, start + PAGE_SIZE);

  const handleFilterChange = (value) => {
    setStarFilter(value);
    setCurrentPage(1);
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Reviews</h1>
      <p className="text-gray-400 mb-6">
        Feedback from students after their sessions with you.
      </p>

      {reviews.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="text-gray-500 text-sm">Filter by rating:</span>
          <div className="flex flex-wrap gap-2">
            {STAR_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFilterChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  starFilter === opt.value
                    ? "bg-amber-500/30 text-amber-400 border border-amber-500/50"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredReviews.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
          <p className="text-gray-400">
            {reviews.length === 0
              ? "No reviews yet. Reviews appear here after students complete a session and submit feedback."
              : `No reviews with ${starFilter === "all" ? "any" : starFilter + " star(s)"} rating.`}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {paginatedReviews.map((r) => (
            <li
              key={r._id}
              className="p-5 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                <div>
                  <p className="text-white font-medium">
                    {r.studentId?.username || r.studentId?.email || "Student"}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Session: {formatSessionDate(r.start)}
                  </p>
                  {r.learningPathId?.learningpathname && (
                    <p className="text-gray-400 text-sm mt-0.5">Bootcamp: {r.learningPathId.learningpathname}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    Reviewed on {formatReviewedAt(r.reviewedAt)}
                  </p>
                </div>
                <Stars rating={r.rating} />
              </div>
              <dl className="grid gap-2 text-sm">
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-gray-500">Joined on time:</span>
                  <span className="text-white font-medium">{joinedLabel(r.joinedOnTime)}</span>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-gray-500">Session helpful:</span>
                  <span className="text-white font-medium">{r.sessionHelpful === "yes" ? "Yes" : r.sessionHelpful === "no" ? "No" : "—"}</span>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-gray-500">Would book again:</span>
                  <span className="text-white font-medium">{r.wouldBookAgain === "yes" ? "Yes" : r.wouldBookAgain === "no" ? "No" : "—"}</span>
                </div>
                {r.reviewComments && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <span className="text-gray-500 block mb-1">Comments:</span>
                    <p className="text-gray-300 whitespace-pre-wrap">{r.reviewComments}</p>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, filteredReviews.length)} of {filteredReviews.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-gray-400"
              >
                Previous
              </button>
              <span className="text-gray-400 text-sm px-2">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-gray-400"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
