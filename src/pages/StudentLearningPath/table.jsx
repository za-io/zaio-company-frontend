import { Link } from "react-router-dom";

const LearningpathTable = ({ data, total, loading }) => {
  // console.log("uuuu", data.bootcampDetails.learningpath);
  console.log("uyuyuyyuyyuuyu", data);
  return (
    <div>
      <table class=" overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
        <thead className="border-b text-2xl bg-gray-50">
          <tr className="">
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Course Name
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
          </tr>
        </thead>
        {data && (
          <tbody className="divide-y divide-gray-200">
            {data.map((course) => {
              return (
                <tr
                  className={`cursor-pointer hover:bg-gray-100 cursor-pointer`}
                  key={course._id}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {/* {user?.userid?.username} */}
                    {course.courseName}
                  </td>
                  <Link
                    to={{
                      pathname: `/student/course/${course._id}/mcq`,
                    }}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {`${course?.analytics[0]?.completedMCQCount}/${course?.total?.mcq}`}
                    </td>
                  </Link>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {`${course?.analytics[0]?.completedChallengesCount}/${course?.total?.challenge}`}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {`${course?.analytics[0]?.completedAssignmentCount}/${course?.total?.assignment}`}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {course?.analytics[0]?.completedPercentage}%
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
      {/* {!data && (
        <div className="text-gray-100">Not enrolled in this bootcamp</div>
      )} */}
    </div>
  );
};

export default LearningpathTable;
