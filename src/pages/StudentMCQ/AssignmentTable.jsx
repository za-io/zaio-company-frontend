import { useState } from "react";

const AssignmentTable = ({ data, total, loading, type }) => {
  // console.log("uuuu", data.bootcampDetails.learningpath);
  console.log("uyuyuyyuyyuuyu", data);
  const [code, setCode] = useState(null)

  const showSubmittedCode = (code) => {
    setCode(code)
  }

  function decode(bytes) {
    var escaped = "";

    try {
      escaped = escape(atob(bytes || ""));
    } catch (e) {
      console.log("ERROR", e);
      return "";
    }

    try {
      return decodeURIComponent(escaped);
    } catch (e) {
      console.log("ERROR", e);
      return unescape(escaped);
    }
  }
  

  return (
    <div>
     {
      code && <code className="text-white">
{decode(code?.data?.sourcefiles?.[0]?.sourcecode)}

      </code>
     }
      <table class=" overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
        <thead className="border-b text-2xl bg-gray-50">
          <tr className="">
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Name
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Mark
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Progress
            </th>
          </tr>
        </thead>
        {data && (
          <tbody className="divide-y divide-gray-200">
            {data.map((mc) => {
              return (
                <tr
                  className={`cursor-pointer hover:bg-gray-100 cursor-pointer ${
                    mc.attempted===true
                      ? mc.result===1
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
                    {type==="MCQ" ? `${mc.score}/${mc?.data?.questions?.length}` : <button onClick={() => {
                      showSubmittedCode(mc)
                    }}>View Code</button>}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {`${(mc.finalgrade / 100).toFixed(2) * 100}%`}
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

export default AssignmentTable;
