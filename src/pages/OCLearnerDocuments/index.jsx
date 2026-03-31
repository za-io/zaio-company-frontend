import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCohortLearnerPoeDocuments } from "../../api/company";
import Loader from "../../components/loader/loader";

const DOC_LABELS = {
  certifiedIdCopy: "Certified ID copy",
  cv: "CV",
  highestQualifications: "Highest qualifications",
};

function formatUploadedAt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function DocumentCell({ doc, label }) {
  if (!doc?.hasFile || !doc.signedUrl) {
    return (
      <div className="text-gray-500 text-sm">
        <span className="sr-only">{label}: </span>—
      </div>
    );
  }
  const dateStr = formatUploadedAt(doc.uploadedAt);
  return (
    <div className="space-y-1">
      <a
        href={doc.signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400/95 hover:text-blue-300 text-sm font-medium underline-offset-2 hover:underline"
      >
        Open
      </a>
      {doc.fileName && (
        <p className="text-xs text-gray-500 truncate max-w-[200px]" title={doc.fileName}>
          {doc.fileName}
        </p>
      )}
      {dateStr && <p className="text-xs text-gray-600">{dateStr}</p>}
    </div>
  );
}

const OCLearnerDocuments = () => {
  const { cohortId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!cohortId) {
      navigate("/oc-programs");
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getCohortLearnerPoeDocuments(cohortId);
        if (cancelled) return;
        if (res?.success && res.data) {
          setPayload(res.data);
        } else {
          setError(res?.message || "Could not load documents.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || err?.message || "Could not load documents."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [cohortId, navigate]);

  const cohort = payload?.cohort;
  const learners = payload?.learners || [];

  return (
    <div className="min-h-screen bg-[#0f1419] px-6 md:px-12 lg:px-24 xl:px-36 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <button
            type="button"
            onClick={() => navigate("/oc-programs")}
            className="text-sm text-gray-500 hover:text-gray-300 mb-3 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to OC Programs
          </button>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-100 tracking-tight">
            Learner POE documents
          </h1>
          {cohort && (
            <p className="text-gray-400 mt-2 text-[15px]">
              <span className="text-gray-200 font-medium">{cohort.cohortName}</span>
              {cohort.learningPathName && (
                <span className="text-gray-500"> · {cohort.learningPathName}</span>
              )}
            </p>
          )}
          <p className="text-gray-500 text-sm mt-2 max-w-2xl">
            Portfolio of Evidence (POE) uploads: certified ID copy, CV, and highest qualifications. Links are
            time-limited for security.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader />
          <p className="text-gray-500 mt-4">Loading documents…</p>
        </div>
      ) : error ? (
        <div className="bg-[#1c2128] border border-red-800/40 rounded-xl p-6 max-w-2xl">
          <p className="text-red-400/95">{error}</p>
        </div>
      ) : learners.length === 0 ? (
        <div className="bg-[#1c2128] rounded-2xl border border-gray-700/50 p-10 text-center text-gray-500">
          No learners in this cohort yet.
        </div>
      ) : (
        <>
          <div className="hidden lg:block bg-[#1c2128] rounded-2xl border border-gray-700/50 overflow-hidden shadow-xl shadow-black/10">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-800/40">
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Learner
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {DOC_LABELS.certifiedIdCopy}
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {DOC_LABELS.cv}
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {DOC_LABELS.highestQualifications}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40">
                  {learners.map((row) => (
                    <tr key={row.studentId || row.enrollmentId} className="hover:bg-gray-800/30">
                      <td className="px-5 py-4 text-sm text-gray-100 font-medium">{row.name}</td>
                      <td className="px-5 py-4 text-sm text-gray-400">{row.email || "—"}</td>
                      <td className="px-5 py-4 align-top">
                        <DocumentCell doc={row.documents?.certifiedIdCopy} label={DOC_LABELS.certifiedIdCopy} />
                      </td>
                      <td className="px-5 py-4 align-top">
                        <DocumentCell doc={row.documents?.cv} label={DOC_LABELS.cv} />
                      </td>
                      <td className="px-5 py-4 align-top">
                        <DocumentCell
                          doc={row.documents?.highestQualifications}
                          label={DOC_LABELS.highestQualifications}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:hidden space-y-4">
            {learners.map((row) => (
              <div
                key={row.studentId || row.enrollmentId}
                className="bg-[#1c2128] rounded-xl border border-gray-700/50 p-5"
              >
                <p className="text-gray-100 font-medium">{row.name}</p>
                <p className="text-sm text-gray-500 mb-4">{row.email || "—"}</p>
                <div className="space-y-4">
                  {(["certifiedIdCopy", "cv", "highestQualifications"]).map((key) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        {DOC_LABELS[key]}
                      </p>
                      <DocumentCell doc={row.documents?.[key]} label={DOC_LABELS[key]} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default OCLearnerDocuments;
