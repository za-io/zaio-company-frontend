import { useState } from "react";
import { Modal } from "react-bootstrap";
import { pingStudent, sendDiscordDM, trackWhatsAppMessage } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import { formatDate, formatTime } from "../../utils/dateUtils";

const PingStudent = ({ showModal, setShowModal, bootcampId, getAnalytics }) => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [activeTab, setActiveTab] = useState("email");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [discordMessage, setDiscordMessage] = useState("");
  const [copied, setCopied] = useState(null);
  const { user } = useUserStore();

  const handleClose = () => {
    setShowModal(false);
    setMsg(null);
    setActiveTab("email");
    setCopied(null);
  };

  const studentPhone = showModal?.userid?.phonenumber;
  const studentDiscord = showModal?.discordUsername;
  const studentName = showModal?.userid?.username || showModal?.userid?.email?.split("@")[0];
  const studentUserId = showModal?.userid?._id;

  const emailConfig = {
    subject: "Check-In: Progress and Support for Your Full Stack Web Development Bootcamp",
    body: `Hi ${showModal?.userid?.email},

I hope you're doing well!

I wanted to check in and encourage you to keep pushing through the bootcamp. As a deferred student, remember that you still have access to all the tutors and lectures on Google Classroom until ${formatDate(showModal?.bootcampEndDate)}.

If you complete any assignments or the capstone project on Classroom and need them marked, please notify one of the tutors allocated to your bootcamp. If for some reason you don't receive a response from the tutors, feel free to email me directly at suhana@zaio.io, and I'll arrange for a tutor to mark your work.

We're here to support you every step of the way. Don't hesitate to reach out if you need assistance.

Keep up the great work!

Best regards,

Suhana Patel
Zaio Student Success Manager`,
  };

  const defaultWhatsappMessage = `Hi ${studentName}! 👋

This is a check-in from Zaio regarding your Full Stack Web Development Bootcamp.

I wanted to see how you're progressing and remind you that our tutors are here to support you. If you need any help with assignments or have questions, please don't hesitate to reach out.

Keep up the great work! 💪

Best regards,
Zaio Team`;

  const defaultDiscordMessage = `Hi ${studentName}! 👋

This is a check-in from Zaio regarding your Full Stack Web Development Bootcamp.

I wanted to see how you're progressing and remind you that our tutors are here to support you. If you need any help with assignments or have questions, please don't hesitate to reach out in the Discord server or DM me directly.

Keep up the great work! 💪

Best regards,
Zaio Team`;

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
      userid: studentUserId,
      bootcampid: bootcampId,
      numberOfDeferMonths,
      bootcampEndDate: showModal?.bootcampEndDate,
    })
      .then((res) => {
        if (res?.success) {
          setMsg("Email sent successfully!");
          e?.target?.reset();
          getAnalytics();
          setTimeout(() => handleClose(), 1500);
        } else {
          setMsg(res?.errMsg || "Failed to send email");
        }
      })
      .catch(() => {
        setMsg("An error occurred while sending the email");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "+27" + cleaned.substring(1);
    }
    if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
    return cleaned.replace("+", "");
  };

  const handleWhatsAppSend = async () => {
    const formattedPhone = formatPhoneForWhatsApp(studentPhone);
    if (!formattedPhone) {
      setMsg("No phone number available for this student");
      return;
    }

    const message = whatsappMessage || defaultWhatsappMessage;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // Track the WhatsApp message
    await trackWhatsAppMessage({
      userid: studentUserId,
      bootcampid: bootcampId,
      message: message,
      phoneNumber: studentPhone,
    });

    window.open(whatsappUrl, "_blank");
    setMsg("WhatsApp opened! Message has been logged.");
    getAnalytics();
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      setMsg("Failed to copy to clipboard");
    }
  };

  const [discordLoading, setDiscordLoading] = useState(false);

  const handleDiscordCopyUsername = () => {
    if (studentDiscord) {
      copyToClipboard(studentDiscord, "username");
    }
  };

  const handleDiscordCopyMessage = () => {
    const message = discordMessage || defaultDiscordMessage;
    copyToClipboard(message, "message");
  };

  const handleDiscordSendViaBot = async () => {
    if (!studentDiscord) {
      setMsg("No Discord username available for this student");
      return;
    }

    const message = discordMessage || defaultDiscordMessage;
    
    setDiscordLoading(true);
    setMsg(null);

    try {
      const result = await sendDiscordDM({
        discordUsername: studentDiscord,
        message: message,
        userid: studentUserId,
        bootcampid: bootcampId,
      });

      if (result?.success) {
        setMsg("Discord message sent successfully!");
        getAnalytics();
      } else {
        setMsg(result?.message || "Failed to send Discord message");
      }
    } catch (error) {
      setMsg("An error occurred while sending the Discord message");
    } finally {
      setDiscordLoading(false);
    }
  };

  return (
    <Modal
      centered
      size="lg"
      show={showModal}
      onHide={handleClose}
      contentClassName="bg-transparent border-0"
    >
      <div className="bg-[#161B22] rounded-xl border border-gray-800 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Contact Student</h2>
            <p className="text-gray-400 text-sm">
              Send a message to <span className="text-blue-400">{showModal?.userid?.email}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Student Info Card */}
        <div className="px-5 py-4 bg-[#0D1117] border-b border-gray-800">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Student:</span>
              <span className="text-white font-medium">{studentName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Phone:</span>
              <span className={studentPhone ? "text-green-400" : "text-gray-500 italic"}>
                {studentPhone || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Discord:</span>
              <span className={studentDiscord ? "text-indigo-400" : "text-gray-500 italic"}>
                {studentDiscord || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Bootcamp End:</span>
              <span className="text-white">{formatDate(showModal?.bootcampEndDate) || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="px-5 pt-4">
          <div className="flex gap-1 p-1 bg-[#0D1117] rounded-lg">
            <button
              onClick={() => setActiveTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === "email"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === "whatsapp"
                  ? "bg-green-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={() => setActiveTab("discord")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === "discord"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
              </svg>
              Discord
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Email Form */}
          {activeTab === "email" && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Subject
                  </label>
                  <input
                    readOnly={loading}
                    key={emailConfig?.subject}
                    defaultValue={emailConfig?.subject}
                    className="w-full bg-[#0D1117] text-gray-200 border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                    name="subject"
                    type="text"
                    placeholder="Email subject"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Message Body
                  </label>
                  <textarea
                    readOnly={loading}
                    className="w-full bg-[#0D1117] text-gray-200 border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 resize-none"
                    name="body"
                    placeholder="Email body"
                    required
                    rows={12}
                    defaultValue={emailConfig?.body}
                    key={emailConfig?.body}
                  />
                </div>

                <button
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                    loading
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25"
                  }`}
                  type="submit"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* WhatsApp Form */}
          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              {!studentPhone && (
                <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-yellow-400 font-medium">No Phone Number Available</p>
                    <p className="text-gray-400 text-sm mt-1">This student doesn't have a phone number in the system.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  WhatsApp Message
                </label>
                <textarea
                  className="w-full bg-[#0D1117] text-gray-200 border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 resize-none"
                  placeholder="Type your WhatsApp message..."
                  rows={10}
                  value={whatsappMessage || defaultWhatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                />
              </div>

              <button
                onClick={handleWhatsAppSend}
                disabled={!studentPhone}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  !studentPhone
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25"
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {studentPhone ? "Open WhatsApp" : "No Phone Number"}
              </button>

              {studentPhone && (
                <p className="text-center text-gray-500 text-sm">
                  This will open WhatsApp Web/App with the message pre-filled
                </p>
              )}
            </div>
          )}

          {/* Discord Form */}
          {activeTab === "discord" && (
            <div className="space-y-4">
              {!studentDiscord ? (
                <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-yellow-400 font-medium">No Discord Username Available</p>
                    <p className="text-gray-400 text-sm mt-1">This student hasn't completed bootcamp onboarding or hasn't provided their Discord username.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-600/10 border border-indigo-600/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Discord Username</p>
                        <p className="text-lg font-semibold text-indigo-400">{studentDiscord}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDiscordCopyUsername}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        copied === "username"
                          ? "bg-green-600 text-white"
                          : "bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30"
                      }`}
                    >
                      {copied === "username" ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Discord Message
                </label>
                <textarea
                  className="w-full bg-[#0D1117] text-gray-200 border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500 resize-none"
                  placeholder="Type your Discord message..."
                  rows={10}
                  value={discordMessage || defaultDiscordMessage}
                  onChange={(e) => setDiscordMessage(e.target.value)}
                  disabled={discordLoading}
                />
              </div>

              {/* Send via Bot Button - Primary */}
              <button
                onClick={handleDiscordSendViaBot}
                disabled={!studentDiscord || discordLoading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  !studentDiscord || discordLoading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25"
                }`}
              >
                {discordLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                    </svg>
                    {studentDiscord ? "Send via Discord Bot" : "No Discord Username"}
                  </>
                )}
              </button>

              {studentDiscord && (
                <>
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-gray-700"></div>
                    <span className="text-xs text-gray-500">or manually</span>
                    <div className="flex-1 h-px bg-gray-700"></div>
                  </div>

                  {/* Copy Message Button - Secondary */}
                  <button
                    onClick={handleDiscordCopyMessage}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      copied === "message"
                        ? "bg-green-600/20 text-green-400 border border-green-600/30"
                        : "bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-700"
                    }`}
                  >
                    {copied === "message" ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Message Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Message to DM Manually
                      </>
                    )}
                  </button>

                  <p className="text-center text-gray-500 text-xs">
                    The bot will send a direct message to the student on Discord
                  </p>
                </>
              )}
            </div>
          )}

          {/* Status Message */}
          {msg && (
            <div className={`mt-4 p-3 rounded-lg text-center font-medium ${
              msg.includes("success") || msg.includes("Success") || msg.includes("opened") || msg.includes("Copied") || msg.includes("logged")
                ? "bg-green-600/20 text-green-400 border border-green-600/30"
                : "bg-red-600/20 text-red-400 border border-red-600/30"
            }`}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Channel icon component for history display
const ChannelIcon = ({ channel }) => {
  switch (channel) {
    case "email":
      return (
        <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      );
    case "whatsapp":
      return (
        <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
      );
    case "discord":
      return (
        <div className="w-8 h-8 bg-indigo-600/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 bg-gray-600/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      );
  }
};

const getChannelLabel = (channel) => {
  switch (channel) {
    case "email":
      return { text: "Email", color: "text-blue-400 bg-blue-600/20" };
    case "whatsapp":
      return { text: "WhatsApp", color: "text-green-400 bg-green-600/20" };
    case "discord":
      return { text: "Discord", color: "text-indigo-400 bg-indigo-600/20" };
    default:
      return { text: "Message", color: "text-gray-400 bg-gray-600/20" };
  }
};

const PingStudentHistory = ({ showModal, setShowModal, bootcampId, getAnalytics }) => {
  const handleClose = () => {
    setShowModal(false);
  };

  // Count messages by channel
  const messageCounts = showModal?.pingStatusDetails?.reduce((acc, item) => {
    const channel = item.channel || "email";
    acc[channel] = (acc[channel] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <Modal
      centered
      size="lg"
      show={showModal}
      onHide={handleClose}
      contentClassName="bg-transparent border-0"
    >
      <div className="bg-[#161B22] rounded-xl border border-gray-800 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Message History</h2>
            <p className="text-gray-400 text-sm">
              All messages sent to <span className="text-blue-400">{showModal?.userid?.email}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats Bar */}
        {showModal?.pingStatusDetails?.length > 0 && (
          <div className="px-5 py-3 bg-[#0D1117] border-b border-gray-800">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Total:</span>
                <span className="text-white font-medium">{showModal?.pingStatusDetails?.length} messages</span>
              </div>
              {messageCounts.email > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-blue-400">{messageCounts.email} Email</span>
                </div>
              )}
              {messageCounts.whatsapp > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-green-400">{messageCounts.whatsapp} WhatsApp</span>
                </div>
              )}
              {messageCounts.discord > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-indigo-400">{messageCounts.discord} Discord</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History List */}
        <div className="p-5">
          {showModal?.pingStatusDetails?.length ? (
            <div className="space-y-3">
              {showModal?.pingStatusDetails?.map((item, idx) => {
                const channel = item.channel || "email";
                const channelInfo = getChannelLabel(channel);
                
                return (
                  <div
                    key={idx}
                    className="bg-[#0D1117] rounded-lg border border-gray-800 overflow-hidden"
                  >
                    {/* Header with timestamp and channel */}
                    <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChannelIcon channel={channel} />
                        <div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${channelInfo.color}`}>
                            {channelInfo.text}
                          </span>
                          {item.subject && (
                            <p className="text-sm text-gray-300 mt-1 font-medium">{item.subject}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatTime(item.pingedAt)}
                        </div>
                        {item.sentBy && (
                          <p className="text-xs text-gray-500 mt-0.5">by {item.sentBy}</p>
                        )}
                      </div>
                    </div>
                    {/* Message Content */}
                    <div className="px-4 py-3">
                      <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {item.message.split('Best regards')[0].trim()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No History Yet</h3>
              <p className="text-gray-400">No messages have been sent to this student yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800">
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const StudentPingModal = ({
  showModal,
  setShowModal,
  bootcampId,
  getAnalytics,
}) => {
  return !showModal?.viewHistory ? (
    <PingStudent
      showModal={showModal}
      setShowModal={setShowModal}
      bootcampId={bootcampId}
      getAnalytics={getAnalytics}
    />
  ) : (
    <PingStudentHistory
      showModal={showModal}
      setShowModal={setShowModal}
      bootcampId={bootcampId}
      getAnalytics={getAnalytics}
    />
  );
};
