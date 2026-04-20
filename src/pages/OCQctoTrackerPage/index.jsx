import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getCohortQctoTracker, getOCCohortDetails } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";
import {
  buildQctoAssessorUrl,
  TRACKER_SA_COL_INDEX,
  TRACKER_WB_COL_INDEX,
} from "./qctoAssessorLinks";

const OCQctoTrackerPage = () => {
  const { cohortId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const viewParam = (searchParams.get("view") || "km").toLowerCase();
  const view = viewParam === "pm" ? "pm" : "km";
  const { user } = useUserStore();
  const assessorReadOnly = user?.role === "TUTOR";

  const [cohortName, setCohortName] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cohortId) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cohortRes, trackerRes] = await Promise.all([
          getOCCohortDetails(cohortId),
          getCohortQctoTracker(cohortId, view),
        ]);
        if (cancelled) return;
        if (cohortRes?.status === 200 && cohortRes?.success && cohortRes.data) {
          setCohortName(cohortRes.data.cohortName || "OC cohort");
        } else {
          setCohortName("OC cohort");
        }
        if (trackerRes?.status === 200 && trackerRes?.success && trackerRes.data) {
          setData(trackerRes.data);
        } else {
          setData(null);
          setError(trackerRes?.message || "Could not load tracker");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Could not load tracker");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [cohortId, view]);

  useEffect(() => {
    const label = view === "km" ? "KM" : "PM";
    document.title = cohortName
      ? `${label} tracker — ${cohortName} · Zaio`
      : `${label} module tracker · Zaio`;
  }, [cohortName, view]);

  return (
    <div className="min-h-screen bg-[#0f1419] px-6 md:px-12 lg:px-24 xl:px-36 py-10">
      <div className="max-w-7xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/oc-programs")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600/80 hover:bg-gray-600 text-gray-200 text-sm font-medium mb-6 transition-colors"
        >
          ← Back to OC Programs
        </button>

        <h1 className="text-2xl font-semibold text-gray-100 mb-1">
          {view === "km" ? "Knowledge modules (KM)" : "Practical modules (PM)"}
        </h1>
        <p className="text-gray-500 text-[15px] mb-8">
          {cohortName ? (
            <>
              Cohort: <span className="text-gray-300">{cohortName}</span>
            </>
          ) : (
            "Loading cohort…"
          )}
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-12">
            <Loader />
            <span>Loading module tracker…</span>
          </div>
        ) : error ? (
          <p className="text-red-400/90">{error}</p>
        ) : !data?.modules?.length ? (
          <p className="text-gray-500 text-[15px]">
            No {view === "km" ? "QCTO-KM" : "QCTO-PM"} modules on this cohort&apos;s learning path, or no
            learners in the cohort.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {view === "km"
                ? "Per knowledge module: learner workbook and summative assessment status for each learner. Click a WB or SA cell to open that item for the learner in the assessor app."
                : "Per practical module: PMT (practical module task) and summative assessment status for each learner. Click a PMT or SA cell to open that item for the learner in the assessor app."}
            </p>
            <div className="space-y-8">
              {data.modules.map((mod) => (
                <div key={mod.courseId} className="rounded-xl border border-gray-700/50 overflow-hidden">
                  <div className="bg-gray-800/40 px-4 py-3 border-b border-gray-700/40">
                    <h2 className="text-sm font-medium text-gray-200">
                      {view === "km" ? "KM" : "PM"} — {mod.name}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[960px]">
                      <thead>
                        <tr className="bg-gray-800/30">
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            Name
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap max-w-[140px]"
                            title={
                              (view === "km" ? "Learner workbook submitted" : "PMT submitted") +
                              " — click a cell below to open in assessor app"
                            }
                          >
                            {view === "km" ? "WB submitted" : "PMT submitted"}
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap max-w-[140px]"
                            title={
                              (view === "km"
                                ? "Learner workbook verified by tutor"
                                : "PMT verified by tutor") +
                              " — click a cell below to open in assessor app"
                            }
                          >
                            {view === "km" ? "WB tutor ✓" : "PMT tutor ✓"}
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            title="Summative assessment submitted — click a cell below to open in assessor app"
                          >
                            SA submitted
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            title="Summative assessment verified by tutor — click a cell below to open in assessor app"
                          >
                            SA tutor ✓
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            title={
                              (view === "km" ? "Learner workbook assessed" : "PMT assessed") +
                              " — click a cell below to open in assessor app"
                            }
                          >
                            {view === "km" ? "WB assessed" : "PMT assessed"}
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            title="Summative assessment assessed — click a cell below to open in assessor app"
                          >
                            SA assessed
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/40">
                        {mod.rows.map((row) => {
                          const flags = [
                            row.learnerWorkbook?.submitted,
                            row.learnerWorkbook?.tutorVerified,
                            row.summativeAssessment?.submitted,
                            row.summativeAssessment?.tutorVerified,
                            row.learnerWorkbook?.assessed,
                            row.summativeAssessment?.assessed,
                          ];
                          const wbTitle =
                            view === "km" ? "Open learner workbook (assessor)" : "Open PMT (assessor)";
                          const saTitle = "Open summative assessment (assessor)";
                          return (
                            <tr key={row.studentId} className="hover:bg-gray-800/20">
                              <td className="px-3 py-3 text-sm text-gray-300">
                                <span className="font-medium">{row.name}</span>
                                <span className="block text-xs text-gray-500 truncate max-w-[220px]">
                                  {row.email}
                                </span>
                              </td>
                              {flags.map((ok, colIdx) => {
                                const ref =
                                  TRACKER_WB_COL_INDEX.has(colIdx)
                                    ? mod.refs?.workbook
                                    : TRACKER_SA_COL_INDEX.has(colIdx)
                                      ? mod.refs?.summative
                                      : null;
                                const url = ref
                                  ? buildQctoAssessorUrl(ref, row.studentId, assessorReadOnly)
                                  : null;
                                const label = TRACKER_WB_COL_INDEX.has(colIdx) ? wbTitle : saTitle;
                                const inner = (
                                  <span
                                    className={
                                      ok ? "text-emerald-400/95 font-medium" : "text-gray-500"
                                    }
                                  >
                                    {ok ? "Yes" : "—"}
                                  </span>
                                );
                                if (!url) {
                                  return (
                                    <td key={colIdx} className="px-3 py-3 text-sm">
                                      {inner}
                                    </td>
                                  );
                                }
                                return (
                                  <td key={colIdx} className="px-3 py-3 text-sm">
                                    <button
                                      type="button"
                                      title={label}
                                      className="text-left w-full min-h-[2rem] rounded px-1 -mx-1 py-0.5 text-inherit hover:underline hover:bg-gray-800/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/80 cursor-pointer"
                                      onClick={() =>
                                        window.open(url, "_blank", "noopener,noreferrer")
                                      }
                                    >
                                      {inner}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OCQctoTrackerPage;
