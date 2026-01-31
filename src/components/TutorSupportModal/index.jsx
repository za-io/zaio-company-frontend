import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { useUserStore } from "../../store/UserProvider";

const TutorSupportModal = ({ showModal, setShowModal }) => {
  const [learnerEmail, setLearnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useUserStore();

  const handleClose = () => {
    setShowModal(false);
    setLearnerEmail("");
    setError("");
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    setError("");

    if (!learnerEmail.trim()) {
      setError("Please enter a learner email address");
      return;
    }

    if (!validateEmail(learnerEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement actual session start logic here
      // This is just a placeholder for the UI
      console.log("Starting tutor session for:", learnerEmail);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just show success and close modal
      alert(`Tutor session started for ${learnerEmail}`);
      handleClose();
    } catch (err) {
      setError("Failed to start session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      centered
      size="md"
      show={showModal}
      onHide={handleClose}
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton className="bg-gray-800 text-white border-gray-700">
        <Modal.Title className="text-lg font-semibold">
          Start Tutor Support Session
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="bg-gray-800 text-white p-6">
        <div className="mb-4">
          <p className="text-gray-300 mb-4">
            Enter the email address of the learner you want to start a support session with.
          </p>
          
          <form onSubmit={handleStartSession}>
            <div className="mb-4">
              <label htmlFor="learnerEmail" className="block text-sm font-medium text-gray-300 mb-2">
                Learner Email Address
              </label>
              <input
                type="email"
                id="learnerEmail"
                value={learnerEmail}
                onChange={(e) => setLearnerEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="learner@example.com"
                disabled={loading}
              />
              {error && (
                <p className="text-red-400 text-sm mt-1">{error}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={loading || !learnerEmail.trim()}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting...
                  </div>
                ) : (
                  "Start Session"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Tutor Info */}
        <div className="mt-6 p-4 bg-gray-700 rounded-md">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Session Details</h4>
          <p className="text-xs text-gray-400">
            <strong>Tutor:</strong> {user?.company_username || user?.email}
          </p>
          <p className="text-xs text-gray-400">
            <strong>Role:</strong> {user?.role}
          </p>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default TutorSupportModal;

