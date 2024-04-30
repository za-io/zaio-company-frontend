import { useContext, useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { getAllWarnings, sendWarningEmail } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";

export const WarningModal = ({ showModal, setShowModal, bootcampId }) => {
  const [warnings, setWarnings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [defaultEmail, setDefaultEmail] = useState(null);
  const { user } = useUserStore();
  const init = async () => {
    const warningsRes = await getAllWarnings({
      bootcampid: bootcampId,
      userid: showModal?.userid?._id,
    });

    setWarnings(warningsRes?.warnings);
  };

  const handleClose = () => {
    setShowModal(false);
    setDefaultEmail(null);
    setWarnings(null);
  };

  const emailConfig = [
    {
      subject: "First Warning: Incomplete Tasks on Zaio",
      sentBy: user?.email,
      body: `Dear ${showModal?.userid?.email},
  
I hope this email finds you in good spirits. I am writing to express my concern regarding your recent performance in [specific class/course].
  
It has come to my attention that you have not completed several tasks within the allocated time frame. I want to emphasize the importance of timely completion of tasks  not only for your academic progress but also for your overall understanding of the subject matter and continuation of this program.
  
This email serves as your first warning out of three. It is essential to understand that consistent failure to complete tasks may ultimately lead to disqualification from the program upon receiving the third warning.
  
I urge you to prioritize your tasks and adhere to the provided deadlines diligently. If you are facing any challenges or require additional support, please do not hesitate to reach out to me. I am here to assist you in overcoming any obstacles you may encounter.
  
Your commitment to improving your academic performance is crucial. By taking this warning seriously and making the necessary adjustments, you can ensure a more successful learning experience.
  
Thank you for your attention to this matter. I look forward to seeing improvement in your future assignments.
  
Best regards,
  
${user?.email}
          `,
    },

    {
      subject: "Second Warning: Urgent Action required",
      sentBy: user?.email,
      body: `Dear ${showModal?.userid?.email},
  
I hope this email finds you well. I am writing to follow up on our previous communication regarding your academic performance in [specific class/course].
      
Despite our previous discussion and the first warning issued, it appears that there has been little or no improvement in your progress. This email serves as your second warning, indicating a critical need for immediate action to address this issue.
      
As previously mentioned, failure to complete tasks within the designated time frame can have serious consequences, including disqualification from the course. I want to reiterate that this warning is part of a three-strike system, and further negligence may result in the final warning.
      
I urge you to take this warning seriously and commit to improving your performance promptly. If there are any underlying issues or challenges hindering your progress, please do not hesitate to communicate them to me. I am here to assist you and provide support in any way possible.
      
Your academic success is important to us, and I believe that with determination and effort, you can overcome any obstacles you may be facing. Let's work together to ensure that you meet the expectations of the course and achieve your academic goals.
      
Thank you for your attention to this matter. I expect to see a significant improvement in your future work.
      
Best regards,
      
${user?.email}
          `,
    },

    {
      subject: "Final Warning: Immediate Action Required",
      sentBy: user?.email,
      body: `Dear ${showModal?.userid?.email},
  
I hope this message finds you well. It is with regret that I must bring to your attention the necessity for this final warning regarding your academic performance in [specific class/course].
  
Despite the previous warnings and our efforts to support you, there has been little to no improvement in your completion of assignments. This email serves as your third and final warning, indicating a critical juncture in your academic journey.
  
As outlined in our previous communications, failure to complete assignments within the specified time frame can lead to disqualification from the course. Unfortunately, your continued neglect of this responsibility has left us with no choice but to issue this final warning.
  
I want to emphasize the seriousness of this situation. However, it's not too late to turn things around.
  
I implore you to take immediate and decisive action to address this issue. If there are any challenges or obstacles preventing you from completing your assignments, please reach out to me as soon as possible. We are here to provide assistance and support in finding solutions to help you succeed.
  
Thank you for your attention to this matter. I sincerely hope to see a positive change in your approach to your work moving forward.
  
Best regards,
  
${user?.email}
          `,
    },
  ];
  var options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setMsg(null);

    const formData = new FormData(e.target);

    const subject = formData.get("subject");
    const sentBy = formData.get("sentBy");
    const body = formData.get("body");

    setLoading(true);
    sendWarningEmail({
      emailSubject: subject,
      emailBody: body,
      emailBy: sentBy,
      userEmail: showModal?.userid?.email,
      userid: showModal?.userid?._id,
      bootcampid: bootcampId,
      warningNumber: defaultEmail,
    })
      .then((res) => {
        if (res?.success) {
          setWarnings(res?.warnings);
          setMsg("Success");
          e?.target?.reset();
        } else {
          setMsg(res?.errMsg);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!showModal) return;
    init();
  }, [showModal]);
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
        <p className="text-lg text-bold text-weight-500">
          Warnings for {showModal?.userid?.email}:
        </p>
        {warnings?.length > 0 ? (
          warnings?.map((warn) => (
            <div className="border rounded p-3 m-2 d-flex justify-content-between align-items-center">
              <p>
                Date: {JSON.stringify(showModal?.email)}{" "}
                {new Date(warn?.createdAt)?.toLocaleDateString(
                  "en-US",
                  options
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setDefaultEmail(warn?.warningNumber);
                }}
                className="bg-orange-500 ms-4 px-12 text-white py-3 rounded font-medium"
              >
                View warning {warn?.warningNumber} email details
              </button>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400 my-4">
            No warnings found for {showModal?.userid?.email}
          </p>
        )}

        <div className="my-3 d-flex">
          {[1, 2, 3]?.map((em) => (
            <button
              key={`WARNING_COUNT_${em}`}
              onClick={() => {
                setDefaultEmail(em);
              }}
              className={`px-5 rounded border pointer mx-2 ${
                em === defaultEmail ? "bg-orange-500 text-white" : ""
              }`}
              style={{
                cursor: "pointer",
                height: 40,
              }}
            >
              warning - {em}
            </button>
          ))}
        </div>
        {warnings?.length > 0 &&
          warnings
            ?.map((warn) => warn?.warningNumber)
            ?.includes(defaultEmail) && (
            <p className="text-bold my-2 text-orange-400">
              You have already sent the warning {defaultEmail}. So you can only
              view it's content below.
            </p>
          )}
        {/* Waring template */}
        {defaultEmail && (
          <form onSubmit={handleSubmit}>
            <p className="uppercase text-large font-bold mb-4">Warning Email</p>
            <div className="flex flex-wrap -mx-3 mb-6">
              <div className="w-full px-3">
                <label
                  className="block uppercase tracking-wide text-xs font-bold mb-2"
                  for="grid-password"
                >
                  Subject
                </label>
                <input
                  readOnly={
                    warnings?.length > 0 &&
                    warnings
                      ?.map((warn) => warn?.warningNumber)
                      ?.includes(defaultEmail)
                  }
                  key={emailConfig?.[defaultEmail - 1]?.subject}
                  defaultValue={emailConfig?.[defaultEmail - 1]?.subject}
                  className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                  name="subject"
                  type="text"
                  placeholder="Subject"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap -mx-3 mb-6">
              <div className="w-full px-3">
                <label
                  className="block uppercase tracking-wide text-xs font-bold mb-2"
                  for="grid-password"
                >
                  Sent by
                </label>
                <input
                  readOnly={
                    warnings?.length > 0 &&
                    warnings
                      ?.map((warn) => warn?.warningNumber)
                      ?.includes(defaultEmail)
                  }
                  className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                  name="sentBy"
                  type="text"
                  placeholder="Sent By"
                  required
                  key={emailConfig?.[defaultEmail - 1]?.sentBy}
                  defaultValue={emailConfig?.[defaultEmail - 1]?.sentBy}
                />
              </div>
            </div>

            <div className="flex flex-wrap -mx-3 mb-6">
              <div className="w-full px-3">
                <label className="block uppercase tracking-wide text-xs font-bold mb-2">
                  Body
                </label>
                <textarea
                  readOnly={
                    warnings?.length > 0 &&
                    warnings
                      ?.map((warn) => warn?.warningNumber)
                      ?.includes(defaultEmail)
                  }
                  className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                  name="body"
                  type="text"
                  placeholder="body"
                  required
                  rows={32}
                  defaultValue={emailConfig?.[defaultEmail - 1]?.body}
                  key={emailConfig?.[defaultEmail - 1]?.body}
                ></textarea>
              </div>
            </div>

            <button
              disabled={
                warnings?.length > 0 &&
                warnings
                  ?.map((warn) => warn?.warningNumber)
                  ?.includes(defaultEmail)
              }
              className="shadow bg-purple-500 text-white font-bold py-2 px-4 rounded"
              type="submit"
              style={{
                cursor:
                  warnings?.length > 0 &&
                  warnings
                    ?.map((warn) => warn?.warningNumber)
                    ?.includes(defaultEmail)
                    ? "not-allowed"
                    : "",
              }}
            >
              Send Email {defaultEmail}
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
        )}
      </div>
    </Modal>
  );
};
