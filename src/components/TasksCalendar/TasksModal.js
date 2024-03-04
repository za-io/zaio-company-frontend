import { useContext } from "react";
import { Modal } from "react-bootstrap";
import Event from "./Event";
import { TasksContext } from "../../context/TasksProvider";

export const TasksModal = () => {
  const { showModal, setShowModal, tasks } = useContext(TasksContext);
  const handleClose = () => setShowModal(false);
  return (
    <Modal
      centered
      show={showModal}
      onHide={handleClose}
      style={{
        background: "#00000030",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          minHeight: 500,
          maxHeight: 500,
          overflow: "scroll",
        }}
        className="rounded border"
      >
        {tasks.map((event, i) => (
          <Event isModal event={event} key={i} />
        ))}
      </div>
    </Modal>
  );
};
