import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getEnrolledBootcampsWithPolling,
  archiveBootcamp,
  archiveManyBootcamps,
  getBootcampConfig,
  editBootcampConfig,
  closeBootcampSpRegistration,
  reopenBootcampSpRegistration,
  getQctoSpLearningPaths,
  provisionBootcampDiscord,
  saveBootcampDiscordLinks,
  getBootcampLiveClasses,
  createBootcampLiveClass,
  updateBootcampLiveClass,
  deleteBootcampLiveClass,
} from "../../api/company";
import Loader from "../loader/loader";
import "./ActiveBootcampsTable.css";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { useUserStore } from "../../store/UserProvider";

// Mini Calendar Date Picker for Edit Modal
const MiniCalendarPicker = ({ selectedDate, onDateSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate ? new Date(selectedDate) : new Date());
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handleDateClick = (day) => {
    onDateSelect(format(day, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const selectedDateObj = selectedDate ? parseISO(selectedDate) : null;

  return (
    <div className="mini-calendar-wrapper" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mini-calendar-trigger"
      >
        <span>{selectedDate ? format(parseISO(selectedDate), "MMMM d, yyyy") : "Select date..."}</span>
        <svg className="calendar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="mini-calendar-dropdown">
          <div className="mini-calendar-header">
            <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span>{format(currentMonth, "MMMM yyyy")}</span>
            <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="mini-calendar-weekdays">
            {weekDays.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mini-calendar-days">
            {days.map((day, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleDateClick(day)}
                className={`mini-calendar-day ${!isSameMonth(day, currentMonth) ? "other-month" : ""} ${selectedDateObj && isSameDay(day, selectedDateObj) ? "selected" : ""} ${isSameDay(day, new Date()) ? "today" : ""}`}
              >
                {format(day, "d")}
              </button>
            ))}
          </div>
          <div className="mini-calendar-actions">
            <button type="button" onClick={() => handleDateClick(new Date())}>Today</button>
            <button type="button" onClick={() => { onDateSelect(""); setIsOpen(false); }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Mini Holiday Range Picker for Edit Modal
const MiniHolidayPicker = ({ holidayRanges, setHolidayRanges }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStart, setTempStart] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handleDateClick = (day) => {
    if (selectingStart) {
      setTempStart(day);
      setSelectingStart(false);
    } else {
      const start = tempStart < day ? tempStart : day;
      const end = tempStart < day ? day : tempStart;
      setHolidayRanges([...holidayRanges, { start: format(start, "MM/dd/yyyy"), end: format(end, "MM/dd/yyyy") }]);
      setTempStart(null);
      setSelectingStart(true);
    }
  };

  const removeRange = (index) => {
    setHolidayRanges(holidayRanges.filter((_, i) => i !== index));
  };

  const isDateInRange = (day) => {
    return holidayRanges.some((range) => {
      try {
        const start = new Date(range.start);
        const end = new Date(range.end);
        return isWithinInterval(day, { start, end });
      } catch { return false; }
    });
  };

  const isTempRange = (day) => {
    if (!tempStart || selectingStart) return false;
    const start = tempStart < day ? tempStart : day;
    const end = tempStart < day ? day : tempStart;
    return isWithinInterval(day, { start, end }) || isSameDay(day, tempStart);
  };

  return (
    <div className="mini-holiday-wrapper" ref={dropdownRef}>
      <div className="mini-holiday-ranges">
        {holidayRanges.length > 0 ? (
          holidayRanges.map((range, idx) => (
            <div key={idx} className="mini-holiday-tag">
              <span>{range.start} → {range.end}</span>
              <button type="button" onClick={() => removeRange(idx)}>×</button>
            </div>
          ))
        ) : (
          <span className="no-holidays">No holidays added</span>
        )}
      </div>
      <button type="button" className="mini-holiday-add-btn" onClick={() => setIsOpen(!isOpen)}>
        + Add Holiday Period
      </button>

      {isOpen && (
        <div className="mini-calendar-dropdown holiday-dropdown">
          <div className="mini-holiday-status">
            {selectingStart ? "Select start date" : "Select end date"}
          </div>
          <div className="mini-calendar-header">
            <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span>{format(currentMonth, "MMMM yyyy")}</span>
            <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="mini-calendar-weekdays">
            {weekDays.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mini-calendar-days">
            {days.map((day, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleDateClick(day)}
                className={`mini-calendar-day ${!isSameMonth(day, currentMonth) ? "other-month" : ""} ${isDateInRange(day) ? "in-range" : ""} ${isTempRange(day) ? "temp-range" : ""} ${tempStart && isSameDay(day, tempStart) ? "range-start" : ""}`}
              >
                {format(day, "d")}
              </button>
            ))}
          </div>
          <div className="mini-calendar-actions">
            {!selectingStart && (
              <button type="button" onClick={() => { setTempStart(null); setSelectingStart(true); }}>Cancel</button>
            )}
            <button type="button" onClick={() => { setIsOpen(false); setTempStart(null); setSelectingStart(true); }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit Bootcamp Config Modal
const EditConfigModal = ({ isOpen, onClose, bootcampId, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [config, setConfig] = useState({
    bootcampName: "",
    startDate: "",
    completionDate: "",
    commitedMins: 360,
    selectedWeekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    linkedGoogleClassroomCourseId: "",
    skillsProgramId: "",
    skillsProgramName: "",
    spRegistrationDeadline: "",
    spRegistrationClosed: false,
  });
  const [calendarLastDate, setCalendarLastDate] = useState("");
  const [linkingClassroom, setLinkingClassroom] = useState(false);
  const [savingEndDate, setSavingEndDate] = useState(false);
  const [savingSpSettings, setSavingSpSettings] = useState(false);
  const [closingSpRegistration, setClosingSpRegistration] = useState(false);
  const [spLearningPaths, setSpLearningPaths] = useState([]);
  const [selectedSpLpId, setSelectedSpLpId] = useState("");
  const [holidayRanges, setHolidayRanges] = useState([]);
  const [message, setMessage] = useState(null);

  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Convert holiday string to ranges array
  const parseHolidaysString = (str) => {
    if (!str) return [];
    const ranges = [];
    const matches = str.matchAll(/"([^"]+)"-"([^"]+)"/g);
    for (const match of matches) {
      ranges.push({ start: match[1], end: match[2] });
    }
    return ranges;
  };

  // Convert ranges array to string
  const formatHolidaysString = () => {
    return holidayRanges.map(r => `"${r.start}"-"${r.end}"`).join(", ");
  };

  const toDateInput = (value) => (value ? String(value).split("T")[0] : "");

  const matchSpLpSelection = (paths, { skillsProgramId, bootcampLpId }) => {
    if (!paths?.length) return "";
    if (skillsProgramId) {
      const byId = paths.find((lp) => (lp.skillsProgramId || "").trim() === skillsProgramId.trim());
      if (byId) return String(byId._id);
    }
    if (bootcampLpId) {
      const byLp = paths.find((lp) => String(lp._id) === String(bootcampLpId));
      if (byLp) return String(byLp._id);
    }
    return "";
  };

  const handleSpLpSelect = (lpId) => {
    setSelectedSpLpId(lpId);
    if (!lpId) {
      setConfig((c) => ({ ...c, skillsProgramId: "", skillsProgramName: "" }));
      return;
    }
    const lp = spLearningPaths.find((item) => String(item._id) === String(lpId));
    if (lp) {
      setConfig((c) => ({
        ...c,
        skillsProgramId: (lp.skillsProgramId || c.skillsProgramId || "").trim(),
        skillsProgramName: (lp.skillsProgramName || lp.learningpathname || "").trim(),
      }));
    }
  };

  useEffect(() => {
    if (isOpen && bootcampId) {
      setLoading(true);
      setMessage(null);
      Promise.all([getBootcampConfig(bootcampId), getQctoSpLearningPaths()]).then(([res, spRes]) => {
        const paths = spRes?.status === 200 && Array.isArray(spRes.allLps) ? spRes.allLps : [];
        setSpLearningPaths(paths);

        if (res.success) {
          setCanEdit(res.canEdit);
          setEnrolledCount(res.enrolledCount);
          const bc = res.bootcamp;
          const calendarDefault = toDateInput(res.calendarLastDate);
          setCalendarLastDate(calendarDefault);
          const bootcampLpId = bc.learningpath?._id || bc.learningpath || "";
          const skillsProgramId = bc.skillsProgramId || "";
          const skillsProgramName = bc.skillsProgramName || "";
          setConfig({
            bootcampName: bc.bootcampName || "",
            startDate: toDateInput(bc.startDate),
            completionDate: toDateInput(bc.completionDate) || calendarDefault,
            commitedMins: bc.commitedMins || 360,
            selectedWeekdays: bc.selectedWeekdays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            linkedGoogleClassroomCourseId: bc.googleClassroom || bc.linkedGoogleClassroomCourseId || "",
            skillsProgramId,
            skillsProgramName,
            spRegistrationDeadline: toDateInput(bc.spRegistrationDeadline),
            spRegistrationClosed: !!bc.spRegistrationClosed,
          });
          setSelectedSpLpId(matchSpLpSelection(paths, { skillsProgramId, bootcampLpId }));
          setHolidayRanges(parseHolidaysString(bc.holidays));
        } else {
          setMessage({ type: "error", text: res.message });
        }
        setLoading(false);
      });
    }
  }, [isOpen, bootcampId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedSpLpId("");
      setSpLearningPaths([]);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const configToSave = {
      bootcampName: config.bootcampName,
      startDate: config.startDate,
      completionDate: config.completionDate || null,
      commitedMins: Number(config.commitedMins),
      holidays: formatHolidaysString(),
      selectedWeekdays: config.selectedWeekdays,
      googleClassroom: (config.linkedGoogleClassroomCourseId || "").trim(),
      skillsProgramId: (config.skillsProgramId || "").trim(),
      skillsProgramName: (config.skillsProgramName || "").trim(),
      spRegistrationDeadline: config.spRegistrationDeadline || null,
      programmeType: (config.skillsProgramId || "").trim() ? "qctosp" : "standard",
    };
    const configResult = await editBootcampConfig(bootcampId, configToSave);
    setSaving(false);
    if (configResult.success) {
      setMessage({ type: "success", text: "Configuration saved successfully!" });
      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } else {
      setMessage({ type: "error", text: configResult.message || "Failed to save configuration" });
    }
  };

  const handleLinkClassroomOnly = async () => {
    const raw = (config.linkedGoogleClassroomCourseId || "").trim();
    if (!raw) {
      setMessage({ type: "error", text: "Enter a Google Classroom invite link or course URL." });
      return;
    }
    setLinkingClassroom(true);
    setMessage(null);
    const result = await editBootcampConfig(bootcampId, { googleClassroom: raw });
    setLinkingClassroom(false);
    if (result.success) {
      setMessage({ type: "success", text: "Google Classroom link saved successfully!" });
      setConfig((c) => ({ ...c, linkedGoogleClassroomCourseId: raw }));
      onSave();
    } else {
      setMessage({ type: "error", text: result.message || "Failed to save" });
    }
  };

  const handleSaveEndDateOnly = async () => {
    setSavingEndDate(true);
    setMessage(null);
    const result = await editBootcampConfig(bootcampId, {
      completionDate: config.completionDate || null,
    });
    setSavingEndDate(false);
    if (result.success) {
      setMessage({ type: "success", text: "Bootcamp end date saved successfully!" });
      onSave();
    } else {
      setMessage({ type: "error", text: result.message || "Failed to save end date" });
    }
  };

  const handleSaveSpSettings = async () => {
    setSavingSpSettings(true);
    setMessage(null);
    const result = await editBootcampConfig(bootcampId, {
      skillsProgramId: (config.skillsProgramId || "").trim(),
      skillsProgramName: (config.skillsProgramName || "").trim(),
      spRegistrationDeadline: config.spRegistrationDeadline || null,
      programmeType: (config.skillsProgramId || "").trim() ? "qctosp" : "standard",
    });
    setSavingSpSettings(false);
    if (result.success) {
      setMessage({ type: "success", text: "QCTO Skills Programme settings saved!" });
      onSave();
    } else {
      setMessage({ type: "error", text: result.message || "Failed to save SP settings" });
    }
  };

  const handleCloseSpRegistration = async () => {
    if (!window.confirm("Close QCTO registration for this bootcamp? Learners will no longer be able to register.")) {
      return;
    }
    setClosingSpRegistration(true);
    setMessage(null);
    const result = await closeBootcampSpRegistration(bootcampId);
    setClosingSpRegistration(false);
    if (result.success) {
      setConfig((c) => ({ ...c, spRegistrationClosed: true }));
      setMessage({ type: "success", text: "QCTO registration closed." });
      onSave();
    } else {
      setMessage({ type: "error", text: result.message || "Failed to close registration" });
    }
  };

  const handleReopenSpRegistration = async () => {
    setClosingSpRegistration(true);
    setMessage(null);
    const result = await reopenBootcampSpRegistration(bootcampId);
    setClosingSpRegistration(false);
    if (result.success) {
      setConfig((c) => ({ ...c, spRegistrationClosed: false }));
      setMessage({ type: "success", text: "QCTO registration reopened." });
      onSave();
    } else {
      setMessage({ type: "error", text: result.message || "Failed to reopen registration" });
    }
  };

  const renderSpRegistrationSection = (showSaveButton = false) => (
    <div className="edit-form-group" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
      <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>QCTO Skills Programme</label>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        Select a Skills Programme learning path. Registration deadline is a soft cutoff (late registrations still allowed until you close registration).
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Skills Programme</label>
          <select
            value={selectedSpLpId}
            onChange={(e) => handleSpLpSelect(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">— Select Skills Programme —</option>
            {spLearningPaths.map((lp) => (
              <option key={lp._id} value={lp._id}>
                {lp.skillsProgramName || lp.learningpathname}
              </option>
            ))}
          </select>
          {spLearningPaths.length === 0 && (
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              No qctosp learning paths found. Mark a learning path as qctosp first (e.g. HTML Programmer).
            </p>
          )}
        </div>
        {config.skillsProgramName && (
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Programme name (QCTO)</label>
            <input
              type="text"
              value={config.skillsProgramName}
              readOnly
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#f1f5f9" }}
            />
          </div>
        )}
        <div>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>QCTO Skills Programme ID</label>
          <input
            type="text"
            value={config.skillsProgramId}
            onChange={(e) => setConfig({ ...config, skillsProgramId: e.target.value })}
            placeholder="Enter your QCTO-registered Skills Programme ID"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Registration deadline</label>
          <MiniCalendarPicker
            selectedDate={config.spRegistrationDeadline}
            onDateSelect={(date) => setConfig({ ...config, spRegistrationDeadline: date })}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Registration: {config.spRegistrationClosed ? "Closed" : "Open"}
          </span>
          {config.spRegistrationClosed ? (
            <button type="button" className="edit-modal-cancel" onClick={handleReopenSpRegistration} disabled={closingSpRegistration}>
              {closingSpRegistration ? "Working…" : "Reopen registration for QCTO"}
            </button>
          ) : (
            <button type="button" className="edit-modal-cancel" onClick={handleCloseSpRegistration} disabled={closingSpRegistration || !config.skillsProgramId?.trim()}>
              {closingSpRegistration ? "Working…" : "Close registration for QCTO"}
            </button>
          )}
        </div>
      </div>
      {showSaveButton && (
        <button
          type="button"
          className="edit-modal-save"
          style={{ marginTop: 12 }}
          onClick={handleSaveSpSettings}
          disabled={savingSpSettings}
        >
          {savingSpSettings ? "Saving…" : "Save SP settings"}
        </button>
      )}
    </div>
  );

  const toggleWeekday = (day) => {
    if (config.selectedWeekdays.includes(day)) {
      setConfig({ ...config, selectedWeekdays: config.selectedWeekdays.filter(d => d !== day) });
    } else {
      setConfig({ ...config, selectedWeekdays: [...config.selectedWeekdays, day] });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h2>{canEdit ? "Edit Bootcamp Configuration" : "View Bootcamp Configuration"}</h2>
          <button className="edit-modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="edit-modal-loading">
            <Loader size={32} />
            <p>Loading configuration...</p>
          </div>
        ) : !canEdit ? (
          <div className="edit-modal-body">
            {message && (
              <div className={`edit-modal-message ${message.type}`} style={{ marginBottom: 16 }}>
                {message.text}
              </div>
            )}
            <div className="edit-modal-warning">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3>View Only</h3>
              <p>This bootcamp has <strong>{enrolledCount} student(s)</strong> enrolled.</p>
              <p>Configuration cannot be changed once students are enrolled.</p>
              <p>
                <strong>Google Classroom invite link</strong> and <strong>bootcamp end date</strong> can still be updated below (SUPER_ADMIN, SUPER_STUDENT_ADMIN, COMPANY_ADMIN).
              </p>
            </div>
            <div className="edit-modal-config-view" style={{ marginTop: "16px", padding: "16px", background: "#f8f9fa", borderRadius: "8px", color: "#0f172a" }}>
              <div className="edit-form-group" style={{ marginBottom: "12px" }}>
                <label style={{ fontWeight: 600, marginBottom: "4px", display: "block" }}>Bootcamp Name</label>
                <span>{config.bootcampName || "—"}</span>
              </div>
              <div className="edit-form-group" style={{ marginBottom: "12px" }}>
                <label style={{ fontWeight: 600, marginBottom: "4px", display: "block" }}>Start Date</label>
                <span>{config.startDate || "—"}</span>
              </div>
              <div className="edit-form-group" style={{ marginBottom: "12px" }}>
                <label style={{ fontWeight: 600, marginBottom: "4px", display: "block" }}>Bootcamp End Date</label>
                <span>{config.completionDate || calendarLastDate || "—"}</span>
                {calendarLastDate && (
                  <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Calendar default (last scheduled day): {calendarLastDate}
                  </p>
                )}
              </div>
              <div className="edit-form-group" style={{ marginBottom: "12px" }}>
                <label style={{ fontWeight: 600, marginBottom: "4px", display: "block" }}>Daily Committed Minutes</label>
                <span>{config.commitedMins ?? "—"}</span>
              </div>
              <div className="edit-form-group" style={{ marginBottom: "12px" }}>
                <label style={{ fontWeight: 600, marginBottom: "4px", display: "block" }}>Active Days</label>
                <span>{(config.selectedWeekdays || []).join(", ") || "—"}</span>
              </div>
              <div className="edit-form-group" style={{ marginBottom: "12px" }}>
                <label style={{ fontWeight: 600, marginBottom: "4px", display: "block" }}>Holiday Periods</label>
                <span>{holidayRanges.length > 0 ? holidayRanges.map(r => `${r.start} – ${r.end}`).join(", ") : "None"}</span>
              </div>
              <div className="edit-form-group" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                <label style={{ fontWeight: 600, marginBottom: "8px", display: "block" }}>Bootcamp End Date</label>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                  Used for completion and deferred-program rules. Defaults to the last day on the student calendar
                  {calendarLastDate ? ` (${calendarLastDate})` : ""}.
                </p>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <MiniCalendarPicker
                      selectedDate={config.completionDate}
                      onDateSelect={(date) => setConfig({ ...config, completionDate: date })}
                    />
                  </div>
                  {calendarLastDate && (
                    <button
                      type="button"
                      className="edit-modal-cancel"
                      onClick={() => setConfig({ ...config, completionDate: calendarLastDate })}
                    >
                      Use calendar date
                    </button>
                  )}
                  <button
                    type="button"
                    className="edit-modal-save"
                    onClick={handleSaveEndDateOnly}
                    disabled={savingEndDate || !config.completionDate}
                    style={{ flexShrink: 0, minWidth: 80 }}
                  >
                    {savingEndDate ? "Saving..." : "Save end date"}
                  </button>
                </div>
              </div>
              {renderSpRegistrationSection(true)}
              <div className="edit-form-group" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                <label style={{ fontWeight: 600, marginBottom: "8px", display: "block" }}>Google Classroom</label>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>You can add or update the Google Classroom link even when students are enrolled.</p>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "nowrap" }}>
                  <input
                    type="text"
                    value={config.linkedGoogleClassroomCourseId}
                    onChange={(e) => setConfig({ ...config, linkedGoogleClassroomCourseId: e.target.value })}
                    placeholder="Paste Google Classroom invite link"
                    style={{ flex: "1 1 auto", minWidth: 0, padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                  />
                  <button
                    type="button"
                    className="edit-modal-save"
                    onClick={handleLinkClassroomOnly}
                    disabled={linkingClassroom || !config.linkedGoogleClassroomCourseId?.trim()}
                    style={{ flexShrink: 0, minWidth: 80 }}
                  >
                    {linkingClassroom ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="edit-modal-body">
            {message && (
              <div className={`edit-modal-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="edit-form-group">
              <label>Bootcamp Name</label>
              <input
                type="text"
                value={config.bootcampName}
                onChange={(e) => setConfig({ ...config, bootcampName: e.target.value })}
                placeholder="Bootcamp name"
              />
            </div>

            <div className="edit-form-group">
              <label>Start Date</label>
              <MiniCalendarPicker
                selectedDate={config.startDate}
                onDateSelect={(date) => setConfig({ ...config, startDate: date })}
              />
            </div>

            <div className="edit-form-group">
              <label>Bootcamp End Date</label>
              <MiniCalendarPicker
                selectedDate={config.completionDate}
                onDateSelect={(date) => setConfig({ ...config, completionDate: date })}
              />
              {calendarLastDate && (
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Calendar default (last scheduled day): {calendarLastDate}.{" "}
                  <button
                    type="button"
                    className="edit-modal-cancel"
                    style={{ display: "inline", padding: "2px 8px", marginLeft: 4 }}
                    onClick={() => setConfig({ ...config, completionDate: calendarLastDate })}
                  >
                    Use calendar date
                  </button>
                </p>
              )}
            </div>

            <div className="edit-form-group">
              <label>Daily Committed Minutes</label>
              <input
                type="number"
                value={config.commitedMins}
                onChange={(e) => setConfig({ ...config, commitedMins: e.target.value })}
                placeholder="e.g., 120"
              />
            </div>

            <div className="edit-form-group">
              <label>Active Days</label>
              <div className="weekday-selector">
                {weekdays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`weekday-btn ${config.selectedWeekdays.includes(day) ? "active" : ""}`}
                    onClick={() => toggleWeekday(day)}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="edit-form-group">
              <label>Holiday Periods</label>
              <MiniHolidayPicker
                holidayRanges={holidayRanges}
                setHolidayRanges={setHolidayRanges}
              />
            </div>

            {renderSpRegistrationSection(false)}

            <div className="edit-form-group">
              <label>Google Classroom</label>
              <input
                type="text"
                value={config.linkedGoogleClassroomCourseId}
                onChange={(e) => setConfig({ ...config, linkedGoogleClassroomCourseId: e.target.value })}
                placeholder="Paste Google Classroom invite link"
              />
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Paste the invite link as-is. It will be saved without modification.</p>
            </div>
          </div>
        )}

        <div className="edit-modal-footer">
          <button className="edit-modal-cancel" onClick={onClose}>
            {canEdit ? "Cancel" : "Close"}
          </button>
          {canEdit && (
            <button 
              className="edit-modal-save" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function formatBootcampDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const LinkGoogleClassroomModal = ({ isOpen, onClose, bootcampId, bootcampName, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkedCourseId, setLinkedCourseId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen && bootcampId) {
      setLoading(true);
      setMessage(null);
      setInputValue("");
      getBootcampConfig(bootcampId)
        .then((res) => {
          if (res.success && res.bootcamp) {
            const bc = res.bootcamp;
            const display = (bc.googleClassroom || bc.linkedGoogleClassroomCourseId || "").trim();
            setLinkedCourseId((bc.linkedGoogleClassroomCourseId || "").trim());
            setInputValue(display);
          } else {
            setLinkedCourseId("");
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, bootcampId]);

  const handleLink = async () => {
    const raw = inputValue.trim();
    if (!raw) {
      setMessage({ type: "error", text: "Paste the full Google Classroom invite link, course URL, or course ID." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await editBootcampConfig(bootcampId, { googleClassroom: raw });
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: "Google Classroom link saved successfully!" });
      setLinkedCourseId((result.bootcamp?.linkedGoogleClassroomCourseId || "").trim());
      setInputValue((result.bootcamp?.googleClassroom || raw).trim());
      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } else setMessage({ type: "error", text: result.message || "Failed to save link" });
  };

  const handleUnlink = async () => {
    setSaving(true);
    setMessage(null);
    const result = await editBootcampConfig(bootcampId, { googleClassroom: "" });
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: "Google Classroom unlinked." });
      setLinkedCourseId("");
      setInputValue("");
      setTimeout(() => {
        onSave();
        onClose();
      }, 800);
    } else setMessage({ type: "error", text: result.message || "Failed to unlink" });
  };

  if (!isOpen) return null;
  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="edit-modal-header">
          <h2>Link Google Classroom</h2>
          <button className="edit-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="edit-modal-body">
          {bootcampName && <p style={{ color: "#94a3b8", marginBottom: 16 }}>{bootcampName}</p>}
          {message && <div className={`edit-modal-message ${message.type}`}>{message.text}</div>}
          {loading ? (
            <div className="edit-modal-loading"><Loader size={24} /><p>Loading...</p></div>
          ) : (
            <>
              <div className="edit-form-group">
                <label>Google Classroom invite link or course URL</label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Paste the full invite link from Classroom (recommended)"
                />
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                  Saved as-is for student onboarding. Course ID is parsed separately for integrations.
                </p>
              </div>
              {(linkedCourseId || inputValue) && (
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                  Parsed course id (API): <code>{linkedCourseId || "—"}</code>
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="button" className="edit-modal-save" onClick={handleLink} disabled={saving || !inputValue.trim()}>
                  {saving ? "Saving..." : "Link"}
                </button>
                {linkedCourseId && (
                  <button type="button" className="dropdown-item archive-btn" onClick={handleUnlink} disabled={saving}>Unlink</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/** SUPER_ADMIN / SUPER_STUDENT_ADMIN: Discord cohort role + channel — paste IDs (default) or create via bot. */
const DiscordBootcampProvisionModal = ({ isOpen, onClose, bootcampId, bootcampName, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showBotSection, setShowBotSection] = useState(false);

  const [manualRoleId, setManualRoleId] = useState("");
  const [manualChannelId, setManualChannelId] = useState("");
  const [manualRoleName, setManualRoleName] = useState("");
  const [manualChannelName, setManualChannelName] = useState("");

  const [roleName, setRoleName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [replace, setReplace] = useState(false);
  const [existing, setExisting] = useState(null);

  const loadConfig = useCallback(() => {
    if (!bootcampId) return Promise.resolve();
    setLoading(true);
    return getBootcampConfig(bootcampId)
      .then((res) => {
        if (res.success && res.bootcamp) {
          const bc = res.bootcamp;
          const name = (bc.bootcampName || bootcampName || "Bootcamp").trim() || "Bootcamp";
          setRoleName(`${name} — Students`.slice(0, 100));
          setChannelName(`${name} chat`.slice(0, 90));
          setManualRoleId(bc.discordBootcampRoleId || "");
          setManualChannelId(bc.discordBootcampChannelId || "");
          setManualRoleName(bc.discordBootcampRoleName || "");
          setManualChannelName(bc.discordBootcampChannelName || "");
          setExisting({
            roleId: bc.discordBootcampRoleId || "",
            roleLabel: bc.discordBootcampRoleName || "",
            channelId: bc.discordBootcampChannelId || "",
            channelLabel: bc.discordBootcampChannelName || "",
          });
        } else {
          setExisting(null);
        }
      })
      .catch(() => setExisting(null))
      .finally(() => setLoading(false));
  }, [bootcampId, bootcampName]);

  useEffect(() => {
    if (!isOpen || !bootcampId) return;
      setMessage(null);
      setReplace(false);
      setShowBotSection(false);
      loadConfig();
  }, [isOpen, bootcampId, loadConfig]);

  const syncExistingFromResponse = (data) => {
    const r = {
      roleId: data.discordBootcampRoleId || "",
      roleLabel: data.discordBootcampRoleName || "",
      channelId: data.discordBootcampChannelId || "",
      channelLabel: data.discordBootcampChannelName || "",
    };
    setExisting(r);
    setManualRoleId(r.roleId);
    setManualChannelId(r.channelId);
    setManualRoleName(r.roleLabel);
    setManualChannelName(r.channelLabel);
  };

  const handleSaveManual = async () => {
    setSubmitting(true);
    setMessage(null);
    const res = await saveBootcampDiscordLinks(bootcampId, {
      discordBootcampRoleId: manualRoleId.trim(),
      discordBootcampChannelId: manualChannelId.trim(),
      discordBootcampRoleName: manualRoleName.trim(),
      discordBootcampChannelName: manualChannelName.trim(),
    });
    setSubmitting(false);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Saved." });
      syncExistingFromResponse(res);
      if (onSave) onSave();
    } else {
      setMessage({ type: "error", text: res.message || "Could not save." });
    }
  };

  const handleClearManual = async () => {
    if (!window.confirm("Remove stored Discord role and channel IDs for this bootcamp?")) return;
    setSubmitting(true);
    setMessage(null);
    const res = await saveBootcampDiscordLinks(bootcampId, { clear: true });
    setSubmitting(false);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Cleared." });
      syncExistingFromResponse({
        discordBootcampRoleId: "",
        discordBootcampRoleName: "",
        discordBootcampChannelId: "",
        discordBootcampChannelName: "",
      });
      if (onSave) onSave();
    } else {
      setMessage({ type: "error", text: res.message || "Could not clear." });
    }
  };

  const handleProvision = async () => {
    setSubmitting(true);
    setMessage(null);
    const res = await provisionBootcampDiscord(bootcampId, {
      roleName: roleName.trim(),
      channelName: channelName.trim(),
      replace: !!replace,
    });
    setSubmitting(false);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Discord role and channel created." });
      syncExistingFromResponse(res);
      setReplace(false);
      if (onSave) onSave();
    } else {
      setMessage({ type: "error", text: res.message || "Could not provision Discord." });
      if (res.discordBootcampRoleId && res.discordBootcampChannelId) {
        syncExistingFromResponse(res);
      }
    }
  };

  if (!isOpen) return null;

  const hasExisting = existing?.roleId && existing?.channelId;

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="edit-modal-header">
          <h2>Discord — cohort role &amp; channel</h2>
          <button type="button" className="edit-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="edit-modal-body">
          {bootcampName && <p style={{ color: "#94a3b8", marginBottom: 12 }}>{bootcampName}</p>}

          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            <strong>Recommended:</strong> In Discord, create the private channel and cohort role yourself, then paste the numeric IDs
            below. Turn on <strong>User Settings → App Settings → Advanced → Developer Mode</strong>, then right‑click the role or
            channel → <strong>Copy ID</strong>.
          </p>

          {message && <div className={`edit-modal-message ${message.type}`}>{message.text}</div>}

          {loading ? (
            <div className="edit-modal-loading">
              <Loader size={24} />
              <p>Loading…</p>
            </div>
          ) : (
            <>
              {hasExisting && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 8,
                    background: "#1e293b",
                    border: "1px solid #334155",
                    fontSize: 13,
                    color: "#e2e8f0",
                  }}
                >
                  <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Currently stored</p>
                  <p style={{ margin: 0 }}>
                    Role: <code style={{ color: "#86efac" }}>{existing.roleLabel || existing.roleId || "—"}</code>
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    Channel: <code style={{ color: "#86efac" }}>{existing.channelLabel || existing.channelId || "—"}</code>
                  </p>
                </div>
              )}

              <div className="edit-form-group">
                <label>Role ID (snowflake)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualRoleId}
                  onChange={(e) => setManualRoleId(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 1234567890123456789"
                  disabled={submitting}
                />
              </div>
              <div className="edit-form-group">
                <label>Channel ID (snowflake)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualChannelId}
                  onChange={(e) => setManualChannelId(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 9876543210987654321"
                  disabled={submitting}
                />
              </div>
              <div className="edit-form-group">
                <label>Role label (optional, for your reference)</label>
                <input
                  type="text"
                  value={manualRoleName}
                  onChange={(e) => setManualRoleName(e.target.value)}
                  placeholder="e.g. May 2026 Students"
                  disabled={submitting}
                />
              </div>
              <div className="edit-form-group">
                <label>Channel label (optional)</label>
                <input
                  type="text"
                  value={manualChannelName}
                  onChange={(e) => setManualChannelName(e.target.value)}
                  placeholder="e.g. may-2026-private"
                  disabled={submitting}
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="edit-modal-save"
                  onClick={handleSaveManual}
                  disabled={submitting || !manualRoleId.trim() || !manualChannelId.trim()}
                >
                  {submitting ? "Saving…" : "Save Discord IDs"}
                </button>
                {hasExisting && (
                  <button
                    type="button"
                    className="dropdown-item archive-btn"
                    onClick={handleClearManual}
                    disabled={submitting}
                  >
                    Clear stored IDs
                  </button>
                )}
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #334155" }}>
                <button
                  type="button"
                  className="dropdown-item edit-btn"
                  style={{ width: "100%", textAlign: "left", marginBottom: 8 }}
                  onClick={() => {
                    setShowBotSection((s) => !s);
                    setMessage(null);
                  }}
                >
                  {showBotSection ? "▼" : "▶"} Create with Zaio bot instead (needs Manage Roles; may fail if 2FA is required for mods)
                </button>

                {showBotSection && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                      The bot creates a new role and private channel in the server from <code>DISCORD_GUILD_ID</code>. If Discord returns
                      Missing Permissions or Two factor required, use manual IDs above.
                    </p>
                    {hasExisting && (
                      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                        <span>Replace stored IDs after bot creates new role/channel (old Discord objects are not deleted)</span>
                      </label>
                    )}
                    <div className="edit-form-group">
                      <label>Role name (new)</label>
                      <input
                        type="text"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        disabled={hasExisting && !replace}
                      />
                    </div>
                    <div className="edit-form-group">
                      <label>Channel name slug</label>
                      <input
                        type="text"
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        disabled={hasExisting && !replace}
                      />
                    </div>
                    <button
                      type="button"
                      className="edit-modal-save"
                      onClick={handleProvision}
                      disabled={
                        submitting || !roleName.trim() || !channelName.trim() || (hasExisting && !replace)
                      }
                    >
                      {submitting
                        ? "Working…"
                        : hasExisting && !replace
                          ? "Check “Replace stored IDs” to run bot"
                          : "Create in Discord via bot"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const DEFAULT_LIVE_CLASS_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Crect fill='%23212a34' width='200' height='120'/%3E%3Ctext x='100' y='65' fill='%236b7280' font-size='14' text-anchor='middle' font-family='system-ui'%3ELive Class%3C/text%3E%3C/svg%3E";

const BootcampLiveClassesModal = ({ isOpen, onClose, bootcampId, bootcampName, onSave }) => {
  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLiveClass, setEditingLiveClass] = useState(null);
  const [form, setForm] = useState({
    title: "",
    day: "Monday",
    time: "09:00",
    endTime: "10:00",
    link: "",
    thumbnail: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchLiveClasses = () => {
    if (!bootcampId) return;
    setLoading(true);
    getBootcampLiveClasses(bootcampId)
      .then((res) => {
        if (res?.status === 200 && res?.success && Array.isArray(res.data)) {
          setLiveClasses(res.data);
        } else {
          setLiveClasses([]);
        }
      })
      .catch(() => setLiveClasses([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && bootcampId) {
      fetchLiveClasses();
      setShowForm(false);
      setEditingLiveClass(null);
      setMessage(null);
    }
  }, [isOpen, bootcampId]);

  const handleOpenAdd = () => {
    setEditingLiveClass(null);
    setForm({ title: "", day: "Monday", time: "09:00", endTime: "10:00", link: "", thumbnail: "" });
    setMessage(null);
    setShowForm(true);
  };

  const handleOpenEdit = (lc) => {
    setEditingLiveClass(lc);
    setForm({
      title: lc.title || "",
      day: lc.day || "Monday",
      time: lc.time || "09:00",
      endTime: lc.endTime || "10:00",
      link: lc.link || "",
      thumbnail: lc.thumbnail || "",
    });
    setMessage(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    const { title, day, time, endTime, link, thumbnail } = form;
    if (!title?.trim()) {
      setMessage({ type: "error", text: "Title is required." });
      return;
    }
    if (!bootcampId) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = { title: title.trim(), day, time, endTime, link: link?.trim() || "", thumbnail: thumbnail?.trim() || "" };
      if (editingLiveClass) {
        const res = await updateBootcampLiveClass(bootcampId, editingLiveClass._id, payload);
        if (res?.status === 200 && res?.success) {
          setLiveClasses((prev) => prev.map((lc) => (lc._id === editingLiveClass._id ? res.data : lc)));
          setShowForm(false);
          setEditingLiveClass(null);
          onSave?.();
        } else {
          setMessage({ type: "error", text: res?.message || "Update failed." });
        }
      } else {
        const res = await createBootcampLiveClass(bootcampId, payload);
        if (res?.status === 200 && res?.success) {
          setLiveClasses((prev) => [...prev, res.data]);
          setShowForm(false);
          onSave?.();
        } else {
          setMessage({ type: "error", text: res?.message || "Create failed." });
        }
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || err?.message || "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (lc) => {
    if (!bootcampId || !window.confirm(`Delete live class "${lc.title}"?`)) return;
    try {
      const res = await deleteBootcampLiveClass(bootcampId, lc._id);
      if (res?.status === 200 && res?.success) {
        setLiveClasses((prev) => prev.filter((x) => x._id !== lc._id));
        onSave?.();
      } else {
        alert(res?.message || "Delete failed.");
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Delete failed.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="edit-modal-header">
          <h2>Live Classes — {bootcampName || "Bootcamp"}</h2>
          <button className="edit-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="edit-modal-body">
          {message && <div className={`edit-modal-message ${message.type}`}>{message.text}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>Schedule live classes for enrolled students</span>
            <button type="button" className="edit-modal-save" onClick={handleOpenAdd}>
              + Add Live Class
            </button>
          </div>

          {showForm ? (
            <div style={{ padding: 16, background: "#1e293b", borderRadius: 8, marginBottom: 20 }}>
              <h4 style={{ marginBottom: 12, color: "#e2e8f0" }}>{editingLiveClass ? "Edit Live Class" : "Add Live Class"}</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#94a3b8" }}>Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Introduction to Cyber Security"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#94a3b8" }}>Day</label>
                  <select
                    value={form.day}
                    onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0" }}
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#94a3b8" }}>Start Time</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#94a3b8" }}>End Time</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#94a3b8" }}>Link (optional)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={form.link}
                    onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#94a3b8" }}>Thumbnail URL (optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={form.thumbnail}
                    onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="edit-modal-save" onClick={handleSave} disabled={submitting}>
                    {submitting ? "Saving…" : editingLiveClass ? "Update" : "Add Live Class"}
                  </button>
                  <button
                    type="button"
                    className="edit-modal-cancel"
                    onClick={() => { setShowForm(false); setEditingLiveClass(null); setMessage(null); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="edit-modal-loading"><Loader size={24} /><p>Loading live classes…</p></div>
          ) : liveClasses.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>No live classes yet. Click &quot;Add Live Class&quot; to create one.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {liveClasses.map((lc) => (
                <div key={lc._id} style={{ background: "#1e293b", borderRadius: 8, overflow: "hidden", border: "1px solid #334155" }}>
                  <div style={{ aspectRatio: "16/9", background: "#0f172a" }}>
                    <img
                      src={lc.thumbnail || DEFAULT_LIVE_CLASS_THUMBNAIL}
                      alt={lc.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { e.target.src = DEFAULT_LIVE_CLASS_THUMBNAIL; }}
                    />
                  </div>
                  <div style={{ padding: 12 }}>
                    <h5 style={{ margin: 0, color: "#e2e8f0", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lc.title}</h5>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>{lc.day} • {lc.time} – {lc.endTime}</p>
                    {lc.link && (
                      <a href={lc.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#60a5fa", marginTop: 4, display: "block" }}>Join</a>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button type="button" className="edit-modal-save" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => handleOpenEdit(lc)}>Edit</button>
                      <button type="button" className="dropdown-item archive-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => handleDelete(lc)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Per-page row count (server max 50; larger pages need async + poll to avoid Heroku timeout). */
const BOOTCAMPS_PAGE_SIZE = 12;

const BOOTCAMP_TRACK_FILTERS = [
  { id: "all", label: "All" },
  { id: "fs", label: "FS" },
  { id: "fsai", label: "FSAI" },
  { id: "cyber", label: "Cyber" },
  { id: "data-sci", label: "Data Sci" },
];

function ActiveBootcampsTable() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const canProvisionBootcampDiscord = ["SUPER_ADMIN", "SUPER_STUDENT_ADMIN"].includes(user?.role);
  const [bootcamps, setBootcamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadHint, setLoadHint] = useState("");
  const [page, setPage] = useState(1);
  const [trackFilter, setTrackFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [archiving, setArchiving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBootcampId, setEditingBootcampId] = useState(null);
  const [linkClassroomModalOpen, setLinkClassroomModalOpen] = useState(false);
  const [linkingBootcampId, setLinkingBootcampId] = useState(null);
  const [linkingBootcampName, setLinkingBootcampName] = useState("");
  const [liveClassesModalOpen, setLiveClassesModalOpen] = useState(false);
  const [liveClassesBootcampId, setLiveClassesBootcampId] = useState(null);
  const [liveClassesBootcampName, setLiveClassesBootcampName] = useState("");
  const [autoEnrollmentModalOpen, setAutoEnrollmentModalOpen] = useState(false);
  const [autoEnrollmentBootcamp, setAutoEnrollmentBootcamp] = useState(null);
  const [discordProvisionOpen, setDiscordProvisionOpen] = useState(false);
  const [discordProvisionBootcampId, setDiscordProvisionBootcampId] = useState(null);
  const [discordProvisionBootcampName, setDiscordProvisionBootcampName] = useState("");
  const dropdownRef = useRef(null);

  const baseUrl = process.env.REACT_APP_BACKEND_URL || "";

  const fetchBootcamps = (pageNum = page, track = trackFilter) => {
    setLoading(true);
    setLoadHint("");
    let pollHintSet = false;
    getEnrolledBootcampsWithPolling(
      { page: pageNum, limit: BOOTCAMPS_PAGE_SIZE, track },
      {
        onPoll: () => {
          if (!pollHintSet) {
            pollHintSet = true;
            setLoadHint("Loading bootcamps (large lists run in the background on Heroku)…");
          }
        },
      }
    )
      .then((res) => {
        const list = res?.enrolledBootcamps || [];
        setBootcamps(Array.isArray(list) ? list : []);
        setTotal(res?.total ?? 0);
        setTotalPages(res?.totalPages ?? 0);
        setSelectedIds([]);
      })
      .catch((err) => {
        console.log("Error fetching bootcamps:", err);
        setBootcamps([]);
      })
      .finally(() => {
        setLoadHint("");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBootcamps(page, trackFilter);
  }, [page, trackFilter]);

  const handleTrackFilterChange = (nextTrack) => {
    setTrackFilter(nextTrack);
    setPage(1);
    setSelectedIds([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRowClick = (bootcampItem) => {
    const bootcampId = bootcampItem?.bootcampid?._id || bootcampItem?.bootcampid || bootcampItem?._id;
    // Navigate to the student analytics page with bootcamp filter
    navigate(`/student/analytics?bootcamp=${bootcampId}`);
  };

  const handleActionsClick = (e, bootcampId) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === bootcampId ? null : bootcampId);
  };

  const handleEdit = (e, bootcampId) => {
    e.stopPropagation();
    setEditingBootcampId(bootcampId);
    setEditModalOpen(true);
    setOpenDropdown(null);
  };

  const handleLinkClassroom = (e, bootcampId, bootcampName) => {
    e.stopPropagation();
    setLinkingBootcampId(bootcampId);
    setLinkingBootcampName(bootcampName || "Bootcamp");
    setLinkClassroomModalOpen(true);
    setOpenDropdown(null);
  };

  const handleAutoEnrollment = (e, bootcamp) => {
    e.stopPropagation();
    setAutoEnrollmentBootcamp(bootcamp);
    setAutoEnrollmentModalOpen(true);
    setOpenDropdown(null);
  };

  const handleLiveClasses = (e, bootcampId, bootcampName) => {
    e.stopPropagation();
    setLiveClassesBootcampId(bootcampId);
    setLiveClassesBootcampName(bootcampName || "Bootcamp");
    setLiveClassesModalOpen(true);
    setOpenDropdown(null);
  };

  const handleDiscordProvisionOpen = (e, bootcampId, bootcampName) => {
    e.stopPropagation();
    setDiscordProvisionBootcampId(bootcampId);
    setDiscordProvisionBootcampName(bootcampName || "Bootcamp");
    setDiscordProvisionOpen(true);
    setOpenDropdown(null);
  };

  const handleArchive = async (e, bootcampId, bootcampName) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to archive "${bootcampName}"? It will be hidden from the list.`)) {
      const result = await archiveBootcamp(bootcampId);
      if (result.success) {
        fetchBootcamps(page);
      } else {
        alert(result.message || "Failed to archive bootcamp");
      }
    }
    setOpenDropdown(null);
  };

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(bootcamps.map((b) => b._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, bootcampId) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds([...selectedIds, bootcampId]);
    } else {
      setSelectedIds(selectedIds.filter((id) => id !== bootcampId));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;

    if (window.confirm(`Are you sure you want to archive ${selectedIds.length} bootcamp(s)? They will be hidden from the list.`)) {
      setArchiving(true);
      const result = await archiveManyBootcamps(selectedIds);
      setArchiving(false);

      if (result.success) {
        fetchBootcamps(page);
      } else {
        alert(result.message || "Failed to archive bootcamps");
      }
    }
  };

  const isAllSelected = bootcamps.length > 0 && selectedIds.length === bootcamps.length;

  if (loading) {
    return (
      <div className="active-bootcamps-card">
        <h3 className="active-bootcamps-title">Bootcamps</h3>
        <div className="active-bootcamps-loading">
          <Loader size={32} />
          Loading bootcamps...
          {loadHint && <p className="text-xs text-slate-400 mt-2 max-w-md text-center leading-relaxed">{loadHint}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="active-bootcamps-card">
      <div className="bootcamps-header">
        <h3 className="active-bootcamps-title">Bootcamps</h3>
        {selectedIds.length > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">{selectedIds.length} selected</span>
            <button 
              className="bulk-archive-btn" 
              onClick={handleBulkArchive}
              disabled={archiving}
            >
              {archiving ? "Archiving..." : "Archive Selected"}
            </button>
            <button 
              className="clear-selection-btn" 
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="bootcamp-track-filters" role="tablist" aria-label="Filter bootcamps by programme">
        {BOOTCAMP_TRACK_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={trackFilter === filter.id}
            className={`bootcamp-track-filter-btn ${trackFilter === filter.id ? "active" : ""}`}
            onClick={() => handleTrackFilterChange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="active-bootcamps-table-wrap">
        <table className="active-bootcamps-table">
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="bootcamp-checkbox"
                />
              </th>
              <th>Bootcamp Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Current Section</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bootcamps && bootcamps.length > 0 ? (
              bootcamps.map((b) => (
                <tr
                  key={b._id}
                  onClick={() => handleRowClick(b)}
                  className={`active-bootcamps-row ${selectedIds.includes(b._id) ? "selected-row" : ""}`}
                >
                  <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(b._id)}
                      onChange={(e) => handleSelectOne(e, b._id)}
                      className="bootcamp-checkbox"
                    />
                  </td>
                  <td className="bootcamp-name">
                    {b.bootcampName || b.learningpath?.learningpathname || "—"}
                  </td>
                  <td>{formatBootcampDate(b.startDate)}</td>
                  <td>{formatBootcampDate(b.endDate)}</td>
                  <td>
                    <div className="status-cell">
                      <span className={`status-badge ${
                        b.status === "Completed" ? "status-completed" :
                        b.status === "Deferred" ? "status-deferred" :
                        b.status === "Resolve" ? "status-resolve" :
                        b.status === "2 Month Grace Period" ? "status-grace-period" :
                        "status-on-going"
                      }`}>
                        {b.status || "On Going"}
                      </span>
                      {b.status === "2 Month Grace Period" && b.gracePeriodEndDate && (
                        <span className="status-grace-end">
                          Ends {formatBootcampDate(b.gracePeriodEndDate)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {b.totalSections > 0 ? (
                      <div className="progress-cell">
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar-fill"
                            style={{ width: `${Math.round((b.currentSectionIndex / b.totalSections) * 100)}%` }}
                          />
                        </div>
                        <span className="progress-text">
                          {b.currentSectionIndex}/{b.totalSections}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{b.currentSection || "—"}</td>
                  <td className="actions-cell">
                    <div style={{ position: "relative", display: "inline-block" }} ref={openDropdown === b._id ? dropdownRef : null}>
                      <button
                        className="actions-btn"
                        onClick={(e) => handleActionsClick(e, b._id)}
                      >
                        ⋮
                      </button>
                      {openDropdown === b._id && (
                        <div className="actions-dropdown">
                          <button
                            className="dropdown-item edit-btn"
                            onClick={(e) => handleEdit(e, b._id)}
                          >
                            Edit Config
                          </button>
                          <button
                            className="dropdown-item edit-btn"
                            onClick={(e) => handleLinkClassroom(e, b._id, b.bootcampName || b.learningpath?.learningpathname)}
                          >
                            Link Google Classroom
                          </button>
                          <button
                            className="dropdown-item edit-btn"
                            onClick={(e) => handleAutoEnrollment(e, b)}
                          >
                            Auto Enrollment
                          </button>
                          <button
                            className="dropdown-item edit-btn"
                            onClick={(e) => handleLiveClasses(e, b._id, b.bootcampName || b.learningpath?.learningpathname)}
                          >
                            Live Classes
                          </button>
                          {canProvisionBootcampDiscord && (
                            <button
                              className="dropdown-item edit-btn"
                              onClick={(e) =>
                                handleDiscordProvisionOpen(e, b._id, b.bootcampName || b.learningpath?.learningpathname)
                              }
                            >
                              Discord role &amp; channel
                            </button>
                          )}
                          <button
                            className="dropdown-item archive-btn"
                            onClick={(e) => handleArchive(e, b._id, b.bootcampName)}
                          >
                            Archive
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-bootcamps-message">
                  <div style={{ padding: "24px 0" }}>
                    <svg style={{ width: "48px", height: "48px", margin: "0 auto 12px", opacity: 0.3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p>
                      {trackFilter === "all"
                        ? "No bootcamps found"
                        : `No ${BOOTCAMP_TRACK_FILTERS.find((f) => f.id === trackFilter)?.label || ""} bootcamps found`}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="active-bootcamps-pagination">
          <span className="pagination-info">
            Page {page} of {totalPages} ({total} bootcamp{total !== 1 ? "s" : ""} total)
          </span>
          <div className="pagination-buttons">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <EditConfigModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingBootcampId(null); }}
        bootcampId={editingBootcampId}
        onSave={() => fetchBootcamps(page)}
      />
      <LinkGoogleClassroomModal
        isOpen={linkClassroomModalOpen}
        onClose={() => { setLinkClassroomModalOpen(false); setLinkingBootcampId(null); setLinkingBootcampName(""); }}
        bootcampId={linkingBootcampId}
        bootcampName={linkingBootcampName}
        onSave={() => fetchBootcamps(page)}
      />
      <BootcampLiveClassesModal
        isOpen={liveClassesModalOpen}
        onClose={() => { setLiveClassesModalOpen(false); setLiveClassesBootcampId(null); setLiveClassesBootcampName(""); }}
        bootcampId={liveClassesBootcampId}
        bootcampName={liveClassesBootcampName}
        onSave={() => {}}
      />
      <DiscordBootcampProvisionModal
        isOpen={discordProvisionOpen}
        onClose={() => {
          setDiscordProvisionOpen(false);
          setDiscordProvisionBootcampId(null);
          setDiscordProvisionBootcampName("");
        }}
        bootcampId={discordProvisionBootcampId}
        bootcampName={discordProvisionBootcampName}
        onSave={() => fetchBootcamps(page)}
      />

      {/* Auto Enrollment details modal */}
      {autoEnrollmentModalOpen && autoEnrollmentBootcamp && (
        <div className="edit-modal-overlay" onClick={() => setAutoEnrollmentModalOpen(false)}>
          <div className="edit-modal-content auto-enrollment-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="edit-modal-header">
              <h2>Auto Enrollment – {autoEnrollmentBootcamp.bootcampName || "Bootcamp"}</h2>
              <button type="button" className="edit-modal-close" onClick={() => setAutoEnrollmentModalOpen(false)}>×</button>
            </div>
            <div className="edit-modal-body">
              {autoEnrollmentBootcamp.bootcampType === "auto" && autoEnrollmentBootcamp.apiKey ? (
                <>
                  <p className="auto-enrollment-desc">Use these details to integrate auto-enrollment with your payment or signup flow. Send a POST request with the API key in the header.</p>
                  <div className="auto-enrollment-field">
                    <label>Endpoint URL</label>
                    <div className="auto-enrollment-value-row">
                      <code className="auto-enrollment-code">
                        {baseUrl}/bootcamp/auto-enroll/{autoEnrollmentBootcamp._id}
                      </code>
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => navigator.clipboard?.writeText(`${baseUrl}/bootcamp/auto-enroll/${autoEnrollmentBootcamp._id}`)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="auto-enrollment-field">
                    <label>API Key (x-api-key header)</label>
                    <div className="auto-enrollment-value-row">
                      <code className="auto-enrollment-code api-key-code">{autoEnrollmentBootcamp.apiKey}</code>
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => navigator.clipboard?.writeText(autoEnrollmentBootcamp.apiKey)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="auto-enrollment-field">
                    <label>Method</label>
                    <code className="auto-enrollment-code">POST</code>
                  </div>
                  <p className="auto-enrollment-note">
                    Required body: <code>student_email</code>, <code>payer_email</code>, <code>payment_type</code>, and payment-type-specific fields. See the API documentation for full details.
                  </p>
                </>
              ) : (
                <p className="auto-enrollment-unavailable">
                  This bootcamp does not support auto-enrollment. Set bootcamp type to &quot;auto&quot; when creating the program to enable it. Auto-enrollment bootcamps receive an API key and endpoint for integrating with your payment or signup flow.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveBootcampsTable;
