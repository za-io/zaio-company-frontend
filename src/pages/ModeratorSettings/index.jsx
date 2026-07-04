import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import {
  getModeratorNotificationSettings,
  updateModeratorNotificationSettings,
} from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";

export default function ModeratorSettings() {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

  const isModerator = user?.role === "MODERATOR";

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await getModeratorNotificationSettings();
      if (res?.success && res?.data) {
        setNotificationEmail(res.data.notificationEmail || "");
        setAccountEmail(res.data.accountEmail || "");
      } else if (!res?.success) {
        setMessage({ type: "error", text: res?.message || "Failed to load settings" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to load settings" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isModerator) load();
    else setLoading(false);
  }, [isModerator]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateModeratorNotificationSettings(notificationEmail);
      if (res?.success) {
        setNotificationEmail(res.data?.notificationEmail || "");
        setAccountEmail(res.data?.accountEmail || "");
        setMessage({ type: "success", text: "Settings saved." });
      } else {
        setMessage({ type: "error", text: res?.message || "Failed to save" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to save settings" });
    }
    setSaving(false);
  };

  if (!isModerator) {
    return <Navigate to="/" replace />;
  }

  if (loading) return <Loader />;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-gray-400 mb-6">
        Configure how you receive moderation notifications.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label htmlFor="notificationEmail" className="block text-sm font-medium text-gray-300 mb-2">
            Moderation notification email
          </label>
          <input
            id="notificationEmail"
            type="email"
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder="e.g. personal@example.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            We email you when a moderation sample is assigned to you, including the module name.
            Leave blank to use your account email{accountEmail ? ` (${accountEmail})` : ""}.
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
          className="px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
