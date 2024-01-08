import { Link } from "react-router-dom";

const MCQTable = ({ data, total, loading }) => {
  // console.log("uuuu", data.bootcampDetails.learningpath);
  console.log("uyuyuyyuyyuuyu", data);
  return (
    <div>
      <table class=" overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
        <thead className="border-b text-2xl bg-gray-50">
          <tr className="">
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              MCQ Name
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Mark
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              %age
            </th>
          </tr>
        </thead>
        {data && (
          <tbody className="divide-y divide-gray-200">
            {data.map((mc) => {
              return (
                <tr
                  className={`cursor-pointer hover:bg-gray-100 cursor-pointer ${
                    mc.attempted == true
                      ? mc.result == 1
                        ? "bg-green-100"
                        : "bg-blue-100"
                      : "bg-red-100"
                  }`}
                  key={mc._id}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {/* {user?.userid?.username} */}
                    {mc.lecturename}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {`${mc.score}/${mc.data.questions.length}`}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {`${(mc.result / 1).toFixed(2) * 100}%`}
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

export default MCQTable;
