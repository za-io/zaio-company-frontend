import React, { useEffect, useState } from "react";
import {
  getCourseEnrolledUser,
  getLearningpathEnrolledUser,
  getUserBootcampAnalytics,
} from "../../api/student";
import {
  addIntoExiting,
  createAccountsForEmails,
  createOrLinkAccountWithStudentNumber,
  getBootcampConfig,
  getAllTutors,
} from "../../api/company";
import Loader from "../../components/loader/loader";
import AnalyticsTable from "./table";
import { useSearchParams } from "react-router-dom";
import LPAnalyticsTable from "./learningpath.index";
import CourseAnalyticsTable from "./course.index";
import { useUserStore } from "../../store/UserProvider";

const calcSearchType = (bootcampid, learningpathid, courseid) => {
  if (bootcampid) {
    return "bootcamp";
  } else if (learningpathid) {
    return "learningpath";
  } else if (courseid) {
    return "course";
  } else {
    return null;
  }
};

const StudentAnalytics = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const bootcampid = searchParams.get("bootcamp");
  const learningpathid = searchParams.get("learningpath");
  const courseid = searchParams.get("course");

  const [loading, setLoading] = useState(false);
  const [bootcampId, setBootcampId] = useState(bootcampid || null);
  const [learningpathId, setLearningpathId] = useState(learningpathid || null);
  const [courseId, setCourseId] = useState(courseid || null);
  const [userId] = useState("636d6613a75d3600222f1875");
  const [searchType, setSearchType] = useState(
    calcSearchType(bootcampid, learningpathid, courseid)
  );
  const [bootcamp, setBootcamp] = useState(null);
  const [learningpath, setLearningpath] = useState(null);
  const [course, setCourse] = useState(null);
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [addStudentsEmails, setAddStudentsEmails] = useState("");
  const [addStudentsCreateAccounts, setAddStudentsCreateAccounts] = useState(true);
  const [addStudentsMessage, setAddStudentsMessage] = useState(null);
  const [addStudentsSubmitting, setAddStudentsSubmitting] = useState(false);
  const [addSingleStudentOpen, setAddSingleStudentOpen] = useState(false);
  const [addSingleStudentEmail, setAddSingleStudentEmail] = useState("");
  const [addSingleStudentNumber, setAddSingleStudentNumber] = useState("");
  const [addSingleStudentMessage, setAddSingleStudentMessage] = useState(null);
  const [addSingleStudentSubmitting, setAddSingleStudentSubmitting] = useState(false);
  const { user } = useUserStore();

  const fetchDropdownData = async () => {
    if (searchType) {
      getAnalytics();
    } else {
      setLoading(false);
    }
  };

  const setParams = (key, value, deleteArr) => {
    searchParams.set(key, value);

    deleteArr?.forEach((key) => {
      searchParams.delete(key);
    });

    setSearchParams(searchParams);
  };

  const getAnalytics = () => {
    setLoading(true);
    setBootcamp(null);
    setLearningpath(null);
    setCourse(null);
    console.log(searchType);

    if (searchType === "bootcamp") {
      setLoading("Please wait fetching bootcamp data");

      setParams("bootcamp", bootcampId, ["learningpath", "course"]);

      getUserBootcampAnalytics(userId, bootcampId)
        .then((res) => {
          setBootcamp(res);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (searchType === "learningpath") {
      setLoading("Please wait fetching learningpath data");

      setParams("learningpath", learningpathId, ["bootcamp", "course"]);

      getLearningpathEnrolledUser(learningpathId)
        .then((res) => {
          setLearningpath(res);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (searchType === "course") {
      setLoading("Please wait fetching course data");

      setParams("course", courseId, ["bootcamp", "learningpath"]);

      getCourseEnrolledUser(courseId)
        .then((res) => {
          setCourse(res);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchDropdownData();
    // eslint-disable-next-line
  }, []);
  return (
    <div className="min-h-screen bg-[#0D1117] px-6 md:px-12 lg:px-24 xl:px-36 py-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Student Analytics</h1>
        {searchType === "bootcamp" && bootcampId && !["TUTOR"]?.includes(user?.role) && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAddStudentsEmails("");
                setAddStudentsMessage(null);
                setAddStudentsOpen(true);
              }}
              className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Add students
            </button>
            <button
              type="button"
              onClick={() => {
                setAddSingleStudentEmail("");
                setAddSingleStudentNumber("");
                setAddSingleStudentMessage(null);
                setAddSingleStudentOpen(true);
              }}
              className="px-4 py-2 rounded-lg font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
            >
              Add Single student
            </button>
          </div>
        )}
      </div>

      {/* Add students modal */}
      {addStudentsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#161B22] rounded-xl border border-gray-700 max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Add students to bootcamp</h2>
            <p className="text-gray-400 text-sm mb-4">
              Enter comma-separated emails. Students will be enrolled using this bootcamp&apos;s saved config (start date, committed mins, holidays).
            </p>
            <textarea
              value={addStudentsEmails}
              onChange={(e) => setAddStudentsEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-[#0D1117] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 min-h-[100px]"
              rows={4}
            />
            <label className="flex items-center gap-2 text-gray-300 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={addStudentsCreateAccounts}
                onChange={(e) => setAddStudentsCreateAccounts(e.target.checked)}
                className="rounded border-gray-600 bg-[#0D1117] text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Create accounts if email not found</span>
            </label>
            {addStudentsMessage && (
              <p className={`text-sm mb-4 ${addStudentsMessage.type === "error" ? "text-red-400" : "text-green-400"}`}>
                {addStudentsMessage.text}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddStudentsOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addStudentsSubmitting}
                onClick={async () => {
                  const emails = addStudentsEmails
                    .split(/[\s,]+/)
                    .map((e) => e.trim().toLowerCase())
                    .filter(Boolean);
                  if (!emails.length) {
                    setAddStudentsMessage({ type: "error", text: "Enter at least one email." });
                    return;
                  }
                  setAddStudentsSubmitting(true);
                  setAddStudentsMessage(null);
                  try {
                    if (addStudentsCreateAccounts) {
                      const createRes = await createAccountsForEmails({ emails });
                      if (createRes?.success === false && createRes?.message) {
                        setAddStudentsMessage({ type: "error", text: createRes.message });
                        setAddStudentsSubmitting(false);
                        return;
                      }
                    }
                    const configRes = await getBootcampConfig(bootcampId);
                    if (!configRes?.success || !configRes?.bootcamp) {
                      setAddStudentsMessage({ type: "error", text: configRes?.message || "Failed to load bootcamp config." });
                      setAddStudentsSubmitting(false);
                      return;
                    }
                    const bc = configRes.bootcamp;
                    const tutorsRes = await getAllTutors();
                    const tutorList = Array.isArray(tutorsRes) ? tutorsRes : tutorsRes?.data || tutorsRes?.tutors || [];
                    const tutorIds = tutorList.map((t) => t._id).filter(Boolean);
                    const startDate = bc.startDate ? (typeof bc.startDate === "string" ? bc.startDate.split("T")[0] : bc.startDate) : null;
                    if (!startDate) {
                      setAddStudentsMessage({ type: "error", text: "Bootcamp has no start date. Set it in bootcamp config first." });
                      setAddStudentsSubmitting(false);
                      return;
                    }
                    const res = await addIntoExiting({
                      bootcampDocId: bootcampId,
                      emails: emails.join(","),
                      startDate,
                      commitedMins: bc.commitedMins ?? 360,
                      holidays: bc.holidays || "",
                      selectedWeekdays: bc.selectedWeekdays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                      tutors: tutorIds,
                      googleClassroom: "",
                    });
                    if (res?.status === 200) {
                      setAddStudentsMessage({ type: "success", text: "Students enrolled successfully." });
                      setAddStudentsEmails("");
                      getAnalytics();
                      setTimeout(() => {
                        setAddStudentsOpen(false);
                      }, 1500);
                    } else {
                      setAddStudentsMessage({ type: "error", text: res?.errMsg || "Enrollment failed." });
                    }
                  } catch (err) {
                    setAddStudentsMessage({ type: "error", text: err?.response?.data?.errMsg || err?.message || "Something went wrong." });
                  } finally {
                    setAddStudentsSubmitting(false);
                  }
                }}
                className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addStudentsSubmitting
                  ? (addStudentsCreateAccounts ? "Enrolling…" : "Adding…")
                  : (addStudentsCreateAccounts ? "Enroll students" : "Add students")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single student modal */}
      {addSingleStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#161B22] rounded-xl border border-gray-700 max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Add Single student to bootcamp</h2>
            <p className="text-gray-400 text-sm mb-4">
              Enter email and student number. The student number will be linked to the account (or used as password for new accounts), then the student will be enrolled.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
              <input
                type="email"
                placeholder="student@example.com"
                value={addSingleStudentEmail}
                onChange={(e) => setAddSingleStudentEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-[#0D1117] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Student number</label>
              <input
                type="text"
                placeholder="STU12345"
                value={addSingleStudentNumber}
                onChange={(e) => setAddSingleStudentNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-[#0D1117] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {addSingleStudentMessage && (
              <p className={`text-sm mb-4 ${addSingleStudentMessage.type === "error" ? "text-red-400" : "text-green-400"}`}>
                {addSingleStudentMessage.text}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddSingleStudentOpen(false);
                  setAddSingleStudentEmail("");
                  setAddSingleStudentNumber("");
                  setAddSingleStudentMessage(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addSingleStudentSubmitting}
                onClick={async () => {
                  const email = addSingleStudentEmail.trim().toLowerCase();
                  const studentNumber = addSingleStudentNumber.trim();
                  if (!email) {
                    setAddSingleStudentMessage({ type: "error", text: "Enter email address." });
                    return;
                  }
                  if (!studentNumber) {
                    setAddSingleStudentMessage({ type: "error", text: "Enter student number." });
                    return;
                  }
                  setAddSingleStudentSubmitting(true);
                  setAddSingleStudentMessage(null);
                  try {
                    const linkRes = await createOrLinkAccountWithStudentNumber({ email, student_number: studentNumber });
                    if (!linkRes?.success) {
                      setAddSingleStudentMessage({ type: "error", text: linkRes?.message || "Failed to create or link account." });
                      setAddSingleStudentSubmitting(false);
                      return;
                    }
                    const configRes = await getBootcampConfig(bootcampId);
                    if (!configRes?.success || !configRes?.bootcamp) {
                      setAddSingleStudentMessage({ type: "error", text: configRes?.message || "Failed to load bootcamp config." });
                      setAddSingleStudentSubmitting(false);
                      return;
                    }
                    const bc = configRes.bootcamp;
                    const tutorsRes = await getAllTutors();
                    const tutorList = Array.isArray(tutorsRes) ? tutorsRes : tutorsRes?.data || tutorsRes?.tutors || [];
                    const tutorIds = tutorList.map((t) => t._id).filter(Boolean);
                    const startDate = bc.startDate ? (typeof bc.startDate === "string" ? bc.startDate.split("T")[0] : bc.startDate) : null;
                    if (!startDate) {
                      setAddSingleStudentMessage({ type: "error", text: "Bootcamp has no start date. Set it in bootcamp config first." });
                      setAddSingleStudentSubmitting(false);
                      return;
                    }
                    const res = await addIntoExiting({
                      bootcampDocId: bootcampId,
                      emails: email,
                      startDate,
                      commitedMins: bc.commitedMins ?? 360,
                      holidays: bc.holidays || "",
                      selectedWeekdays: bc.selectedWeekdays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                      tutors: tutorIds,
                      googleClassroom: "",
                    });
                    if (res?.status === 200) {
                      setAddSingleStudentMessage({ type: "success", text: "Student enrolled successfully." });
                      setAddSingleStudentEmail("");
                      setAddSingleStudentNumber("");
                      getAnalytics();
                      setTimeout(() => {
                        setAddSingleStudentOpen(false);
                      }, 1500);
                    } else {
                      setAddSingleStudentMessage({ type: "error", text: res?.errMsg || "Enrollment failed." });
                    }
                  } catch (err) {
                    setAddSingleStudentMessage({ type: "error", text: err?.response?.data?.errMsg || err?.message || "Something went wrong." });
                  } finally {
                    setAddSingleStudentSubmitting(false);
                  }
                }}
                className="px-4 py-2 rounded-lg font-semibold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addSingleStudentSubmitting ? "Enrolling…" : "Add Single student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tables */}
      {searchType === "bootcamp" && (
        <AnalyticsTable
          data={bootcamp?.bootcamp}
          total={bootcamp?.total}
          loading={loading}
          searchType="bootcamp"
          getAnalytics={getAnalytics}
          user={user}
          setLoading={setLoading}
        />
      )}
      {searchType === "learningpath" && (
        <LPAnalyticsTable
          data={learningpath}
          total={learningpath?.total}
          loading={loading}
          getAnalytics={getAnalytics}
        />
      )}
      {searchType === "course" && (
        <CourseAnalyticsTable
          data={course}
          total={course?.total}
          loading={loading}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader />
          <p className="mt-4 text-gray-400 text-center">{loading}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !searchType && (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-12 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No program selected</h3>
          <p className="text-gray-400">Open analytics from a bootcamp (e.g. add ?bootcamp=... to the URL or use the dashboard)</p>
        </div>
      )}
    </div>
  );
};

export default StudentAnalytics;
