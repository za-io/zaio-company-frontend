const calcClasses = (type, mc) => {
  if (type === "MCQ") {
    return mc.attempted === true ? "bg-green-100" : "bg-red-100";
  } else {
    return mc.attempted === true
      ? mc.result === 1
        ? "bg-green-100"
        : "bg-blue-100"
      : "bg-red-100";
  }
};

const MCQTable = ({ loading, data, type, userId }) => {
  const { user } = useUserStore();

  const showSubmittedCode = (code) => {
    window.open(
      `${
        window.location.hostname === "localhost"
          ? "http://localhost:3001/"
          : "https://www.zaio.io/"
      }watch/${code?.courseid}/${code?.courseunitid}/${
        code?.lectureid
      }?userid=${userId}${user?.role === "TUTOR" ? "&tutor=true" : ""}`,
      "_blank"
    );
  };

  return (
    <div>
      <table class=" overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
        <thead className="border-b text-2xl bg-gray-50">
          <tr className="">
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Name
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Type
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Mark
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Percentage
            </th>
          </tr>
        </thead>
        {data && (
          <tbody className="divide-y divide-gray-200">
            {data.map((mc) => {
              return (
                <tr
                  className={`cursor-pointer hover:bg-gray-100 cursor-pointer ${calcClasses(
                    type,
                    mc
                  )}`}
                  key={mc._id}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {/* {user?.userid?.username} */}
                    {mc.lecturename}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {mc.type || "MCQ"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {type === "MCQ" ? (
                      `${mc.score}/${mc?.data?.questions?.length}`
                    ) : (
                      <button
                        onClick={() => {
                          showSubmittedCode(mc);
                        }}
                      >
                        View Code
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {`${(mc.result / 1).toFixed(2) * 100}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        )}
      </table>
      {data?.length === 0 && !loading && (
        <div className="text-gray-100">No data found</div>
      )}
    </div>
  );
};

export default MCQTable;
