import { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import Loader from "../../components/loader/loader";
import {
  markBootcampCompleted,
  unEnrollStudent,
  updateTutor,
  undoRevokeLPAndBootcampAccess,
  revokeLPAndBootcampAccess,
  updateStudentNumber,
} from "../../api/student";

const inputClass =
  "w-full px-4 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-400 mb-1";

export const StudentMoreActionsModal = ({
  showModal,
  setShowModal,
  bootcampId,
  tutors,
  getAnalytics,
}) => {
  const [loading, setLoading] = useState(false);
  const [changedTutor, setChangedTutor] = useState(showModal?.tutor?._id);
  const [studentNumberValue, setStudentNumberValue] = useState(showModal?.userid?.studentNumber ?? "");
  const [studentNumberSaving, setStudentNumberSaving] = useState(false);
  const [studentNumberMessage, setStudentNumberMessage] = useState(null);

  const handleClose = () => {
    setShowModal(false);
  };

  useEffect(() => {
    if (showModal) {
      setChangedTutor(showModal?.tutor?._id);
      setStudentNumberValue(showModal?.userid?.studentNumber ?? "");
      setStudentNumberMessage(null);
    }
  }, [showModal?.userid?._id, showModal?.tutor?._id, showModal?.userid?.studentNumber]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    updateTutor({
      userid: showModal?.userid?._id,
      bootcampid: bootcampId,
      newAssignedTutor: changedTutor,
    })
      .then((res) => {
        handleClose();
        getAnalytics();
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  const removeStudentFromBootcamp = () => {
    const confirmationCode = window.prompt(
      "Enter the secret code to confirm deletion:"
    );

    if (confirmationCode !== "12341234") {
      alert("Invalid code. Deletion canceled.");
      return;
    }

    setLoading(true);
    unEnrollStudent({
      userid: showModal?.userid?._id,
      bootcampid: bootcampId,
    })
      .then((res) => {
        handleClose();
        getAnalytics();
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  const passStudentBootcamp = (e) => {
    const confirmationCode = window.prompt(
      "Write confirm to proceed:"
    );

    if (confirmationCode !== "confirm") {
      alert("Invalid. Operation canceled.");
      return;
    }

    e.preventDefault();
    setLoading(true);
    markBootcampCompleted(
      bootcampId,
      showModal?.userid?._id,
    )
      .then((res) => {
        handleClose();
        getAnalytics();
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  const revokeStudentAccess = () => {
    const confirmationCode = window.prompt(
      "Enter the secret code to confirm revoke access:"
    );

    if (confirmationCode !== "12341234") {
      alert("Invalid code. Deletion canceled.");
      return;
    }

    setLoading(true);
    revokeLPAndBootcampAccess({
      userid: showModal?.userid?._id,
      bootcampid: bootcampId,
    })
      .then((res) => {
        handleClose();
        getAnalytics();
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  const handleLinkStudentNumber = () => {
    const userId = showModal?.userid?._id;
    if (!userId) return;
    setStudentNumberSaving(true);
    setStudentNumberMessage(null);
    updateStudentNumber(userId, studentNumberValue.trim() || null)
      .then((res) => {
        if (res?.success) {
          setStudentNumberMessage("Student number saved.");
          getAnalytics();
        } else {
          setStudentNumberMessage(res?.message || "Failed to save.");
        }
      })
      .catch((err) => {
        setStudentNumberMessage(err?.response?.data?.message || "Failed to save.");
      })
      .finally(() => {
        setStudentNumberSaving(false);
      });
  };

  const undoRevokeStudentAccess = () => {
    const confirmationCode = window.prompt(
      "Enter the secret code to confirm undo revoke access:"
    );

    if (confirmationCode !== "12341234") {
      alert("Invalid code. Deletion canceled.");
      return;
    }

    setLoading(true);
    undoRevokeLPAndBootcampAccess({
      userid: showModal?.userid?._id,
      bootcampid: bootcampId,
    })
      .then((res) => {
        handleClose();
        getAnalytics();
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Modal
      centered
      size="lg"
      show={showModal}
      onHide={handleClose}
      contentClassName="bg-[#161B22] border border-gray-700 rounded-xl shadow-xl"
      className="text-white"
    >
      <Modal.Header closeButton closeVariant="white" className="border-gray-700 bg-[#161B22]">
        <Modal.Title className="text-lg font-semibold text-white">
          Student actions – {showModal?.userid?.email}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-[#161B22] border-gray-700 p-6">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={removeStudentFromBootcamp}
            className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Remove the student from Bootcamp
          </button>
          <button
            type="button"
            onClick={
              showModal?.accessRevoked
                ? undoRevokeStudentAccess
                : revokeStudentAccess
            }
            className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {showModal?.accessRevoked ? "Undo Revoke Access" : "Revoke Access"}
          </button>
          <button
            type="button"
            onClick={passStudentBootcamp}
            className="px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Pass student
          </button>
        </div>

        <div className="border-t border-gray-700 pt-6">
          {/* Link Student Number */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-white mb-1">
              Link student number
            </p>
            <p className="text-sm text-gray-400 mb-2">
              Current: {showModal?.userid?.studentNumber || "Not set"}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                className={inputClass}
                placeholder="Enter student number"
                value={studentNumberValue}
                onChange={(e) => setStudentNumberValue(e.target.value)}
                maxLength={50}
              />
              <button
                type="button"
                onClick={handleLinkStudentNumber}
                className="px-4 py-2 rounded-lg font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50"
                disabled={studentNumberSaving}
              >
                {studentNumberSaving ? "Saving..." : "Save"}
              </button>
            </div>
            {studentNumberMessage && (
              <p className={`text-sm mt-2 ${studentNumberMessage.includes("saved") ? "text-green-400" : "text-red-400"}`}>
                {studentNumberMessage}
              </p>
            )}
          </div>

          {/* Update Tutor */}
          <div>
            <p className="text-sm font-semibold text-white mb-1">
              Update Tutor for {showModal?.userid?.email}
            </p>
            <p className="text-sm text-gray-400 mb-3">
              Current Tutor: {showModal?.tutor?.company_username || showModal?.tutor?.email}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className={labelClass + " mb-0"}>New Tutor:</label>
              <select
                className={`${inputClass} max-w-[240px]`}
                value={changedTutor}
                onChange={(e) => setChangedTutor(e.target.value)}
              >
                {tutors.map((tutor) => (
                  <option
                    key={tutor._id}
                    value={tutor._id}
                    disabled={tutor?._id === showModal?.tutor?._id}
                  >
                    {tutor.company_username || tutor.email}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                disabled={loading}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-4 flex items-center justify-center">
            <Loader size={20} />
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};
