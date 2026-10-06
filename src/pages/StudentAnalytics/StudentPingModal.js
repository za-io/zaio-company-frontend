import { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { pingStudent } from "../../api/company";
import { setStudentOutcome, getCoachingThread } from "../../api/student";
import { useUserStore } from "../../store/UserProvider";
import { formatDate, formatTime } from "../../utils/dateUtils";

const formatSASTTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
};

const CHANNEL_LABELS = {
  discord: "Discord",
  email: "Email",
};

const MESSAGE_KIND_STYLES = {
  coaching: { bg: "bg-indigo-50", border: "border-indigo-200" },
  coaching_redirect: { bg: "bg-purple-50", border: "border-purple-200" },
  inbound: { bg: "bg-blue-50", border: "border-blue-200" },
  tutor_tag: { bg: "bg-amber-50", border: "border-amber-300" },
};

const CoachingChatView = ({ bootcampId, userid, hasCoaching }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchThread = async () => {
      if (!bootcampId || !userid) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        const result = await getCoachingThread(bootcampId, userid);
        if (result && Array.isArray(result.data)) {
          setMessages(result.data);
        } else if (result && Array.isArray(result.messages)) {
          setMessages(result.messages);
        } else if (result && Array.isArray(result)) {
          setMessages(result);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to fetch coaching thread:", err);
        setError("Unable to load coaching chat. The endpoint may not be available yet.");
      } finally {
        setLoading(false);
      }
    };

    fetchThread();
  }, [bootcampId, userid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading coaching chat...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-amber-800">
        <p className="font-medium">Coaching chat unavailable</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!hasCoaching) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-4 text-gray-600 text-center">
        <p className="font-medium">No coaching session</p>
        <p className="text-sm mt-1">This student is not currently in a coaching session.</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-4 text-gray-600 text-center">
        <p className="font-medium">No messages yet</p>
        <p className="text-sm mt-1">The coaching conversation has not started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {messages.map((msg, idx) => {
        const isOutbound = msg.direction === "outbound";
        const isInternal = msg.direction === "internal";
        const isTutorTag = msg.kind === "tutor_tag";
        
        const kindStyle = MESSAGE_KIND_STYLES[msg.kind] || MESSAGE_KIND_STYLES.coaching;
        
        const senderName = msg.sentBy ?? msg.from;
        const messageBody = msg.messageText ?? msg.text;
        
        return (
          <div key={msg._id || msg.externalMessageId || idx}>
            {msg.stepDeadline && (
              <div className="text-center my-2">
                <span className="inline-block bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full">
                  Step deadline: {formatSASTTime(msg.stepDeadline)}
                </span>
              </div>
            )}
            
            <div
              className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs sm:max-w-md rounded-lg p-3 ${
                  isTutorTag
                    ? "bg-amber-50 border-2 border-amber-300"
                    : isInternal
                    ? "bg-gray-100 border border-gray-300"
                    : isOutbound
                    ? `${kindStyle.bg} ${kindStyle.border} border`
                    : "bg-blue-50 border border-blue-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isTutorTag && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded">
                      Tutor Tag
                    </span>
                  )}
                  {isInternal && (
                    <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                      Internal
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    msg.channel === "discord" 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {CHANNEL_LABELS[msg.channel] || msg.channel}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatSASTTime(msg.time)}
                  </span>
                </div>
                
                {senderName && (
                  <p className="text-xs text-gray-600 font-medium mb-1">
                    {senderName}
                  </p>
                )}
                
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {messageBody}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OUTCOME_OPTIONS = [
  { value: "taken_over", label: "Take over", color: "bg-purple-500", confirmRequired: false },
  { value: "catching_up", label: "Catching up", color: "bg-teal-500", confirmRequired: false },
  { value: "transferred", label: "Transfer", color: "bg-gray-500", confirmRequired: true },
  { value: "leaving", label: "Leaving", color: "bg-gray-700", confirmRequired: true },
  { value: "clear", label: "Clear", color: "bg-gray-300 text-gray-700", confirmRequired: false },
];

const PingStudent = ({showModal,setShowModal,bootcampId,getAnalytics}) => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const { user } = useUserStore();

  const handleClose = () => {
    setShowModal(false);
  };

  const emailConfig = {
    subject: "Check-In: Progress and Support for Your Full Stack Web Development Bootcamp",
    body: `Hi ${showModal?.userid?.email},\n

I hope you're doing well!\n

I wanted to check in and encourage you to keep pushing through the bootcamp. As a deferred student, remember that you still have access to all the tutors and lectures on Google Classroom until ${formatDate(showModal?.bootcampEndDate)}.\n

If you complete any assignments or the capstone project on Classroom and need them marked, please notify one of the tutors allocated to your bootcamp. If for some reason you don't receive a response from the tutors, feel free to email me directly at suhana@zaio.io, and I'll arrange for a tutor to mark your work.\n

We're here to support you every step of the way. Don't hesitate to reach out if you need assistance.\n

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
                    htmlFor="grid-password"
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
};

const PingStudentHistory = ({showModal,setShowModal,bootcampId,getAnalytics,refreshEngagement}) => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [outcomeNote, setOutcomeNote] = useState("");
  const [confirmOutcome, setConfirmOutcome] = useState(null);
  const [activeTab, setActiveTab] = useState("history");
  // eslint-disable-next-line no-unused-vars
  const { user } = useUserStore();

  const hasCoaching = showModal?.engagementData?.coaching?.active || 
                      showModal?.engagementData?.state === "coaching";

  const handleClose = () => {
    setShowModal(false);
    setConfirmOutcome(null);
    setOutcomeNote("");
    setActiveTab("history");
  };

  const handleSetOutcome = async (outcome) => {
    const option = OUTCOME_OPTIONS.find(o => o.value === outcome);
    if (option?.confirmRequired && !confirmOutcome) {
      setConfirmOutcome(outcome);
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      await setStudentOutcome(bootcampId, {
        userid: showModal?.userid?._id,
        outcome,
        note: outcomeNote || undefined,
      });
      setMsg(`Outcome set to "${option?.label || outcome}"`);
      setConfirmOutcome(null);
      setOutcomeNote("");
      if (refreshEngagement) {
        await refreshEngagement();
      }
      if (getAnalytics) {
        getAnalytics();
      }
    } catch (err) {
      setMsg(`Failed to set outcome: ${err?.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentOutcome = showModal?.engagementData?.suhanasOutcome;

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
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        className="p-4"
      >
        <p className="text-lg font-normal">
          History for{" "}
          <span className="font-semibold">{showModal?.userid?.email}</span>{" "}
        </p>

        <div className="flex border-b border-gray-200 mt-4 mb-4">
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            History & Outcomes
          </button>
          <button
            onClick={() => setActiveTab("coaching")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "coaching"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Coaching Chat
            {hasCoaching && (
              <span className="inline-block w-2 h-2 bg-indigo-600 rounded-full"></span>
            )}
          </button>
        </div>

        {activeTab === "coaching" && (
          <div className="mb-4">
            <CoachingChatView
              bootcampId={bootcampId}
              userid={showModal?.userid?._id}
              hasCoaching={hasCoaching}
            />
          </div>
        )}

        {activeTab === "history" && currentOutcome && currentOutcome.value && (
          <div className="bg-purple-100 border border-purple-300 rounded p-3 my-3">
            <p className="font-semibold text-purple-700">
              Current outcome: {currentOutcome.value}
            </p>
            {currentOutcome.note && (
              <p className="text-sm text-purple-600 mt-1">{currentOutcome.note}</p>
            )}
            {currentOutcome.setBy && (
              <p className="text-xs text-purple-500 mt-1">
                Set by {currentOutcome.setBy} on {formatDate(currentOutcome.setAt)}
              </p>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <>
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="font-bold text-gray-700 mb-3">Suhana's Outcome</p>
              
              {confirmOutcome && (
                <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-3">
                  <p className="font-semibold text-amber-800">
                    Confirm: Are you sure you want to mark this student as "{OUTCOME_OPTIONS.find(o => o.value === confirmOutcome)?.label}"?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleSetOutcome(confirmOutcome)}
                      disabled={loading}
                      className="bg-red-500 text-white px-4 py-2 rounded font-medium hover:bg-red-600 disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Yes, confirm"}
                    </button>
                    <button
                      onClick={() => setConfirmOutcome(null)}
                      disabled={loading}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                {OUTCOME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSetOutcome(option.value)}
                    disabled={loading}
                    className={`${option.color} ${option.color.includes("text-gray") ? "" : "text-white"} px-4 py-2 rounded font-medium hover:opacity-80 disabled:opacity-50`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={outcomeNote}
                  onChange={(e) => setOutcomeNote(e.target.value)}
                  placeholder="Add a note about this outcome..."
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  rows={2}
                />
              </div>

              {msg && (
                <p className={`text-sm mt-2 ${msg.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
                  {msg}
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="font-bold text-gray-700 mb-3">Ping History</p>
              <div className="p-2">
                {
                    showModal?.pingStatusDetails?.length ? showModal?.pingStatusDetails?.map((item, idx) => {
                        return (
                        <div key={idx} className="bg-gray-100 mb-1 p-1 rounded">
                          <div className="my-1 py-2 px-2"><p><b>Timestamp</b> <br/>{formatTime(item.pingedAt)}</p></div>
                          <div className="p-2 tracking-wide "><p className="px-2"><b>Content</b> <br/>{item.message.split('Best regards')[0].trim()}</p></div>
                        </div>
                    ) 
                }) : <p className="text-gray-500">No ping history yet</p>
                }
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export const StudentPingModal = ({
  showModal,
  setShowModal,
  bootcampId,
  getAnalytics,
  refreshEngagement,
  viewHistory
}) => {
  return (
    !showModal?.viewHistory ? 
      (<PingStudent showModal={showModal} setShowModal={setShowModal} bootcampId={bootcampId} getAnalytics={getAnalytics}/>) :
      (<PingStudentHistory showModal={showModal} setShowModal={setShowModal} bootcampId={bootcampId} getAnalytics={getAnalytics} refreshEngagement={refreshEngagement}/>)
  );
};
