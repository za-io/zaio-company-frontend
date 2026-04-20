import { useEffect, useState } from "react";
import {
  getQCTOAssessmentSubmissionsForStudent,
  getQCTOLearnerWorkbookSubmissionsForStudent,
  getQCTOPMTSubmissionsForStudent,
} from "../../api/company";
import styles from "./OCModuleDetails.module.css";

function formatDt(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function previewJson(obj, maxLen = 16000) {
  if (obj == null) return "";
  try {
    const s = JSON.stringify(obj, null, 2);
    return s.length > maxLen ? `${s.slice(0, maxLen)}\n… (truncated)` : s;
  } catch {
    return String(obj);
  }
}

/**
 * Inline QCTOSA / QCTO PMT / Learner Workbook submission summary for OC module details (company app).
 */
export default function QctoSubmissionSummary({ kind, resourceId, studentId, onOpenFullView }) {
  const [state, setState] = useState({ loading: true, error: null, submission: null });

  useEffect(() => {
    let cancelled = false;
    if (!resourceId || !studentId || !kind) {
      setState({ loading: false, error: null, submission: null });
      return undefined;
    }
    setState({ loading: true, error: null, submission: null });
    (async () => {
      try {
        let res;
        if (kind === "qctosa") {
          res = await getQCTOAssessmentSubmissionsForStudent(resourceId, studentId);
        } else if (kind === "qctopmt") {
          res = await getQCTOPMTSubmissionsForStudent(resourceId, studentId);
        } else if (kind === "qctolw") {
          res = await getQCTOLearnerWorkbookSubmissionsForStudent(resourceId, studentId);
        } else {
          if (!cancelled) setState({ loading: false, error: "Unknown task type", submission: null });
          return;
        }
        if (cancelled) return;
        if (!res?.success) {
          setState({
            loading: false,
            error: res?.message || "Could not load submission",
            submission: null,
          });
          return;
        }
        const list = res.data || [];
        const submission = list[0] || null;
        setState({ loading: false, error: null, submission });
      } catch (e) {
        if (!cancelled) {
          setState({ loading: false, error: e?.message || "Failed to load", submission: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, resourceId, studentId]);

  if (state.loading) {
    return (
      <div className={styles.qctoPanelInner}>
        <span className={styles.qctoMuted}>Loading submission…</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={styles.qctoPanelInner}>
        <span className={styles.qctoWarn}>{state.error}</span>
        <button
          type="button"
          className={styles.qctoOpenBtn}
          onClick={(e) => {
            e.stopPropagation();
            onOpenFullView?.();
          }}
        >
          Open assessor view
        </button>
      </div>
    );
  }

  if (!state.submission) {
    return (
      <div className={styles.qctoPanelInner}>
        <span className={styles.qctoMuted}>No submission yet for this learner.</span>
        <button
          type="button"
          className={styles.qctoOpenBtn}
          onClick={(e) => {
            e.stopPropagation();
            onOpenFullView?.();
          }}
        >
          Open assessor view
        </button>
      </div>
    );
  }

  const sub = state.submission;
  const tutorLine = sub.tutorSignedOff
    ? `Yes${
        sub.tutorSignOffBy?.company_username
          ? ` (${sub.tutorSignOffBy.company_username})`
          : ""
      } · ${formatDt(sub.tutorSignOffDate)}`
    : "No";

  const workPayload =
    kind === "qctopmt"
      ? {
          responses: sub.responses,
          learnerInformationResponses: sub.learnerInformationResponses,
          evaluationCriteria: sub.evaluationCriteria,
          declarationAccepted: sub.declarationAccepted,
        }
      : {
          marks: sub.marks,
          answers: sub.answers,
          responses: sub.responses,
        };

  return (
    <div className={styles.qctoPanelInner} onClick={(e) => e.stopPropagation()} role="presentation">
      <div className={styles.qctoMetaGrid}>
        <div>
          <span className={styles.qctoLabel}>Submission status</span>
          <span className={styles.qctoValue}>{sub.status || "—"}</span>
        </div>
        <div>
          <span className={styles.qctoLabel}>Assessment status</span>
          <span className={styles.qctoValue}>{sub.assessmentStatus || "—"}</span>
        </div>
        <div>
          <span className={styles.qctoLabel}>Tutor verified</span>
          <span className={styles.qctoValue}>{tutorLine}</span>
        </div>
        <div>
          <span className={styles.qctoLabel}>Submitted</span>
          <span className={styles.qctoValue}>{formatDt(sub.submittedAt)}</span>
        </div>
        {sub.markedAt ? (
          <div>
            <span className={styles.qctoLabel}>Assessed</span>
            <span className={styles.qctoValue}>{formatDt(sub.markedAt)}</span>
          </div>
        ) : null}
      </div>
      <details className={styles.qctoDetails} open>
        <summary className={styles.qctoSummary}>Learner answers &amp; work (preview)</summary>
        <pre className={styles.qctoPre}>{previewJson(workPayload) || "—"}</pre>
      </details>
      <button
        type="button"
        className={styles.qctoOpenBtn}
        onClick={(e) => {
          e.stopPropagation();
          onOpenFullView?.();
        }}
      >
        Open full assessor view on Zaio
      </button>
    </div>
  );
}
