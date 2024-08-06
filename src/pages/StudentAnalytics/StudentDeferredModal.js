import { useState } from "react";
import { Modal } from "react-bootstrap";
import { deferStudent } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import { formatDate } from "../../utils/dateUtils";

export const StudentDeferredModal = ({
  showModal,
  setShowModal,
  bootcampId,
  getAnalytics,
}) => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const { user } = useUserStore();

  const handleClose = () => {
    setShowModal(false);
  };

  const emailConfig = {
    subject: "Full Stack Web development Bootcamp - Deferred  student",
    body: `Dear ${showModal?.userid?.email},\n\n
Hope you are doing well.\n\n
Firstly, Thank you so much for choosing Zaio as the institution to achieve your coding skills and goals.\n\n
After looking at your progress on the bootcamp we have decided to make you a differed student at Zaio. You are getting this email because:\n
* You tried to un-enrol from the bootcamp after 30 days since the bootcamp started or\n
* The bootcamp is too fast paced for you and you want to shift to the self-paced course or\n
* The bootcamp cohort you had started is now over and you were not able to make all submissions on time.\n\n
We really want you to make it and we want to accommodate the situation you currently are in, hence we will give you the following benefits on the program.\n
* You will have access to the material for another 6 months after the program completes for you to complete the work that you have not done. \n
* You will have access to the Tutors as well for another 3 months after the program is completed and you can book them via calendly.\n
* You can do the program at your pace and book the tutors are your convince to complete your interview readiness sessions.\n
* You can complete the assignments at your convenience and they will be marked by our tutors\n
* You can slow down your pace and have reds on your calendar - you will not be penalised for that\n\n
I will inform the team about these changes for you. Let me know if you have any questions and any other way I can assist you. Please email me on asif@zaio.io.\n\n
Kind regards,
Asif`,
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setMsg(null);

    const formData = new FormData(e.target);

    const subject = formData.get("subject");
    const body = formData.get("body");
    const numberOfDeferMonths = formData.get("numberOfDeferMonths");

    setLoading(true);
    deferStudent({
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
          Defer{" "}
          <span className="font-semibold">{showModal?.userid?.email}</span>{" "}
          details,
        </p>

        {!showModal?.deferredDetails?.studentDeferred ? (
          <>
            <p className="text-gray-400 my-2">Student is not deferred.</p>
            <p className="text-large font-bold mb-2">
              Bootcamp Start Date: {formatDate(showModal?.bootcampStartDate)}
            </p>
            <p className="text-large font-bold mb-2">
              Current Bootcamp End Date:{" "}
              {formatDate(showModal?.bootcampEndDate)}
            </p>

            <form onSubmit={handleSubmit} className="mt-4">
              <p className="text-large font-bold mb-4">Defer Email</p>

              <div className="flex flex-wrap mb-4">
                <div className="w-full px-3">
                  <label
                    className="block uppercase tracking-wide text-xs font-bold mb-2"
                    for="grid-password"
                  >
                    Select month(s)
                  </label>

                  <select
                    className="block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-2 pl-4 pr-6 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    name="numberOfDeferMonths"
                  >
                    {Array.from({ length: 6 }, (v, i) => ({
                      _id: `${i + 1}-month${i > 0 ? "s" : ""}`,
                      value: `${i + 1} Month${i > 0 ? "s" : ""}`,
                    })).map((ab) => {
                      return <option value={ab._id}>{ab.value}</option>;
                    })}
                  </select>
                </div>
              </div>

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
                Defer student
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
          </>
        ) : (
          <>
            <p className="text-gray-600 my-4">
              Student was deferred on{" "}
              <span className="font-bold">
                {" "}
                {formatDate(showModal?.deferredDetails?.deferredDate)}{" "}
              </span>{" "}
              for{" "}
              <span className="font-bold">
                {" "}
                {showModal?.deferredDetails?.numberOfDeferMonths}
                {". "}
              </span>
            </p>
            <p className="text-large mb-2">
              Bootcamp Start Date:{" "}
              <span className="font-bold">
                {formatDate(showModal?.bootcampStartDate)}
              </span>
            </p>
            <p className="text-large mb-2">
              Bootcamp End Date before deferring:{" "}
              <span className="font-bold">
                {" "}
                {formatDate(showModal?.bootcampEndDate)}
              </span>
            </p>
            <p className="text-large mb-2">
              Bootcamp End Date after deferring:{" "}
              <span className="font-bold">
                {" "}
                {formatDate(showModal?.deferredDetails?.newBootcampEndDate)}
              </span>
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};
