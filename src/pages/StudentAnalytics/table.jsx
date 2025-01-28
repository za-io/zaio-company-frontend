import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roundOff } from "../../utils/mathUtils";
import { blockUser, unblockUser } from "../../api/student";
import Loader from "../../components/loader/loader";
import { SORTING } from "./learningpath.index";
import { WarningModal } from "./WarningModal";
import { StudentDeferredModal } from "./StudentDeferredModal";
import { formatDate } from "../../utils/dateUtils";
import { StudentPingModal } from "./StudentPingModal";
import { getAllTutors } from "../../api/company";
import { StudentMoreActionsModal } from "./StudentMoreActions";

const AnalyticsTable = ({
  data,
  total,
  loading,
  searchType,
  getAnalytics,
  user,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rowLoading, setRowLoading] = useState(false);
  const [sortBy, setSortBy] = useState(SORTING.PROGRESS_DESC);
  const [showWarningModal, setShowWarningModal] = useState(null);
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(null);

  const [studentDeferredModalConfig, setStudentDeferredModalConfig] =
    useState(null);
  const [studentPingModalConfig, setStudentPingModalConfig] = useState(null);
  const [tutors, setTutors] = useState([]);

  const navigate = useNavigate();
  const handleBootcamp = (bootcampId, learningpathId, userid) => {
    navigate(
      `/student/bootcamp/${bootcampId}/learningpath/${learningpathId}?user_id=${userid}`
    );
  };

  const handleLearningpath = (learningpathId) => {
    navigate(
      `/student/learningpath/${learningpathId}?user_id=636d6613a75d3600222f1875`
    );
  };

  const handleCourse = (courseId, type) => {
    navigate(`/student/course/${courseId}/${type}`);
  };

  const handleBlockUnBlock = async (e, user) => {
    e?.preventDefault();
    console.log(user);
    setRowLoading(user?.userid?._id);
    if (user?.userid?.accBlocked) {
      await unblockUser({
        userid: user?.userid?._id,
      });
    } else {
      await blockUser({
        userid: user?.userid?._id,
      });
    }
    getAnalytics();
    setRowLoading(null);
  };

  const handleChange = (event) => {
    setSortBy(event.target.value);
  };

  const fetchTutors = async () => {
    const tutors = await getAllTutors();
    setTutors(tutors?.data);
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  if (loading) return <></>;

  return (
    <div>
      <WarningModal
        bootcampId={data?.bootcampDetails?._id}
        showModal={showWarningModal}
        setShowModal={setShowWarningModal}
      />

      <StudentMoreActionsModal
        bootcampId={data?.bootcampDetails?._id}
        showModal={showMoreActionsModal}
        setShowModal={setShowMoreActionsModal}
        tutors={tutors}
        getAnalytics={getAnalytics}
      />

      <StudentDeferredModal
        bootcampId={data?.bootcampDetails?._id}
        showModal={studentDeferredModalConfig}
        setShowModal={setStudentDeferredModalConfig}
        getAnalytics={getAnalytics}
      />
      <StudentPingModal
        bootcampId={data?.bootcampDetails?._id}
        showModal={studentPingModalConfig}
        setShowModal={setStudentPingModalConfig}
        getAnalytics={getAnalytics}
      />
      {data?.analytics?.length > 0 && (
        <>
          <div>
            <input
              list="browsers"
              value={searchQuery}
              placeholder="Search Student"
              onChange={(e) => setSearchQuery(e?.target?.value)}
              className="appearance-none block bg-gray-200 text-gray-700 border border-gray-200 rounded py-2 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            />
            <datalist id="browsers">
              {data?.analytics?.map((d) => (
                <option value={d?.userid?.username} />
              ))}
            </datalist>
          </div>
          <select
            className={`py-2 rounded font-semibold px-2 font-medium`}
            value={sortBy}
            onChange={handleChange}
          >
            <option className="text-black-500" disabled>
              {" "}
              -- sort --{" "}
            </option>
            <option value={SORTING.PROGRESS_ASC} className="text-black-500">
              Progress ASC
            </option>
            <option value={SORTING.PROGRESS_DESC} className="text-black-500">
              Progress DESC
            </option>
            <option value={SORTING.DEFERRED_ASC} className="text-black-500">
              DEFERRED ASC
            </option>
            <option value={SORTING.DEFERRED_DESC} className="text-black-500">
              DEFERRED DESC
            </option>
          </select>

          <p className="text-white mt-3">
            {
              data?.analytics?.filter(
                (ba) => ba?.deferredDetails?.studentDeferred
              )?.length
            }{" "}
            out of {data?.analytics?.length} student(s){" "}
            {data?.analytics?.filter(
              (ba) => ba?.deferredDetails?.studentDeferred
            )?.length === 1
              ? "is"
              : "are"}{" "}
            deferred.
          </p>

          <table class="table-fixed w-100 overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
            <thead className="border-b text-2xl bg-gray-50">
              <tr className="">
                <th className="px-1 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Username
                </th>
                <th className="px-1 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Lectures
                </th>
                <th className="px-1 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  MCQs
                </th>
                <th className="px-1 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Coding Challenges
                </th>
                <th className="px-1 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Assignments
                </th>
                <th className="px-1 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Progress
                </th>
                <th className="px-1 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Tutor
                </th>

                <th className="px-1 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  View Progress
                </th>

                {!["TUTOR"]?.includes(user?.role) && (
                  <th className="  py-3 text-xs font-bold text-left text-gray-500 uppercase">
                    Account Status
                  </th>
                )}
                {!["TUTOR"]?.includes(user?.role) && (
                  <th className="   py-3 text-xs font-bold text-gray-500 uppercase">
                    Warnings
                  </th>
                )}
                {/* {!["TUTOR"]?.includes(user?.role) && ( */}
                <th className="   py-3 text-xs font-bold text-gray-500 uppercase">
                  Defer Status
                </th>
                {/* )} */}
                {!["TUTOR"]?.includes(user?.role) && (
                  <th className="   py-3 text-xs font-bold text-gray-500 uppercase">
                    Ping Student
                  </th>
                )}
                <th className="px-1 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  More Actions
                </th>
              </tr>
            </thead>
            {data && data.analytics.length !== 0 && (
              <tbody className="divide-y divide-gray-200">
                {data.analytics
                  ?.filter(
                    (ba) =>
                      ba?.userid?.username
                        ?.toLowerCase()
                        ?.includes(searchQuery?.toLowerCase()) ||
                      ba?.userid?.email
                        ?.toLowerCase()
                        ?.includes(searchQuery?.toLowerCase())
                  )
                  ?.sort((a, b) => {
                    const aTotalProgress =
                      (((a?.completedLecturesCount || 0) +
                        (a?.completedChallengesCount || 0) +
                        (a?.completedMCQCount || 0) +
                        (a?.completedAssignmentCount || 0)) /
                        Object.values(total).reduce(
                          (val, tot) => (val ?? 0) + tot,
                          0
                        )) *
                      100;

                    const bTotalProgress =
                      (((b?.completedLecturesCount || 0) +
                        (b?.completedChallengesCount || 0) +
                        (b?.completedMCQCount || 0) +
                        (b?.completedAssignmentCount || 0)) /
                        Object.values(total).reduce(
                          (val, tot) => (val ?? 0) + tot,
                          0
                        )) *
                      100;

                    if (sortBy === SORTING.PROGRESS_DESC) {
                      return bTotalProgress - aTotalProgress;
                    } else if (sortBy === SORTING.PROGRESS_ASC) {
                      return aTotalProgress - bTotalProgress;
                    } else if (sortBy === SORTING.DEFERRED_ASC) {
                      return (
                        Boolean(b?.deferredDetails?.studentDeferred) -
                        Boolean(a?.deferredDetails?.studentDeferred)
                      );
                    } else if (sortBy === SORTING.DEFERRED_DESC) {
                      return (
                        Boolean(a?.deferredDetails?.studentDeferred) -
                        Boolean(b?.deferredDetails?.studentDeferred)
                      );
                    }
                  })
                  ?.map((ba) => {
                    // const classes =
                    //   StylesConfig[user?.currentPerformance]?.styles || "";
                    const totalProgress =
                      (((ba?.completedLecturesCount || 0) +
                        (ba?.completedChallengesCount || 0) +
                        (ba?.completedMCQCount || 0) +
                        (ba?.completedAssignmentCount || 0)) /
                        Object.values(total).reduce(
                          (val, tot) => (val ?? 0) + tot,
                          0
                        )) *
                      100;
                    return (
                      <tr
                        key={ba?._id}
                        className={`cursor-pointer hover:bg-gray-100 cursor-pointer`}
                        onClick={() => {
                          searchType === "bootcamp" &&
                            handleBootcamp(
                              data.bootcampDetails._id,
                              data.bootcampDetails.learningpath,
                              ba?.userid?._id
                            );
                          searchType === "learningpath" &&
                            handleLearningpath(data._id);
                        }}
                      >
                        <td className="px-1 py-4 text-sm font-medium text-gray-800">
                          {ba?.userid?.username}{" "}
                          <span className="text-purple-600">
                            {" "}
                            ({ba?.userid?.email})
                          </span>
                        </td>
                        <td className="px-1 py-4 text-sm font-medium text-gray-800">
                          {total?.lectures !== 0
                            ? `${ba?.completedLecturesCount}/${
                                total?.lectures || 0
                              }`
                            : "NA"}
                        </td>
                        <td
                          className="px-1 py-4 text-sm font-medium text-gray-800"
                          onClick={() => {
                            searchType === "course" &&
                              handleCourse(data._id, "mcq");
                          }}
                        >
                          {total?.mcq !== 0
                            ? `${ba?.completedMCQCount}/${total?.mcq || 0}`
                            : "NA"}
                        </td>
                        <td className="px-1 py-4 text-sm font-medium text-gray-800">
                          {total?.challenge !== 0
                            ? `${ba?.completedChallengesCount}/${
                                total?.challenge || 0
                              }`
                            : "NA"}
                        </td>
                        <td className="px-1 py-4 text-sm font-medium text-gray-800">
                          {total?.assignment !== 0
                            ? `${ba?.completedAssignmentCount}/${
                                total?.assignment || 0
                              } ${total?.assignment}`
                            : "NA"}
                        </td>

                        <td className="px-1 py-4 text-sm font-medium text-gray-800">
                          {roundOff(totalProgress)}%
                        </td>

                        <td className="px-1 py-4 text-sm font-medium text-gray-800">
                          {ba?.tutor?.company_username ||
                            ba?.tutor?.email ||
                            "Not Assigned"}
                        </td>

                        <td className="px-2 py-4 text-sm font-medium text-gray-800">
                          <button
                            className="bg-blue-200 py-2 w-full rounded text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              window.open(
                                `https://www.zaio.io/app/zaio-profile/${ba?.userid?.email}`,
                                "_blank"
                              );
                            }}
                          >
                            View Calendar
                          </button>
                        </td>

                        {!["TUTOR"]?.includes(user?.role) && (
                          <td className="px-1 py-4 text-sm font-medium text-gray-800">
                            <div className="d-flex">
                              <button
                                className={`text-${
                                  ba?.userid?.accBlocked ? "green" : "red"
                                }-200 me-2 py-2 px-5 my-2 rounded font-small`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleBlockUnBlock(event, ba);
                                }}
                              >
                                {ba?.userid?.accBlocked ? "Unblock" : "Block"}
                              </button>
                              {rowLoading === ba?.userid?._id && (
                                <Loader size={20} />
                              )}
                            </div>
                          </td>
                        )}

                        {!["TUTOR"]?.includes(user?.role) && (
                          <td className="px-1 py-4 text-sm font-medium text-gray-800">
                            <button
                              className={`text-orange-400 py-2 my-2 rounded font-small`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setShowWarningModal(ba);
                              }}
                            >
                              Warning
                            </button>
                          </td>
                        )}

                        {/* {!["TUTOR"]?.includes(user?.role) && ( */}
                        <td className="px-1 py-4 text-sm font-medium text-gray-800 text-center">
                          <span
                            onClick={(event) => {
                              event.stopPropagation();
                              setStudentDeferredModalConfig(ba);
                            }}
                          >
                            {ba?.deferredDetails?.studentDeferred ? (
                              `Deferred on ${formatDate(
                                ba?.deferredDetails?.deferredDate
                              )} for ${
                                ba?.deferredDetails?.numberOfDeferMonths
                              }. Click for more details.`
                            ) : // {/* {!["TUTOR"]?.includes(user?.role) && ( */}
                            !["TUTOR"]?.includes(user?.role) ? (
                              <button className="bg-blue-200 py-2 px-4 my-2 rounded font-small">
                                Defer Student
                              </button>
                            ) : (
                              <p>No</p>
                            )}
                          </span>
                        </td>
                        {/* )} */}

                        {!["TUTOR"]?.includes(user?.role) && (
                          <td className="px-1 py-4 flex flex-col text-sm font-medium text-gray-800">
                            <span
                              onClick={(event) => {
                                event.stopPropagation();
                                setStudentPingModalConfig(ba);
                              }}
                            >
                              {/* {ba?.deferredDetails?.studentDeferred ? (
                                `Deferred on ${formatDate(
                                  ba?.deferredDetails?.deferredDate
                                )} for ${
                                  ba?.deferredDetails?.numberOfDeferMonths
                                }. Click for more details.`
                              ) : ( */}
                              <button className="bg-blue-200 p-2 my-2 rounded font-small">
                                Ping
                              </button>
                              {/* )} */}
                            </span>
                            <span
                              onClick={(event) => {
                                event.stopPropagation();
                                setStudentPingModalConfig({
                                  ...ba,
                                  viewHistory: true,
                                });
                              }}
                            >
                              {/* {ba?.deferredDetails?.studentDeferred ? (
                                `Deferred on ${formatDate(
                                  ba?.deferredDetails?.deferredDate
                                )} for ${
                                  ba?.deferredDetails?.numberOfDeferMonths
                                }. Click for more details.`
                              ) : ( */}
                              <button className="bg-orange-200 p-2 my-2 rounded font-small">
                                History
                              </button>
                              {/* )} */}
                            </span>
                          </td>
                        )}

                        {!["TUTOR"]?.includes(user?.role) && (
                          <td className="px-1 py-4 text-sm font-medium text-gray-800">
                            <button
                              className={`text-orange-400 py-2 my-2 rounded font-small`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setShowMoreActionsModal(ba);
                              }}
                            >
                              More Actions
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            )}
            {/* <tr>
        <td></td>
        <td></td>
        <td>
          {loading && (
            <div>
              <Loader />
            </div>
          )}
        </td>
      </tr> */}
          </table>
        </>
      )}
      {data && data.analytics.length === 0 && (
        <div className="text-gray-100">Not enrolled in this bootcamp</div>
      )}
    </div>
  );
};

export default AnalyticsTable;
