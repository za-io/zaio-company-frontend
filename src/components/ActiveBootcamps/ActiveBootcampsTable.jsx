import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getEnrolledBootcamps, archiveBootcamp, archiveManyBootcamps, getBootcampConfig, editBootcampConfig, linkBootcampGoogleClassroom } from "../../api/company";
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
    commitedMins: 360,
    selectedWeekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  });
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

  useEffect(() => {
    if (isOpen && bootcampId) {
      setLoading(true);
      setMessage(null);
      getBootcampConfig(bootcampId).then((res) => {
        if (res.success) {
          setCanEdit(res.canEdit);
          setEnrolledCount(res.enrolledCount);
          const bc = res.bootcamp;
          setConfig({
            bootcampName: bc.bootcampName || "",
            startDate: bc.startDate ? bc.startDate.split("T")[0] : "",
            commitedMins: bc.commitedMins || 360,
            selectedWeekdays: bc.selectedWeekdays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          });
          setHolidayRanges(parseHolidaysString(bc.holidays));
        } else {
          setMessage({ type: "error", text: res.message });
        }
        setLoading(false);
      });
    }
  }, [isOpen, bootcampId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const configToSave = {
      ...config,
      holidays: formatHolidaysString(),
    };
    const result = await editBootcampConfig(bootcampId, configToSave);
    setSaving(false);
    
    if (result.success) {
      setMessage({ type: "success", text: "Configuration saved successfully!" });
      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } else {
      setMessage({ type: "error", text: result.message });
    }
  };

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
          <h2>Edit Bootcamp Configuration</h2>
          <button className="edit-modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="edit-modal-loading">
            <Loader size={32} />
            <p>Loading configuration...</p>
          </div>
        ) : !canEdit ? (
          <div className="edit-modal-body">
            <div className="edit-modal-warning">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3>Cannot Edit</h3>
              <p>This bootcamp has <strong>{enrolledCount} student(s)</strong> enrolled.</p>
              <p>Bootcamp configuration cannot be changed once students are enrolled.</p>
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

function parseCourseId(input) {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/classroom\.google\.com\/[^/]+\/c\/([a-zA-Z0-9_-]+)/) || trimmed.match(/classroom\.google\.com\/c\/([a-zA-Z0-9_-]+)/);
  return urlMatch ? urlMatch[1] : trimmed;
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
      getBootcampConfig(bootcampId).then((res) => {
        if (res.success && res.bootcamp?.linkedGoogleClassroomCourseId) {
          setLinkedCourseId(res.bootcamp.linkedGoogleClassroomCourseId);
          setInputValue(res.bootcamp.linkedGoogleClassroomCourseId);
        } else setLinkedCourseId("");
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen, bootcampId]);

  const handleLink = async () => {
    const courseId = parseCourseId(inputValue);
    if (!courseId) {
      setMessage({ type: "error", text: "Enter a Google Classroom course ID or paste the course URL." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await linkBootcampGoogleClassroom(bootcampId, courseId);
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: "Google Classroom linked successfully!" });
      setLinkedCourseId(courseId);
      setTimeout(() => { onSave(); onClose(); }, 1000);
    } else setMessage({ type: "error", text: result.message || "Failed to link" });
  };

  const handleUnlink = async () => {
    setSaving(true);
    setMessage(null);
    const result = await linkBootcampGoogleClassroom(bootcampId, "");
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: "Google Classroom unlinked." });
      setLinkedCourseId("");
      setInputValue("");
      setTimeout(() => { onSave(); onClose(); }, 800);
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
                <label>Google Classroom course ID or URL</label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="e.g. 123456789 or https://classroom.google.com/c/123456789"
                />
              </div>
              {linkedCourseId && <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Currently linked: <code>{linkedCourseId}</code></p>}
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

function ActiveBootcampsTable() {
  const navigate = useNavigate();
  const [bootcamps, setBootcamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [archiving, setArchiving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBootcampId, setEditingBootcampId] = useState(null);
  const [linkClassroomModalOpen, setLinkClassroomModalOpen] = useState(false);
  const [linkingBootcampId, setLinkingBootcampId] = useState(null);
  const [linkingBootcampName, setLinkingBootcampName] = useState("");
  const dropdownRef = useRef(null);

  const fetchBootcamps = () => {
    setLoading(true);
    getEnrolledBootcamps()
      .then((res) => {
        console.log("Enrolled bootcamps response:", res);
        const list = res?.enrolledBootcamps || [];
        setBootcamps(Array.isArray(list) ? list : []);
        setSelectedIds([]); // Clear selection after refresh
      })
      .catch((err) => {
        console.log("Error fetching bootcamps:", err);
        setBootcamps([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBootcamps();
  }, []);

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

  const handleArchive = async (e, bootcampId, bootcampName) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to archive "${bootcampName}"? It will be hidden from the list.`)) {
      const result = await archiveBootcamp(bootcampId);
      if (result.success) {
        fetchBootcamps();
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
        fetchBootcamps();
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
                    <span className={`status-badge ${
                      b.status === "Completed" ? "status-completed" : 
                      b.status === "Deferred" ? "status-deferred" : 
                      "status-on-going"
                    }`}>
                      {b.status || "On Going"}
                    </span>
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
                    <p>No bootcamps found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditConfigModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingBootcampId(null); }}
        bootcampId={editingBootcampId}
        onSave={fetchBootcamps}
      />
      <LinkGoogleClassroomModal
        isOpen={linkClassroomModalOpen}
        onClose={() => { setLinkClassroomModalOpen(false); setLinkingBootcampId(null); setLinkingBootcampName(""); }}
        bootcampId={linkingBootcampId}
        bootcampName={linkingBootcampName}
        onSave={fetchBootcamps}
      />
    </div>
  );
}

export default ActiveBootcampsTable;
