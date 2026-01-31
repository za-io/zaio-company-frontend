import { useEffect, useState } from "react";
import { getAllLPs, createOCCohort } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";

const CreateOCCohort = () => {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [lpList, setLpList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [formData, setFormData] = useState({
    cohortName: "",
    learningPath: "",
    studentEmails: "",
    date: new Date().toISOString().split("T")[0], // Auto-filled with today's date
  });

  useEffect(() => {
    const fetchLearningPaths = () => {
      setLoading(true);
      getAllLPs()
        .then((res) => {
          console.log(res);
          if (res?.status === 200) {
            setLpList(res?.allLps || []);
          }
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    // Validation
    if (!formData.cohortName.trim()) {
      setMsg("Please enter a cohort name");
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

    setLoading(true);
    try {
      const payload = {
        cohortName: formData.cohortName,
        learningPath: formData.learningPath,
        studentEmails: formData.studentEmails,
        date: formData.date,
        company_id: user?._id,
      };

      const response = await createOCCohort(payload);

      if (response.status === 200 && response.success) {
        setMsg(
          `OC Cohort created successfully! ${
            response.data.missingEmails?.length > 0
              ? `Note: ${response.data.missingEmails.length} email(s) were not found in the system.`
              : ""
          }`
        );
        // Reset form after successful submission
        setFormData({
          cohortName: "",
          learningPath: "",
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
    <div className="mt-8 pb-8">
      <form onSubmit={handleSubmit} className="w-8/12 mx-auto">
        <p className="uppercase text-white text-large font-bold mb-4">
          Create New OC Cohort
        </p>

        {/* Occupation Certificate Cohort Name */}
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              htmlFor="cohortName"
            >
              Occupation Certificate Cohort Name
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="cohortName"
              id="cohortName"
              type="text"
              placeholder="Enter cohort name"
              value={formData.cohortName}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        {/* Select OC Learning Path */}
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              htmlFor="learningPath"
            >
              Select OC Learning Path
            </label>
            <select
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="learningPath"
              id="learningPath"
              value={formData.learningPath}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Select Learning Path --</option>
              {lpList.map((lp) => (
                <option key={lp._id} value={lp._id}>
                  {lp.learningpathname}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Student Emails */}
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              htmlFor="studentEmails"
            >
              Student Emails
            </label>
            <textarea
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="studentEmails"
              id="studentEmails"
              type="text"
              placeholder="student1@example.com, student2@example.com, student3@example.com"
              value={formData.studentEmails}
              onChange={handleInputChange}
              rows="4"
              required
            />
            <p className="text-white text-xs italic">
              Please enter emails as comma-separated values
            </p>
          </div>
        </div>

        {/* Date (Auto-filled) */}
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              htmlFor="date"
            >
              Date
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="date"
              id="date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        {/* Create Button */}
        <button
          className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
          disabled={loading}
        >
          Create
        </button>

        {/* Message Display */}
        {msg && (
          <p className="text-white text-md mt-3">{msg}</p>
        )}
      </form>

      {loading && (
        <div className="absolute left-0 right-0 top-0 bottom-0 flex align-center justify-center">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default CreateOCCohort;

