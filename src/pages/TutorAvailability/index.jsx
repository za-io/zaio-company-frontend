import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getMyTutorAvailability,
  setMyTutorAvailability,
  getGoogleCalendarAuthUrl,
  disconnectGoogleCalendar,
} from "../../api/company";
import Loader from "../../components/loader/loader";

const DAYS = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

const SLOT_DURATIONS = [15, 30, 45, 60];

const defaultDaySlot = (dayOfWeek) => ({
  dayOfWeek,
  startTime: "09:00",
  endTime: "17:00",
});

export default function TutorAvailability() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [weeklySlots, setWeeklySlots] = useState(() =>
    DAYS.map((d) => defaultDaySlot(d.value))
  );
  const [enabledDays, setEnabledDays] = useState(() =>
    DAYS.reduce((acc, d) => ({ ...acc, [d.value]: false }), {})
  );
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [calendarDisconnecting, setCalendarDisconnecting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const availRes = await getMyTutorAvailability();
      if (availRes?.success && availRes?.data) {
        setSlotDurationMinutes(
          availRes.data.slotDurationMinutes ?? 30
        );
        setGoogleCalendarConnected(!!availRes.data.googleCalendarConnected);
        if (availRes.data.weeklySlots?.length) {
          const byDay = {};
          availRes.data.weeklySlots.forEach((s) => {
            byDay[s.dayOfWeek] = {
              startTime: s.startTime || "09:00",
              endTime: s.endTime || "17:00",
            };
          });
          setWeeklySlots(
            DAYS.map((d) => ({
              dayOfWeek: d.value,
              startTime: byDay[d.value]?.startTime ?? "09:00",
              endTime: byDay[d.value]?.endTime ?? "17:00",
            }))
          );
          const enabled = {};
          availRes.data.weeklySlots.forEach((s) => {
            enabled[s.dayOfWeek] = !!(s.startTime && s.endTime);
          });
          setEnabledDays((prev) => ({ ...prev, ...enabled }));
        }
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to load availability" });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Handle return from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("google_calendar");
    if (status === "connected") {
      setMessage({ type: "success", text: "Google Calendar connected. New bookings will get a real Google Meet link." });
      setGoogleCalendarConnected(true);
      navigate(location.pathname, { replace: true });
    } else if (status === "error") {
      const msg = params.get("message") || "Connection failed";
      setMessage({ type: "error", text: `Google Calendar: ${decodeURIComponent(msg)}` });
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  const handleConnectGoogleCalendar = async () => {
    const res = await getGoogleCalendarAuthUrl();
    if (res?.success && res?.authUrl) {
      window.location.href = res.authUrl;
    } else {
      setMessage({ type: "error", text: res?.message || "Could not get Google sign-in URL" });
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    setCalendarDisconnecting(true);
    setMessage(null);
    const res = await disconnectGoogleCalendar();
    if (res?.success) {
      setGoogleCalendarConnected(false);
      setMessage({ type: "success", text: "Google Calendar disconnected." });
    } else {
      setMessage({ type: "error", text: res?.message || "Failed to disconnect" });
    }
    setCalendarDisconnecting(false);
  };

  const handleDayToggle = (dayOfWeek) => {
    setEnabledDays((prev) => ({ ...prev, [dayOfWeek]: !prev[dayOfWeek] }));
  };

  const handleTimeChange = (dayOfWeek, field, value) => {
    setWeeklySlots((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const slotsToSave = weeklySlots
      .filter((s) => enabledDays[s.dayOfWeek])
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
    try {
      const res = await setMyTutorAvailability({
        slotDurationMinutes,
        weeklySlots: slotsToSave,
      });
      if (res?.success) {
        setMessage({ type: "success", text: "Availability saved." });
      } else {
        setMessage({ type: "error", text: res?.message || "Save failed" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to save" });
    }
    setSaving(false);
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">
        My availability
      </h1>
      <p className="text-gray-400 mb-6">
        Set when students can book tutor sessions. You’ll receive calendar
        invites for each booking.
      </p>

      {message && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg ${
            message.type === "success"
              ? "bg-emerald-900/40 text-emerald-300"
              : "bg-red-900/40 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Slot duration */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Session length
        </label>
        <select
          value={slotDurationMinutes}
          onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
          className="w-full max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
        >
          {SLOT_DURATIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </div>

      {/* Per-day availability */}
      <div className="space-y-4 mb-8">
        {DAYS.map(({ label, value: dayOfWeek }) => (
          <div
            key={dayOfWeek}
            className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <label className="flex items-center gap-2 cursor-pointer min-w-[140px]">
              <input
                type="checkbox"
                checked={!!enabledDays[dayOfWeek]}
                onChange={() => handleDayToggle(dayOfWeek)}
                className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-white">{label}</span>
            </label>
            {enabledDays[dayOfWeek] && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">From</span>
                  <input
                    type="time"
                    value={weeklySlots.find((s) => s.dayOfWeek === dayOfWeek)?.startTime || "09:00"}
                    onChange={(e) =>
                      handleTimeChange(dayOfWeek, "startTime", e.target.value)
                    }
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">To</span>
                  <input
                    type="time"
                    value={weeklySlots.find((s) => s.dayOfWeek === dayOfWeek)?.endTime || "17:00"}
                    onChange={(e) =>
                      handleTimeChange(dayOfWeek, "endTime", e.target.value)
                    }
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Connect Google Calendar */}
      <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Google Calendar</p>
              <p className="text-gray-500 text-sm">
                {googleCalendarConnected
                  ? "Connected. New bookings will create a Google Calendar event with a real Google Meet link."
                  : "Connect your calendar to create real Google Meet links for each booking and add events to your calendar."}
              </p>
            </div>
          </div>
          <div>
            {googleCalendarConnected ? (
              <button
                type="button"
                onClick={handleDisconnectGoogleCalendar}
                disabled={calendarDisconnecting}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 disabled:opacity-50 text-sm"
              >
                {calendarDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogleCalendar}
                className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20 text-sm font-medium inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Connect Google Calendar
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save availability"}
      </button>
    </div>
  );
}
