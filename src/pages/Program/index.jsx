import React from "react";
import { useLocation, useParams } from "react-router-dom";

const StylesConfig = {
  default: {
    styles: "bg-white",
    color: "grey",
  },
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
  const program = location?.state?.program;

  return (
    <div className="px-36 py-12">
      <h1 className="text-4xl font-bold text-gray-100">
        Program {program?.bootcampName}
      </h1>
      <table class="table-fixed w-full text-gray-100 mt-12 border rounded-xl">
        <thead className="border-b text-2xl">
          <tr className="">
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Code done</th>
            <th>Assignments done</th>
            <th>MCQs done</th>
            <th>Progress %</th>
          </tr>
        </thead>
        <tbody className="text-center">
          {program?.enrolledUsers?.map((user) => {
            const classes =
              StylesConfig[user?.currentPerformance]?.styles || "";
            const color =
              StylesConfig[user?.currentPerformance]?.color || "white";
            return (
              <tr key={user?._id} className={`${classes}`}>
                <td className="py-2">{user?.userid?.username}</td>
                <td>{user?.userid?.email}</td>
                <td>{user?.completedChallengesCount}</td>
                <td>0</td>
                <td>{user?.completedAssignmentCount}</td>
                <td>{user?.completedPercentage}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Program;
