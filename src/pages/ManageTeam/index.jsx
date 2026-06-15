import { useCallback, useEffect, useMemo, useState } from "react";
import Loader from "../../components/loader/loader";
import {
  getTeamMembers,
  updateTeamMemberPassword,
  updateTeamMemberRatePerCredit,
} from "../../api/company";
import { useUserStore } from "../../store/UserProvider";

const TABS = [
  { id: "assessors", label: "Assessors" },
  { id: "moderators", label: "Moderators" },
  { id: "tutors", label: "Tutors" },
];

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function TeamMemberRow({
  member,
  showRate,
  rateDraft,
  passwordDraft,
  savingRate,
  savingPassword,
  onRateChange,
  onPasswordChange,
  onSaveRate,
  onSavePassword,
}) {
  return (
    <tr className="border-b border-gray-800/80 hover:bg-gray-800/30">
      <td className="px-4 py-3 text-white font-medium">{member.company_username || "—"}</td>
      <td className="px-4 py-3 text-gray-300 text-sm">{member.email || "—"}</td>
      {showRate && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 max-w-[220px]">
            <input
              type="number"
              min="0"
              step="0.01"
              value={rateDraft}
              onChange={(e) => onRateChange(member._id, e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
            <button
              type="button"
              onClick={() => onSaveRate(member._id)}
              disabled={savingRate}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
            >
              {savingRate ? "Saving…" : "Save"}
            </button>
          </div>
        </td>
      )}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 max-w-[280px]">
          <input
            type="password"
            value={passwordDraft}
            onChange={(e) => onPasswordChange(member._id, e.target.value)}
            className={inputClass}
            placeholder="New password"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => onSavePassword(member._id)}
            disabled={savingPassword}
            className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 disabled:opacity-50 whitespace-nowrap"
          >
            {savingPassword ? "Saving…" : "Reset"}
          </button>
        </div>
      </td>
    </tr>
  );
}

const ManageTeam = () => {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("assessors");
  const [team, setTeam] = useState({ tutors: [], assessors: [], moderators: [] });
  const [message, setMessage] = useState(null);
  const [rateDrafts, setRateDrafts] = useState({});
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [savingRateId, setSavingRateId] = useState(null);
  const [savingPasswordId, setSavingPasswordId] = useState(null);

  const canManage = ["SUPER_ADMIN", "SUPER_STUDENT_ADMIN"].includes(user?.role);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const res = await getTeamMembers();
    if (!res?.success) {
      setMessage(res?.message || "Could not load team members");
      setLoading(false);
      return;
    }
    const data = res.data || {};
    setTeam({
      tutors: data.tutors || [],
      assessors: data.assessors || [],
      moderators: data.moderators || [],
    });
    const nextRates = {};
    [...(data.assessors || []), ...(data.moderators || [])].forEach((m) => {
      nextRates[m._id] =
        m.ratePerCredit != null && m.ratePerCredit !== ""
          ? String(m.ratePerCredit)
          : "";
    });
    setRateDrafts(nextRates);
    setPasswordDrafts({});
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canManage) loadTeam();
    else setLoading(false);
  }, [canManage, loadTeam]);

  const activeMembers = useMemo(() => {
    if (activeTab === "tutors") return team.tutors;
    if (activeTab === "moderators") return team.moderators;
    return team.assessors;
  }, [activeTab, team]);

  const showRateColumn = activeTab === "assessors" || activeTab === "moderators";

  const handleSaveRate = async (memberId) => {
    const raw = rateDrafts[memberId];
    const ratePerCredit = Number(raw);
    if (!Number.isFinite(ratePerCredit) || ratePerCredit < 0) {
      setMessage("Enter a valid non-negative rate per credit.");
      return;
    }
    setSavingRateId(memberId);
    setMessage(null);
    const res = await updateTeamMemberRatePerCredit(memberId, ratePerCredit);
    setSavingRateId(null);
    if (!res?.success) {
      setMessage(res?.message || "Failed to save rate");
      return;
    }
    setMessage("Rate per credit saved.");
    await loadTeam();
  };

  const handleSavePassword = async (memberId) => {
    const password = (passwordDrafts[memberId] || "").trim();
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    setSavingPasswordId(memberId);
    setMessage(null);
    const res = await updateTeamMemberPassword(memberId, password);
    setSavingPasswordId(null);
    if (!res?.success) {
      setMessage(res?.message || "Failed to reset password");
      return;
    }
    setPasswordDrafts((prev) => ({ ...prev, [memberId]: "" }));
    setMessage("Password updated successfully.");
  };

  if (!canManage) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center text-gray-300">
        You do not have permission to manage the team.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Manage Team</h1>
        <p className="text-gray-400 mt-2 text-sm">
          View assessors, moderators, and tutors. Set rate per credit for assessors and moderators, and reset passwords.
        </p>
      </div>

      {message && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-100 text-sm">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-75">
              ({team[tab.id]?.length ?? 0})
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-800 overflow-hidden bg-[#161B22]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/60 text-gray-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                {showRateColumn && (
                  <th className="px-4 py-3 font-medium">Rate per credit (R)</th>
                )}
                <th className="px-4 py-3 font-medium">Password</th>
              </tr>
            </thead>
            <tbody>
              {activeMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={showRateColumn ? 4 : 3}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No {activeTab} found.
                  </td>
                </tr>
              ) : (
                activeMembers.map((member) => (
                  <TeamMemberRow
                    key={member._id}
                    member={member}
                    showRate={showRateColumn}
                    rateDraft={rateDrafts[member._id] ?? ""}
                    passwordDraft={passwordDrafts[member._id] ?? ""}
                    savingRate={savingRateId === member._id}
                    savingPassword={savingPasswordId === member._id}
                    onRateChange={(id, value) =>
                      setRateDrafts((prev) => ({ ...prev, [id]: value }))
                    }
                    onPasswordChange={(id, value) =>
                      setPasswordDrafts((prev) => ({ ...prev, [id]: value }))
                    }
                    onSaveRate={handleSaveRate}
                    onSavePassword={handleSavePassword}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageTeam;
