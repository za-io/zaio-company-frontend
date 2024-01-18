import { Link } from "react-router-dom";

const CourseTable = ({ data, total, loading }) => {
  // console.log("uuuu", data.bootcampDetails.learningpath);
  console.log("uyuyuyyuyyuuyu", total);
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
            <tr className={`cursor-pointer hover:bg-gray-100 cursor-pointer`}>
              <Link to={`/student/learningpath`}>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {/* {user?.userid?.username} */}
                  Asif
                </td>
              </Link>
              <td className="px-6 py-4 text-sm font-medium text-gray-800">
                {`0/${total?.mcq}`}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-800">
                {`0/${total?.challenge}`}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-800">
                {`0/${total?.assignment}`}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-800">
                {`0`}%
              </td>
            </tr>
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

export default CourseTable;
