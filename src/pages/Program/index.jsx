import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const StylesConfig = {
  completed: {
    styles: "bg-green-500 text-white",
    color: "white",
  },
  late: {
    styles: "bg-yellow-500 text-white",
    color: "white",
  },
  pending: {
    styles: "bg-red-500 text-white",
    color: "white",
  },
  blocked: {
    styles: "bg-gray-500 text-white",
    color: "white",
  },
  advanced: {
    styles: "bg-blue-500 text-white",
    color: "white",
  },
};
const Program = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const program = location?.state?.program;

  const openProfile = (user) => {
    window.open(
      `https://www.zaio.io/app/zaio-profile/${user?.userid?.email}`,
      "_blank"
    );
  };

  useEffect(() => {
    if (!program) {
      navigate("/");
    }

    // return () => {
    //   second;
    // };
  }, []);

  return (
    <div className="px-36 py-12">
      <h1 className="text-4xl font-bold text-gray-100">
        Program: {program?.bootcampName}
      </h1>
      <table class=" overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
        <thead className="border-b text-2xl bg-gray-50">
          <tr className="">
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Name
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Email
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Lectures Watched
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Code done
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Assignments done
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              MCQs done
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Progress %
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {program?.enrolledUsers?.map((user) => {
            const classes =
              StylesConfig[user?.currentPerformance]?.styles || "";

            return (
              <tr
                key={user?._id}
                className={`${classes} cursor-pointer hover:bg-gray-100 cursor-pointer`}
                onClick={() => openProfile(user)}
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {user?.userid?.username}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {user?.userid?.email}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {user?.completedLecturesCount}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {user?.completedChallengesCount}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {user?.completedAssignmentCount}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {user?.completedMCQCount}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {user?.completedPercentage}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Program;
