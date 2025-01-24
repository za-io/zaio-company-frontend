import { useState } from "react";
import { Modal } from "react-bootstrap";
import Loader from "../../components/loader/loader";
import { unEnrollStudent, updateTutor } from "../../api/student";

export const StudentMoreActionsModal = ({
  showModal,
  setShowModal,
  bootcampId,
  tutors,
  getAnalytics,
}) => {
  const [loading, setLoading] = useState(false);
  const [changedTutor, setChangedTutor] = useState(showModal?.tutor?._id);

  const handleClose = () => {
    setShowModal(false);
  };

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

  const removeStudentFromBootcamp = (e) => {
    const confirmationCode = window.prompt(
      "Enter the secret code to confirm deletion:"
    );

    if (confirmationCode !== "12341234") {
      alert("Invalid code. Deletion canceled.");
      return;
    }

    e.preventDefault();
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

  return (
    <Modal
      centered
      size="lg"
      show={showModal}
      onHide={handleClose}
      style={{
        width: "100vw",
        height: "100vh",
        margin: "auto",
        padding: "auto",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          height: "100%",
          width: "100%",
          margin: "0px !important",
          padding: "0px !important",
        }}
        className="p-4"
      >
        <button
          onClick={removeStudentFromBootcamp}
          className="btn btn-danger mb-5 mt-2"
        >
          Remove the student from Bootcamp
        </button>
        <p className="text-lg text-bold text-weight-500">
          Update Tutor for {showModal?.userid?.email}:
        </p>
        <p className="text-lg text-bold text-weight-700 mb-3">
          Current Tutor:{" "}
          {showModal?.tutor?.company_username || showModal?.tutor?.email}
        </p>
        <div className="flex items-center">
          New Tutor:
          <select
            className="p-2"
            value={changedTutor}
            onChange={(event) => {
              const selectedOption = event.target.value;
              setChangedTutor(selectedOption);
            }}
          >
            {tutors.map((tutor) => (
              <option
                value={tutor._id}
                disabled={tutor?._id === showModal?.tutor?._id}
              >
                {tutor.company_username || tutor.email}
              </option>
            ))}
          </select>
          <button
            onClick={handleSubmit}
            type="button"
            className="ml-2 p-1 bg-green-100 rounded-full"
            disabled={loading}
          >
            Save Changes
          </button>
        </div>

        {loading && <Loader size={20} />}
      </div>
    </Modal>
  );
};
