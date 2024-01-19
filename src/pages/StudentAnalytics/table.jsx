import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AnalyticsTable = ({ data, total, loading, searchType }) => {
  const [searchQuery, setSearchQuery] = useState("");
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

  if (loading) return <></>;

  return (
    <div>
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
      {data?.analytics?.length > 0 && (
        <table class=" overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
          <thead className="border-b text-2xl bg-gray-50">
            <tr className="">
              <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                Username
              </th>
              <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                MCQs
              </th>
              <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                Coding Challenges
              </th>
              <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                Assignments
              </th>
              <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                Progress
              </th>
              <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                View Progress
              </th>
            </tr>
          </thead>
          {data && data.analytics.length !== 0 && (
            <tbody className="divide-y divide-gray-200">
              {data.analytics
                ?.filter((ba) => ba?.userid?.username?.includes(searchQuery))
                ?.map((ba) => {
                  // const classes =
                  //   StylesConfig[user?.currentPerformance]?.styles || "";

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
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {ba?.userid?.username}
                      </td>
                      <td
                        className="px-6 py-4 text-sm font-medium text-gray-800"
                        onClick={() => {
                          searchType === "course" &&
                            handleCourse(data._id, "mcq");
                        }}
                      >
                        {`${ba?.completedMCQCount}/${total?.mcq || 0}`}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {`${ba?.completedChallengesCount}/${
                          total?.challenge || 0
                        }`}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {`${ba?.completedAssignmentCount}/${
                          total?.assignment || 0
                        }`}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {ba?.completedPercentage}%
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        <button
                          className="bg-blue-200 py-2 px-5 my-2 rounded font-small"
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
      )}
      {data && data.analytics.length === 0 && (
        <div className="text-gray-100">Not enrolled in this bootcamp</div>
      )}
    </div>
  );
};

export default AnalyticsTable;
