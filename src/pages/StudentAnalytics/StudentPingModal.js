import { useState } from "react";
import { Modal } from "react-bootstrap";
import { pingStudent } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import { formatDate, formatTime } from "../../utils/dateUtils";

const PingStudent = ({showModal,setShowModal,bootcampId,getAnalytics}) => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const { user } = useUserStore();

  const handleClose = () => {
    setShowModal(false);
  };

  const emailConfig = {
    subject: "Check-In: Progress and Support for Your Full Stack Web Development Bootcamp",
    body: `Hi ${showModal?.userid?.email},\n

I hope you’re doing well!\n

I wanted to check in and encourage you to keep pushing through the bootcamp. As a deferred student, remember that you still have access to all the tutors and lectures on Google Classroom until ${formatDate(showModal?.bootcampEndDate)}.\n

If you complete any assignments or the capstone project on Classroom and need them marked, please notify one of the tutors allocated to your bootcamp. If for some reason you don’t receive a response from the tutors, feel free to email me directly at suhana@zaio.io, and I’ll arrange for a tutor to mark your work.\n

We’re here to support you every step of the way. Don’t hesitate to reach out if you need assistance.\n

Keep up the great work!\n

Best regards,\n

Suhana Patel
Zaio Student Success Manager`,
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setMsg(null);

    const formData = new FormData(e.target);

    const subject = formData.get("subject");
    const body = formData.get("body");
    const numberOfDeferMonths = formData.get("numberOfDeferMonths");

    setLoading(true);
    pingStudent({
      emailSubject: subject,
      emailBody: body,
      userEmail: showModal?.userid?.email,
      userid: showModal?.userid?._id,
      bootcampid: bootcampId,
      numberOfDeferMonths,
      bootcampEndDate: showModal?.bootcampEndDate,
    })
      .then((res) => {
        if (res?.success) {
          setMsg("Success");
          e?.target?.reset();
          getAnalytics();
          handleClose();
        } else {
          setMsg(res?.errMsg);
        }
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
        <p className="text-lg font-normal">
          Ping{" "}
          <span className="font-semibold">{showModal?.userid?.email}</span>{" "}
        </p>

        
            {/* <p className="text-gray-400 my-2">Student is not deferred.</p> */}
            <p className="text-large font-bold mb-2">
              Bootcamp Start Date: {formatDate(showModal?.bootcampStartDate)}
            </p>
            <p className="text-large font-bold mb-2">
              Current Bootcamp End Date:{" "}
              {formatDate(showModal?.bootcampEndDate)}
            </p>

            <form onSubmit={handleSubmit} className="mt-4">
              <p className="text-large font-bold mb-4">CheckIn Email</p>


              <div className="flex flex-wrap mb-4">
                <div className="w-full px-3">
                  <label
                    className="block uppercase tracking-wide text-xs font-bold mb-2"
                    for="grid-password"
                  >
                    Subject
                  </label>
                  <input
                    readOnly={loading}
                    key={emailConfig?.subject}
                    defaultValue={emailConfig?.subject}
                    className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    name="subject"
                    type="text"
                    placeholder="Subject"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-wrap mb-4">
                <div className="w-full px-3">
                  <label className="block uppercase tracking-wide text-xs font-bold mb-2">
                    Body
                  </label>
                  <textarea
                    readOnly={loading}
                    className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    name="body"
                    type="text"
                    placeholder="body"
                    required
                    rows={32}
                    defaultValue={emailConfig?.body}
                    key={emailConfig?.body}
                  ></textarea>
                </div>
              </div>

              <button
                disabled={loading}
                className="shadow bg-purple-500 text-white font-bold py-2 px-4 rounded"
                type="submit"
                style={{
                  cursor: loading ? "not-allowed" : "",
                }}
              >
                Ping student
              </button>

              {msg && (
                <p
                  dangerouslySetInnerHTML={{
                    __html: msg,
                  }}
                  className="text-white text-md mt-3"
                />
              )}
            </form>
          
      </div>
    </Modal>
  );
}
const PingStudentHistory = ({showModal,setShowModal,bootcampId,getAnalytics}) => {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);
    const { user } = useUserStore();
  
    const handleClose = () => {
      setShowModal(false);
    };
  
    const emailConfig = {
      subject: "Check-In: Progress and Support for Your Full Stack Web Development Bootcamp",
      body: `Hi ${showModal?.userid?.email},\n
  
  I hope you’re doing well!\n
  
  I wanted to check in and encourage you to keep pushing through the bootcamp. As a deferred student, remember that you still have access to all the tutors and lectures on Google Classroom until ${formatDate(showModal?.bootcampEndDate)}.\n
  
  If you complete any assignments or the capstone project on Classroom and need them marked, please notify one of the tutors allocated to your bootcamp. If for some reason you don’t receive a response from the tutors, feel free to email me directly at suhana@zaio.io, and I’ll arrange for a tutor to mark your work.\n
  
  We’re here to support you every step of the way. Don’t hesitate to reach out if you need assistance.\n
  
  Keep up the great work!\n
  
  Best regards,\n
  
  Suhana Patel
  Zaio Student Success Manager`,
    };
  
    const handleSubmit = (e) => {
      e.preventDefault();
  
      setMsg(null);
  
      const formData = new FormData(e.target);
  
      const subject = formData.get("subject");
      const body = formData.get("body");
      const numberOfDeferMonths = formData.get("numberOfDeferMonths");
  
      setLoading(true);
      pingStudent({
        emailSubject: subject,
        emailBody: body,
        userEmail: showModal?.userid?.email,
        userid: showModal?.userid?._id,
        bootcampid: bootcampId,
        numberOfDeferMonths,
        bootcampEndDate: showModal?.bootcampEndDate,
      })
        .then((res) => {
          if (res?.success) {
            setMsg("Success");
            e?.target?.reset();
            getAnalytics();
            handleClose();
          } else {
            setMsg(res?.errMsg);
          }
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
          <p className="text-lg font-normal">
            Ping{" "}
            <span className="font-semibold">{showModal?.userid?.email}</span>{" "}
          </p>
  
              <div className="p-2">
                {
                    showModal?.pingStatusDetails?.length ? showModal?.pingStatusDetails?.map(item=>{
                        return (
                        <div className="bg-gray-100 mb-1 p-1">
                        <div className="my-1 py-2 px-2"><p><b>Timestamp</b> <br/>{formatTime(item.pingedAt)}</p></div>
                        <div className="p-2 tracking-wide "><p className="px-2"><b>Content</b> <br/>{item.message.split('Best regards')[0].trim()}</p></div>
                        </div>
                    ) 
                }) : <p>No history yet</p>
                }
              </div>
        </div>
      </Modal>
    );
  }
export const StudentPingModal = ({
  showModal,
  setShowModal,
  bootcampId,
  getAnalytics,
  viewHistory
}) => {
  return (
    
        !showModal?.viewHistory ? 
        (<PingStudent showModal={showModal} setShowModal={setShowModal} bootcampId={bootcampId} getAnalytics={getAnalytics}/>) :
        (<PingStudentHistory showModal={showModal} setShowModal={setShowModal} bootcampId={bootcampId} getAnalytics={getAnalytics}/>)

    
  )
};
