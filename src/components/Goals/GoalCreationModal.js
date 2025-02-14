"use client";

import { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { format } from "date-fns";
import { addStudentGoals } from "../../api/student";
import {
  generateLightdivor,
  normalizeDate,
} from "../../utils/goalCalendarUtils";
import Loader from "../loader/loader";

const GoalCreationModal = ({
  show,
  onHide,
  onSave,
  startDate,
  endDate,
  otherDetails,
  bootcampTasks,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  function getTaskIdsInDateRange() {
    // Normalize start and end dates to midnight (00:00:00)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Set time to 00:00:00

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set time to 23:59:59 to include the entire day

    // Initialize an array to store the task IDs
    const taskIds = [];

    // Iterate through the bootcampTasks array
    bootcampTasks.forEach((task) => {
      const taskDate = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0); // Normalize the task date to midnight

      // Check if the task's date is within the specified date range
      if (taskDate >= start && taskDate <= end) {
        taskIds.push(task._id); // Add the task's _id to the array
      }
    });

    return taskIds;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (normalizeDate(endDate) > normalizeDate(deadline)) {
      return window.alert(
        "The deadline date should be bigger than the goal end date."
      );
    }

    setLoading(true);
    try {
      const newGoal = await addStudentGoals({
        goalName: title,
        goalDesc: description,
        goalStartDate: startDate,
        goalEndDate: endDate,
        goalDeadline: deadline,
        bootcampid: otherDetails.bootcampid,
        userid: otherDetails.userid,
        learningpath: otherDetails?.learningpath,
        bootcampTasks: getTaskIdsInDateRange(),
        goalTilesColor: generateLightdivor(),
      });

      if (newGoal.success) {
        if (title && description && deadline) {
          onSave();
          setTitle("");
          setDescription("");
          setDeadline("");
        }
      } else {
        console.log("Some error while creating a new Goal");
      }
    } catch (err) {
      console.err("Some error while creating a new Goal", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Create New Goal</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              readOnly={loading}
              type="text"
              className="shadow-sm"
              placeholder="Enter goal title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              readOnly={loading}
              as="textarea"
              rows={3}
              className="shadow-sm"
              placeholder="Enter goal description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Deadline</Form.Label>
            <Form.Control
              readOnly={loading}
              className="shadow-sm"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Selected Date Range</Form.Label>
            <p>
              {startDate && endDate
                ? `${format(startDate, "MMM d, yyyy")} - ${format(
                    endDate,
                    "MMM d, yyyy"
                  )}`
                : "No date range selected"}
            </p>
          </Form.Group>
          <div className="d-flex">
            <Button
              disabled={loading}
              className="text-dark"
              variant="primary"
              type="submit"
            >
              Save Goal
            </Button>
            {loading && (
              <div className="ml-4">
                <Loader size={36} />
              </div>
            )}
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default GoalCreationModal;
