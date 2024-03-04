import { AiOutlineVideoCamera } from "react-icons/ai";
import { BsFileEarmarkCode } from "react-icons/bs";
import { MdAssignmentReturned, MdOutlineAssignment } from "react-icons/md";
import { RxCircle } from "react-icons/rx";

const FONT_SIZE = 20;
const Event = (props) => {
  const { event, isModal, color } = props;

  return (
    <button
      key={event.lecturename}
      className={`flex justify-start mb-1 items-center w-100 p-1 ${
        isModal ? "px-2 my-2" : ""
      }`}
    >
      <RxCircle color={color} />

      <div
        className={`pl-2 text-left font-medium text-sm text-dark-400 hover:text-sky-400 ${
          !isModal ? "w-5/6 truncate" : ""
        }`}
      >
        {event.lecturename}
        {isModal && (
          <p className="m-0 font-semibold text-sm text-slate-400">
            ({event.duration} Mins)
          </p>
        )}
      </div>

      {isModal && (
        <div className="ms-auto">
          {event?.type === "coursemcq" && (
            <MdOutlineAssignment size={FONT_SIZE} color={color} />
          )}
          {event?.type === "challenge" && (
            <BsFileEarmarkCode size={FONT_SIZE} color={color} />
          )}
          {event?.type === "lecture" && (
            <AiOutlineVideoCamera size={FONT_SIZE} color={color} />
          )}
          {event?.type === "assignment" && (
            <MdAssignmentReturned size={FONT_SIZE} color={color} />
          )}
        </div>
      )}
    </button>
  );
};

export default Event;
