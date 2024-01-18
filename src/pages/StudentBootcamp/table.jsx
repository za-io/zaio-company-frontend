import { Link, useNavigate } from "react-router-dom";

const BootcampTable = ({ data, total, loading }) => {
  const navigate = useNavigate();
  const handleLearningPath = (bootcampId, learningpathId, userid) => {
    navigate(
      `/student/bootcamp/${bootcampId}/learningpath/${learningpathId}?user_id=${userid}`
    );
  };

  return (
    <div>
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
              Challenges
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Assignments
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Progress
            </th>
          </tr>
        </thead>
        {data && data.analytics.length != 0 && (
          <tbody className="divide-y divide-gray-200">
            {data.analytics?.map((ba) => {
              // const classes =
              //   StylesConfig[user?.currentPerformance]?.styles || "";

              return (
                <tr
                  key={ba?._id}
                  className={`cursor-pointer hover:bg-gray-100 cursor-pointer`}
                  onClick={() => {
                    handleLearningPath(
                      data.bootcampDetails._id,
                      data.bootcampDetails.learningpath,
                      ba.userid?._id
                    );
                  }}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {/* {user?.userid?.username} */}
                    Asif
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {`${ba?.completedMCQCount}/${total?.mcq}`}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {`${ba?.completedChallengesCount}/${total?.challenge}`}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {`${ba?.completedAssignmentCount}/${total?.assignment}`}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {ba?.completedPercentage}%
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
      {data && data.analytics.length == 0 && (
        <div className="text-gray-100">Not enrolled in this bootcamp</div>
      )}
    </div>
  );
};

export default BootcampTable;
