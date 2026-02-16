import React, { useState, useEffect } from "react";
import { getMyTutorAvailability, setMyTutorAvailability } from "../../api/company";
import Loader from "../../components/loader/loader";

export default function TutorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [notificationEmail, setNotificationEmail] = useState("");

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await getMyTutorAvailability();
      if (res?.success && res?.data) {
        setNotificationEmail(res.data.notificationEmail || "");
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to load settings" });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await setMyTutorAvailability({
        notificationEmail: notificationEmail.trim() || undefined,
      });
      if (res?.success) {
        setMessage({ type: "success", text: "Settings saved." });
      } else {
        setMessage({ type: "error", text: res?.message || "Failed to save" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to save settings" });
    }
    setSaving(false);
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-gray-400 mb-6">
        Configure how you receive booking notifications.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label htmlFor="notificationEmail" className="block text-sm font-medium text-gray-300 mb-2">
            Notification email
          </label>
          <input
            id="notificationEmail"
            type="email"
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder="e.g. personal@example.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            When a student books a session, we’ll send the booking details to this address. Leave blank to use your account email.
          </p>
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
