import React from "react";
import { createContext, useState } from "react";

const defaultValue = {
  showModal: false,
  setShowModal: () => {},
  tasks: [],
  setTasks: () => {},
};

export const TasksContext = createContext(defaultValue);

export const TasksProvider = ({ children }) => {
  const [showModal, setShowModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  return (
    <TasksContext.Provider value={{ showModal, setShowModal, tasks, setTasks }}>
      {children}
    </TasksContext.Provider>
  );
};
