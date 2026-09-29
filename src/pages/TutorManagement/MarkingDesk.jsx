import { useEffect, useMemo, useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { getResubmissionEmailDraft, reviewProposedMarking, setAssignmentInTalks } from "../../api/company";

const OVERDUE_HOURS = 48;
const IN_TALKS_EXTRA_DAYS = 3;

const PROPOSAL_STATUS_LABELS = {
  proposed: "Proposed",
  approved: "Approved",
  changed: "Changed",
  needs_resubmission: "Needs resubmission",
  returned: "Returned",
  stale: "Stale",
};

export function markingItemKey(item) {
  return `${item?.bootcampId}-${item?.assignment?.courseWorkId}-${item?.userId || item?.userid}`;
}

function humanizeToken(value) {
  if (value == null || value === "") return "";
  const text = String(value).replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return sentence.replace(/(\d+)\s+percent/gi, "$1%");
}

function scoreTone(grade, outOf) {
  const g = Number(grade);
  const m = Number(outOf);
  if (!Number.isFinite(g) || !Number.isFinite(m) || m <= 0) return "text-white";
  const pct = (g / m) * 100;
  if (pct >= 75) return "text-emerald-300";
  if (pct >= 50) return "text-amber-300";
  return "text-rose-300";
}

const MARK_DENOMINATORS = new Set([5, 10, 15, 20, 25, 50, 100]);

function splitSentences(text) {
  return String(text)
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=\.)\)?\s+(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function scoreItemsFromClause(clause, { allowBare = false } = {}) {
  const items = [];
  const parts = clause.split(/,\s+/);
  parts.forEach((part) => {
    const cleaned = part.replace(/[.)]+$/, "").trim();
    const scored = cleaned.match(/^(.*?)(\d+)\s*\/\s*(\d+)(.*)$/);
    if (scored && MARK_DENOMINATORS.has(Number(scored[3])) && Number(scored[2]) <= Number(scored[3])) {
      const extra = scored[4].replace(/\s*=\s*\d+\s*\/\s*\d+.*$/, "").replace(/^[,;:\s]+/, "").trim();
      items.push({
        label: `${scored[1].replace(/[:=\-–—]+$/, "").trim()}${extra ? ` ${extra}` : ""}`.trim(),
        score: `${scored[2]}/${scored[3]}`,
      });
      return;
    }
    const bare = allowBare && cleaned.match(/^([^0-9=]{2,}?)\s+(\d{1,3})$/);
    if (bare) {
      items.push({ label: bare[1].trim(), score: bare[2] });
      return;
    }
    if (cleaned && !/^=/.test(cleaned)) items.push({ label: cleaned, score: null });
  });
  return items.filter((item) => item.label);
}

function structureNote(text) {
  return splitSentences(text).map((sentence) => {
    const groups = [];
    const groupRe = /([^(]{0,80}?)\(([^)]+)\)/g;
    let match = groupRe.exec(sentence);
    while (match) {
      const items = scoreItemsFromClause(match[2], { allowBare: true }).filter((item) => item.score);
      if (items.length >= 2) {
        groups.push({
          title: match[1].replace(/^[,;:\s]+|[,;:\s]+$/g, ""),
          items,
        });
      }
      match = groupRe.exec(sentence);
    }
    if (groups.length) {
      const leadEnd = sentence.indexOf(groups[0].title);
      const lead = leadEnd > 0 ? sentence.slice(0, leadEnd).replace(/[():\s]+/g, " ").replace(/\s+/g, " ").trim() : "";
      return { type: "groups", lead, groups };
    }

    const colon = sentence.indexOf(":");
    if (colon > 0 && colon < 90) {
      const title = sentence.slice(0, colon).trim();
      const rest = sentence.slice(colon + 1).trim();
      const items = scoreItemsFromClause(rest);
      const scored = items.filter((item) => item.score);
      if (scored.length >= 3) {
        const total = rest.match(/=\s*(\d+\s*\/\s*\d+(?:\s*(?:->|→)\s*\d+)?)/);
        return { type: "scores", title, items: scored, total: total ? total[1].replace(/\s+/g, " ") : null };
      }
      if (items.length >= 3 && items.every((item) => !item.score && item.label.length <= 48)) {
        return { type: "list", title, items: items.map((item) => item.label.replace(/\.$/, "")) };
      }
    }

    return { type: "text", text: sentence };
  });
}

function NoteBody({ text }) {
  const blocks = structureNote(text);
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "scores") {
          return (
            <div key={index}>
              <p className="text-sm text-gray-300 mb-2">{block.title}</p>
              <ul className="rounded-lg border border-gray-800 divide-y divide-gray-800">
                {block.items.map((item, itemIndex) => (
                  <li key={`${item.label}-${item.score}-${itemIndex}`} className="flex items-baseline justify-between gap-4 px-3 py-1.5">
                    <span className="text-sm text-gray-300">{item.label}</span>
                    <span className="shrink-0 text-sm tabular-nums text-white">{item.score}</span>
                  </li>
                ))}
                {block.total && (
                  <li className="flex items-baseline justify-between gap-4 px-3 py-1.5 bg-white/[0.03]">
                    <span className="text-sm text-gray-400">Total</span>
                    <span className="shrink-0 text-sm tabular-nums font-medium text-white">{block.total.replace("->", "→")}</span>
                  </li>
                )}
              </ul>
            </div>
          );
        }
        if (block.type === "groups") {
          return (
            <div key={index} className="space-y-2">
              {block.lead && <p className="text-sm text-gray-400">{block.lead}</p>}
              {block.groups.map((group) => (
                <div key={group.title}>
                  <p className="text-sm text-gray-300 mb-1.5">{group.title}</p>
                  <ul className="rounded-lg border border-gray-800 divide-y divide-gray-800">
                    {group.items.map((item) => (
                      <li key={`${group.title}-${item.label}-${item.score}`} className="flex items-baseline justify-between gap-4 px-3 py-1.5">
                        <span className="text-sm text-gray-300">{item.label}</span>
                        <span className="shrink-0 text-sm tabular-nums text-white">{item.score}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          );
        }
        if (block.type === "list") {
          return (
            <div key={index}>
              <p className="text-sm text-gray-300 mb-1.5">{block.title}</p>
              <ul className="space-y-1">
                {block.items.map((item) => (
                  <li key={item} className="text-sm leading-6 text-gray-200 pl-3 border-l border-gray-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <p key={index} className="text-sm leading-6 text-gray-200 max-w-3xl">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function isMarkingOverdue(item) {
  const submittedAt = item?.assignment?.submittedAt;
  if (!submittedAt) return false;
  const extraMs = item.inTalks ? IN_TALKS_EXTRA_DAYS * 24 * 60 * 60 * 1000 : 0;
  return new Date(submittedAt).getTime() + OVERDUE_HOURS * 60 * 60 * 1000 + extraMs < Date.now();
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

function queueRank(item) {
  const status = item.proposedMarking?.status;
  const reviewed = ["approved", "changed", "needs_resubmission"].includes(status);
  const submittedAt = item.assignment?.submittedAt ? new Date(item.assignment.submittedAt).getTime() : Number.MAX_SAFE_INTEGER;
  return [reviewed ? 1 : 0, isMarkingOverdue(item) ? 0 : 1, submittedAt];
}

function ProposedReview({ item, onUpdated }) {
  const pm = item.proposedMarking;
  const [changing, setChanging] = useState(false);
  const [grade, setGrade] = useState(pm?.approvedGrade ?? pm?.proposedGrade ?? "");
  const [feedback, setFeedback] = useState(pm?.approvedFeedback || pm?.feedback || "");
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailText, setEmailText] = useState("");
  const [emailLog, setEmailLog] = useState([]);

  useEffect(() => {
    setChanging(false);
    setGrade(pm?.approvedGrade ?? pm?.proposedGrade ?? "");
    setFeedback(pm?.approvedFeedback || pm?.feedback || "");
    setMessage(null);
    setSaving(null);
    setEmailOpen(false);
    setEmailDraft(null);
    setEmailLog([]);
  }, [item.bootcampId, item.assignment?.courseWorkId, item.userId, pm?.status, pm?.proposedGrade, pm?.approvedGrade, pm?.feedback, pm?.approvedFeedback]);

  useEffect(() => {
    let cancelled = false;
    getResubmissionEmailDraft(item.bootcampId, item.assignment?.courseWorkId, item.userId, {
      studentEmail: item.userEmail,
      studentName: item.userName,
      assignmentTitle: item.assignment?.title,
      assignmentLink: item.linkToMark,
      feedback: pm?.approvedFeedback || pm?.feedback || "",
    }).then((res) => {
      if (!cancelled && res?.success) setEmailLog(res.data?.log || []);
    });
    return () => {
      cancelled = true;
    };
  }, [item.bootcampId, item.assignment?.courseWorkId, item.userId, item.userEmail, item.userName, item.assignment?.title, item.linkToMark, pm?.approvedFeedback, pm?.feedback]);

  if (!pm) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-gray-400 text-sm max-w-sm">
          No proposed mark for this submission. Open it in Google Classroom and mark it there.
        </p>
      </div>
    );
  }

  const outOf = pm.maxPoints ?? item.assignment?.maxPoints;
  const status = pm.status || "proposed";
  const reviewed = ["approved", "changed", "needs_resubmission"].includes(status);
  const shownGrade = reviewed && pm.approvedGrade != null ? pm.approvedGrade : pm.proposedGrade;
  const statusLabel = PROPOSAL_STATUS_LABELS[status] || status;
  const statusChip =
    status === "approved" || status === "changed"
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
      : status === "needs_resubmission"
      ? "bg-rose-500/15 text-rose-200 ring-rose-500/30"
      : "bg-violet-500/15 text-violet-100 ring-violet-400/30";
  const flags = Array.isArray(pm.flags) ? pm.flags.filter(Boolean) : [];

  const submitReview = async (action, email) => {
    setSaving(action);
    setMessage(null);
    try {
      const res = await reviewProposedMarking(item.bootcampId, item.assignment?.courseWorkId, item.userId, {
        action,
        grade: action === "change" ? grade : undefined,
        feedback,
        email,
      });
      if (!res?.success) {
        setMessage({ type: "error", text: res?.message || "Failed to save" });
        return;
      }
      onUpdated(res.data || {});
      setChanging(false);
      if (action === "approve" || action === "change") {
        const copied = await copyTextToClipboard(res.data?.approvedFeedback || feedback);
        let opened = null;
        if (item.linkToMark) opened = window.open(item.linkToMark, "_blank", "noopener,noreferrer");
        setMessage({
          type: "success",
          text: `Saved ${res.data?.approvedGrade ?? ""}${outOf != null ? `/${outOf}` : ""}. ${
            copied ? "Feedback copied – paste it as a private comment." : "Copy the feedback manually."
          }${item.linkToMark && !opened ? " Pop-up blocked: use Open in Classroom." : " Enter the grade in Classroom and return it."}`,
        });
      } else {
        const classroom = res.data?.classroom;
        const mailed = res.data?.email;
        const classroomNote = classroom?.returned
          ? classroom.already
            ? "It was already returned in Classroom."
            : "It is returned in Classroom so they can resubmit."
          : classroom?.message || "Classroom was not updated.";
        setEmailOpen(false);
        if (mailed?.sent) {
          setEmailLog((prev) => [
            {
              to: mailed.to,
              from: mailed.from,
              tutorName: mailed.tutorName,
              tutorEmail: mailed.tutorEmail,
              subject: emailSubject,
              status: "sent",
              sentAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          setMessage({
            type: classroom?.returned ? "success" : "error",
            text: `Email sent to ${mailed.to} from Zaio, sent by ${mailed.tutorName || "your tutor"}${
              mailed.tutorEmail ? ` (${mailed.tutorEmail})` : ""
            }. ${classroomNote}`,
          });
        } else {
          setMessage({ type: "success", text: classroomNote });
        }
      }
    } finally {
      setSaving(null);
    }
  };

  const openResubmissionEmail = async () => {
    setSaving("needs_resubmission");
    setMessage(null);
    try {
      const res = await getResubmissionEmailDraft(item.bootcampId, item.assignment?.courseWorkId, item.userId, {
        studentEmail: item.userEmail,
        studentName: item.userName,
        assignmentTitle: item.assignment?.title,
        assignmentLink: item.linkToMark,
        feedback,
      });
      if (!res?.success) {
        setMessage({ type: "error", text: res?.message || "Could not prepare the email" });
        return;
      }
      setEmailDraft(res.data);
      setEmailSubject(res.data?.subject || "");
      setEmailText(res.data?.text || "");
      setEmailLog(res.data?.log || []);
      setEmailOpen(true);
    } finally {
      setSaving(null);
    }
  };

  const sendResubmissionEmail = () => {
    submitReview("needs_resubmission", { subject: emailSubject, text: emailText, to: emailDraft?.to });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="flex items-end gap-4">
          <div className={`leading-none ${scoreTone(shownGrade, outOf)}`}>
            <span className="text-4xl font-semibold tabular-nums">{shownGrade ?? "–"}</span>
            <span className="text-sm text-gray-500 ml-1">{outOf != null ? `/ ${outOf}` : ""}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${statusChip}`}>
              {statusLabel}
            </span>
            {pm.followedInstructions && (
              <span className="text-xs text-gray-400">Instructions {humanizeToken(pm.followedInstructions).toLowerCase()}</span>
            )}
          </div>
        </div>
        {pm.stale && (
          <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            The student updated this submission after it was pre-marked. Check it before approving.
          </p>
        )}
        {(pm.missed || pm.tutorNotes) && (
          <div className="space-y-4">
            {pm.missed && (
              <section>
                <h4 className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">What was missed</h4>
                <NoteBody text={pm.missed} />
              </section>
            )}
            {pm.tutorNotes && (
              <section className="rounded-lg bg-gray-950/60 border border-gray-800 px-3 py-3">
                <h4 className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">Notes for you</h4>
                <NoteBody text={pm.tutorNotes} />
              </section>
            )}
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Feedback for student</h4>
            <button
              type="button"
              onClick={async () => {
                const ok = await copyTextToClipboard(feedback);
                setMessage({ type: ok ? "success" : "error", text: ok ? "Feedback copied." : "Could not copy." });
              }}
              className="text-xs font-medium text-blue-300 hover:text-blue-200 px-2 py-1 rounded-md hover:bg-blue-500/10"
            >
              Copy
            </button>
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={6}
            disabled={reviewed && !changing}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-100 text-sm leading-6 disabled:opacity-80 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
          />
        </div>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {flags.map((flag) => (
              <span
                key={flag}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-200 text-xs ring-1 ring-amber-500/20"
              >
                {humanizeToken(flag)}
              </span>
            ))}
          </div>
        )}
        {message && (
          <p className={`text-sm rounded-lg px-3 py-2 ${message.type === "error" ? "text-rose-200 bg-rose-500/10" : "text-emerald-200 bg-emerald-500/10"}`}>
            {message.text}
          </p>
        )}
        {emailLog.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">Emails sent</h4>
            <ul className="space-y-1">
              {emailLog.map((entry, index) => (
                <li key={`${entry.sentAt}-${index}`} className="text-xs text-gray-400">
                  {entry.status === "failed" ? "Failed" : "Sent"} {entry.sentAt ? new Date(entry.sentAt).toLocaleString() : ""} to {entry.to}
                  {entry.tutorName ? ` · ${entry.tutorName}` : ""}
                  {entry.tutorEmail ? ` (${entry.tutorEmail})` : ""}
                  {entry.subject ? ` · ${entry.subject}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        {emailOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !saving && setEmailOpen(false)}>
            <div
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-gray-900 border border-gray-700 shadow-xl p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-white font-semibold text-lg">Email the student</h3>
              <p className="text-sm text-gray-400 mt-1">This sends through Sendinblue from Zaio. Nothing goes out until you click Send.</p>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">From</span>
                  <span className="block mt-1 text-sm text-white">Zaio ({emailDraft?.from || "hello@zaio.io"})</span>
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">Sent by your Tutor</span>
                  <span className="block mt-1 text-sm text-white">
                    {emailDraft?.tutorName || "Your tutor"}
                    {emailDraft?.tutorEmail ? ` · ${emailDraft.tutorEmail}` : ""}
                  </span>
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">To</span>
                  <span className="block mt-1 text-sm text-white">{emailDraft?.to || "No student email"}</span>
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">Subject</span>
                  <input
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">Message</span>
                  <textarea
                    value={emailText}
                    onChange={(event) => setEmailText(event.target.value)}
                    rows={12}
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm leading-6 text-gray-100"
                  />
                </label>
                {emailDraft?.sendError && (
                  <p className="text-sm text-rose-200 bg-rose-500/10 rounded-lg px-3 py-2">{emailDraft.sendError}</p>
                )}
                {message && (
                  <p className={`text-sm rounded-lg px-3 py-2 ${message.type === "error" ? "text-rose-200 bg-rose-500/10" : "text-emerald-200 bg-emerald-500/10"}`}>
                    {message.text}
                  </p>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmailOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!emailDraft?.canSend || !emailSubject.trim() || !emailText.trim() || !!saving}
                  onClick={sendResubmissionEmail}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving === "needs_resubmission" ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-gray-800 bg-gray-900/80 px-5 py-3 flex flex-wrap items-center gap-2">
        {changing && (
          <div className="flex items-center gap-2 mr-auto">
            <label className="text-gray-400 text-xs uppercase">Grade</label>
            <input
              type="number"
              min={0}
              max={outOf ?? undefined}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-20 bg-gray-950 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm"
            />
            {outOf != null && <span className="text-gray-500 text-sm">/ {outOf}</span>}
          </div>
        )}
        {!changing ? (
          <>
            <button
              type="button"
              disabled={!!saving}
              onClick={() => submitReview("approve")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving === "approve" ? "Saving…" : `Approve ${pm.proposedGrade ?? ""}${outOf != null ? `/${outOf}` : ""}`}
            </button>
            <button
              type="button"
              disabled={!!saving}
              onClick={() => setChanging(true)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 ring-1 ring-gray-600 text-white text-sm font-medium disabled:opacity-50"
            >
              Change grade
            </button>
            <button
              type="button"
              disabled={!!saving}
              onClick={openResubmissionEmail}
              className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-rose-500/10 ring-1 ring-rose-500/40 text-rose-200 text-sm font-medium disabled:opacity-50"
            >
              {saving === "needs_resubmission" ? "Preparing…" : "Needs resubmission"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!!saving}
              onClick={() => submitReview("change")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving === "change" ? "Saving…" : "Save changed mark"}
            </button>
            <button
              type="button"
              disabled={!!saving}
              onClick={() => {
                setChanging(false);
                setGrade(pm?.approvedGrade ?? pm?.proposedGrade ?? "");
              }}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 ring-1 ring-gray-600 text-white text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function QueueRow({ item, selected, onSelect }) {
  const pm = item.proposedMarking;
  const outOf = pm?.maxPoints ?? item.assignment?.maxPoints;
  const reviewed = ["approved", "changed", "needs_resubmission"].includes(pm?.status);
  const grade = reviewed && pm?.approvedGrade != null ? pm.approvedGrade : pm?.proposedGrade;
  const overdue = isMarkingOverdue(item);
  return (
    <button
      type="button"
      data-marking-key={markingItemKey(item)}
      onClick={() => onSelect(markingItemKey(item))}
      className={`w-full text-left px-3 py-2.5 border-b border-gray-800/80 transition ${
        selected ? "bg-blue-500/10" : "hover:bg-white/[0.03]"
      }`}
    >
      <span className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={`block truncate text-sm ${selected ? "text-white font-medium" : "text-gray-100"}`}>
              {item.assignment?.title || "Untitled assignment"}
            </span>
          </span>
          <span className="block truncate text-xs text-gray-400 mt-0.5">
            {item.userName || item.userEmail || item.userId}
          </span>
          {item.bootcampName && (
            <span className="block truncate text-[11px] text-gray-500 mt-0.5">{item.bootcampName}</span>
          )}
          <span className="flex items-center gap-1.5 mt-1">
            {overdue && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-200">
                <FiAlertCircle size={11} />
                Overdue
              </span>
            )}
            {item.inTalks && <span className="text-[10px] text-amber-300/90">In talks</span>}
            {pm?.status && pm.status !== "proposed" && (
              <span className="text-[10px] text-gray-500">{PROPOSAL_STATUS_LABELS[pm.status] || pm.status}</span>
            )}
          </span>
        </span>
        <span className={`shrink-0 text-sm tabular-nums font-medium ${grade == null ? "text-gray-600" : scoreTone(grade, outOf)}`}>
          {grade == null ? "—" : grade}
        </span>
      </span>
    </button>
  );
}

function selectClass() {
  return "bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-sm";
}

export default function MarkingDesk({
  items,
  returnedItems,
  selectedKey,
  onSelect,
  view,
  onViewChange,
  bootcampFilter,
  onBootcampFilter,
  inTalksFilter,
  onInTalksFilter,
  proposalFilter,
  onProposalFilter,
  bootcamps,
  onTimeScore,
  unmatchedCount,
  onProposalUpdated,
  onInTalks,
  emptyMessage,
}) {
  const [query, setQuery] = useState("");
  const [inTalksLoading, setInTalksLoading] = useState(false);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? items
      : items.filter((item) => {
          const hay = `${item.assignment?.title || ""} ${item.userName || ""} ${item.userEmail || ""} ${item.bootcampName || ""}`.toLowerCase();
          return hay.includes(q);
        });
    return [...filtered].sort((a, b) => {
      const ra = queueRank(a);
      const rb = queueRank(b);
      for (let i = 0; i < ra.length; i += 1) {
        if (ra[i] !== rb[i]) return ra[i] - rb[i];
      }
      return 0;
    });
  }, [items, query]);

  useEffect(() => {
    if (view !== "queue") return;
    const keys = sorted.map(markingItemKey);
    if (!keys.length) {
      if (selectedKey) onSelect(null);
      return;
    }
    if (!selectedKey || !keys.includes(selectedKey)) onSelect(keys[0]);
  }, [view, sorted, selectedKey, onSelect]);

  useEffect(() => {
    if (view !== "queue" || !selectedKey) return;
    const node = document.querySelector(`[data-marking-key="${CSS.escape(selectedKey)}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [selectedKey, view]);

  useEffect(() => {
    if (view !== "queue") return undefined;
    const onKey = (event) => {
      if (!(event.target instanceof Element)) return;
      const inField = event.target.closest("textarea, input, select");
      const inQueueRow = event.target.closest("[data-marking-key]");
      if (inField || (event.target.closest("button, a") && !inQueueRow)) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const idx = sorted.findIndex((item) => markingItemKey(item) === selectedKey);
      const next = event.key === "ArrowDown" ? sorted[idx + 1] : sorted[idx - 1];
      if (!next) return;
      event.preventDefault();
      onSelect(markingItemKey(next));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, sorted, selectedKey, onSelect]);

  const selected = sorted.find((item) => markingItemKey(item) === selectedKey) || null;
  const onTimeTotal = onTimeScore?.totalReturned;
  const onTimeValue = onTimeTotal > 0 ? onTimeScore?.scoreOutOf10 ?? 0 : null;

  const markInTalks = async (item) => {
    setInTalksLoading(true);
    try {
      const res = await setAssignmentInTalks(item.bootcampId, item.assignment?.courseWorkId, item.userId, {
        studentEmail: item.userEmail,
        assignmentTitle: item.assignment?.title,
        submissionLink: item.linkToMark,
      });
      if (res?.success) onInTalks(item);
    } finally {
      setInTalksLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-0 ${view === "unmatched" ? "shrink-0" : "flex-1"}`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {[
          ["queue", "To review", items.length],
          ["returned", "Returned", returnedItems.length],
          ["unmatched", "Unmatched", unmatchedCount],
        ]
          .filter(([id, , count]) => id !== "unmatched" || count > 0)
          .map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                view === id ? "bg-white text-gray-900 font-medium" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {label}
              <span className={`ml-1.5 tabular-nums ${view === id ? "text-gray-500" : "text-gray-500"}`}>{count}</span>
            </button>
          ))}
        <div
          className="ml-auto flex items-center gap-3 pl-3"
          title="Score = assignments returned within 48 hours ÷ total returned, out of 10. In talks extends the deadline by 3 days."
        >
          <span className="text-[11px] uppercase tracking-wide text-gray-500">On time</span>
          <span className="text-lg font-semibold tabular-nums text-white">
            {onTimeValue == null ? "—" : onTimeValue}
            {onTimeValue != null && <span className="text-sm font-medium text-gray-500">/10</span>}
          </span>
        </div>
      </div>

      {view === "queue" && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student or assignment"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-gray-500 w-64"
          />
          <select value={bootcampFilter} onChange={(e) => onBootcampFilter(e.target.value)} className={selectClass()} aria-label="Bootcamp">
            <option value="">All bootcamps</option>
            {bootcamps.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select value={inTalksFilter} onChange={(e) => onInTalksFilter(e.target.value)} className={selectClass()} aria-label="In talks">
            <option value="all">In talks: all</option>
            <option value="in_talks">In talks</option>
            <option value="not_in_talks">Not in talks</option>
          </select>
          <select value={proposalFilter} onChange={(e) => onProposalFilter(e.target.value)} className={selectClass()} aria-label="Proposed mark">
            <option value="all">Proposals: all</option>
            <option value="pending">Pending review</option>
            <option value="reviewed">Reviewed</option>
            <option value="none">No proposal</option>
          </select>
        </div>
      )}

      {view === "unmatched" ? null : view === "returned" ? (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-700/80 bg-gray-900/40">
          {returnedItems.length === 0 ? (
            <p className="text-gray-400 text-sm p-6">No returned assignments{bootcampFilter ? " for this bootcamp" : ""}.</p>
          ) : (
            <ul>
              {returnedItems.map((item, index) => (
                <li
                  key={`ret-${markingItemKey(item)}-${index}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-800"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.assignment?.title || "Untitled assignment"}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {item.userName || item.userEmail || item.userId}
                      {item.bootcampName ? ` · ${item.bootcampName}` : ""}
                      {item.assignment?.returnedAt ? ` · Returned ${formatWhen(item.assignment.returnedAt)}` : ""}
                    </p>
                  </div>
                  {item.linkToMark && (
                    <a
                      href={item.linkToMark}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sm text-blue-300 hover:text-blue-200"
                    >
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 rounded-xl border border-gray-700/80 overflow-hidden bg-gray-900/30">
          <div className="w-[320px] shrink-0 border-r border-gray-800 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="text-gray-400 text-sm p-4">{emptyMessage || "Nothing in this queue."}</p>
            ) : (
              sorted.map((item) => (
                <QueueRow
                  key={markingItemKey(item)}
                  item={item}
                  selected={markingItemKey(item) === selectedKey}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-gray-900/50">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Select a submission to review it.
              </div>
            ) : (
              <>
                <div className="shrink-0 px-5 py-4 border-b border-gray-800 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold text-lg leading-snug">
                      {selected.assignment?.title || "Untitled assignment"}
                    </h3>
                    <p className="text-sm text-gray-300 mt-1 truncate">{selected.userName || selected.userEmail || selected.userId}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selected.bootcampName || selected.courseName || "Course"}
                      {selected.assignment?.submittedAt ? ` · Submitted ${formatWhen(selected.assignment.submittedAt)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {!selected.inTalks ? (
                      <button
                        type="button"
                        disabled={inTalksLoading}
                        onClick={() => markInTalks(selected)}
                        className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 text-sm font-medium disabled:opacity-50"
                      >
                        {inTalksLoading ? "Saving…" : "In talks with student"}
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-100 text-xs font-medium ring-1 ring-amber-500/30">
                        In talks · +3 days
                      </span>
                    )}
                    {selected.linkToMark ? (
                      <a
                        href={selected.linkToMark}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
                      >
                        Open in classroom to update feedback and marks
                      </a>
                    ) : (
                      <span className="text-gray-500 text-sm">No Classroom link</span>
                    )}
                  </div>
                </div>
                <ProposedReview
                  key={markingItemKey(selected)}
                  item={selected}
                  onUpdated={(data) => onProposalUpdated(selected, data)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
