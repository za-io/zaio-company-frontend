import { useEffect, useState } from "react";
import { getAllLPs, createOCCohort } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-gray-600 bg-[#0D1117] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-400 mb-2";

const COHORT_NAME_OPTIONS = [
  "AI Developer",
  "Software Developer",
  "Cyber Security Analyst",
  "Data Science Practitioner",
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear + 1, currentYear + 2];
};

const CreateOCCohort = () => {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [lpList, setLpList] = useState([]);
  const [qctoLpList, setQctoLpList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [formData, setFormData] = useState({
    cohortNameBase: "",
    cohortMonth: "",
    cohortYear: "",
    learningPath: "",
    nonQctoLearningPath: "",
    studentEmails: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const fetchLearningPaths = () => {
      setLoading(true);
      Promise.all([getAllLPs(false), getAllLPs(true)])
        .then(([allRes, qctoRes]) => {
          if (allRes?.status === 200) setLpList(allRes?.allLps || []);
          if (qctoRes?.status === 200) setQctoLpList(qctoRes?.allLps || []);
        })
        .catch((err) => {
          console.error("Error fetching learning paths:", err);
          setMsg("Error loading learning paths");
        })
        .finally(() => {
          setLoading(false);
        });
    };

    fetchLearningPaths();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "learningPath" && prev.nonQctoLearningPath === value) {
        next.nonQctoLearningPath = "";
      }
      if (name === "nonQctoLearningPath" && prev.learningPath === value) {
        next.nonQctoLearningPath = "";
      }
      return next;
    });
  };

  const generatedCohortName =
    formData.cohortNameBase && formData.cohortMonth && formData.cohortYear
      ? `${formData.cohortNameBase} ${formData.cohortMonth} ${formData.cohortYear}`
      : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!formData.cohortNameBase || !formData.cohortMonth || !formData.cohortYear) {
      setMsg("Please select occupation, month and year for the cohort name");
      return;
    }

    if (!formData.learningPath) {
      setMsg("Please select a learning path");
      return;
    }

    if (!formData.studentEmails.trim()) {
      setMsg("Please enter student emails");
      return;
    }

    const cohortName = `${formData.cohortNameBase} ${formData.cohortMonth} ${formData.cohortYear}`;

    setLoading(true);
    try {
      const payload = {
        cohortName,
        learningPath: formData.learningPath,
        nonQctoLearningPath: formData.nonQctoLearningPath || undefined,
        studentEmails: formData.studentEmails,
        date: formData.date,
        company_id: user?._id,
      };

      const response = await createOCCohort(payload);

      if (response.status === 200 && response.success) {
        setMsg(
          `OC Cohort created successfully!${
            response.data?.missingEmails?.length > 0
              ? ` Note: ${response.data.missingEmails.length} email(s) were not found in the system.`
              : ""
          }`
        );
        setFormData({
          cohortNameBase: "",
          cohortMonth: "",
          cohortYear: "",
          learningPath: "",
          nonQctoLearningPath: "",
          studentEmails: "",
          date: new Date().toISOString().split("T")[0],
        });
      } else {
        setMsg(response.message || "Error creating OC Cohort");
      }
    } catch (error) {
      console.error("Error creating OC Cohort:", error);
      setMsg(
        error.response?.data?.message || "Error creating OC Cohort. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] px-6 md:px-12 lg:px-24 xl:px-36 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Create OC Cohort</h1>
        <p className="text-gray-400">Create a new Occupation Certificate cohort and assign students to a learning path</p>
      </div>

      {/* Form Card */}
      <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">New OC Cohort</h2>
            <p className="text-sm text-gray-400">Fill in the details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cohort Name: Occupation + Month + Year */}
          <div>
            <label className={labelClass}>
              Occupation Certificate Cohort Name
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="cohortNameBase" className="sr-only">Occupation</label>
                <select
                  className={inputClass}
                  name="cohortNameBase"
                  id="cohortNameBase"
                  value={formData.cohortNameBase}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Occupation</option>
                  {COHORT_NAME_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cohortMonth" className="sr-only">Month</label>
                <select
                  className={inputClass}
                  name="cohortMonth"
                  id="cohortMonth"
                  value={formData.cohortMonth}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Month</option>
                  {MONTH_NAMES.map((month, i) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cohortYear" className="sr-only">Year</label>
                <select
                  className={inputClass}
                  name="cohortYear"
                  id="cohortYear"
                  value={formData.cohortYear}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Year</option>
                  {getYearOptions().map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {generatedCohortName && (
              <p className="text-gray-400 text-sm mt-2">
                Cohort name: <span className="text-white font-medium">{generatedCohortName}</span>
              </p>
            )}
          </div>

          {/* OC (QCTO) Learning Path */}
          <div>
            <label htmlFor="learningPath" className={labelClass}>
              Select OC (QCTO) Learning Path
            </label>
            <select
              className={inputClass}
              name="learningPath"
              id="learningPath"
              value={formData.learningPath}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Select OC Learning Path --</option>
              {qctoLpList.map((lp) => (
                <option key={lp._id} value={lp._id}>
                  {lp.learningpathname}
                </option>
              ))}
            </select>
          </div>

          {/* Non-QCTO Learning Path (optional – students enrolled in both) */}
          <div>
            <label htmlFor="nonQctoLearningPath" className={labelClass}>
              Non-QCTO Learning Path (optional)
            </label>
            <select
              className={inputClass}
              name="nonQctoLearningPath"
              id="nonQctoLearningPath"
              value={formData.nonQctoLearningPath}
              onChange={handleInputChange}
            >
              <option value="">-- None (OC path only) --</option>
              {lpList
                .filter((lp) => lp._id !== formData.learningPath && !qctoLpList.some((q) => q._id === lp._id))
                .map((lp) => (
                  <option key={lp._id} value={lp._id}>
                    {lp.learningpathname}
                  </option>
                ))}
            </select>
            <p className="text-gray-500 text-xs mt-1">
              If selected, students will be enrolled in both the OC learning path and this non-QCTO path.
            </p>
          </div>

          {/* Student Emails */}
          <div>
            <label htmlFor="studentEmails" className={labelClass}>
              Student Emails
            </label>
            <textarea
              className={`${inputClass} min-h-[120px]`}
              name="studentEmails"
              id="studentEmails"
              placeholder="student1@example.com, student2@example.com"
              value={formData.studentEmails}
              onChange={handleInputChange}
              rows={4}
              required
            />
            <p className="text-gray-500 text-xs mt-1">Enter emails as comma-separated values</p>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className={labelClass}>
              Date
            </label>
            <input
              className={inputClass}
              name="date"
              id="date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Message */}
          {msg && (
            <p className={`text-sm ${msg.includes("successfully") ? "text-green-400" : "text-red-400"}`}>
              {msg}
            </p>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create OC Cohort"}
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default CreateOCCohort;
