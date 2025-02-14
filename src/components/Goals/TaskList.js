import { ListGroup } from "react-bootstrap"

const TaskList = ({ tasks }) => {
  return (
    <div>
      <h3>Tasks for Selected Day</h3>
      {tasks.length === 0 ? (
        <p>No tasks for this day.</p>
      ) : (
        <ListGroup>
          {tasks.map((task) => (
            <ListGroup.Item key={task.lectureId}>
              <h5>{task.lecturename}</h5>
              <p>Type: {task.type}</p>
              <p>Duration: {task.duration} minutes</p>
              <p>Status: {task.status}</p>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  )
}

export default TaskList

