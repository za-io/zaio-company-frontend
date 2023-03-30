import React from "react";
import { useLocation, useParams } from "react-router-dom";

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
          {program?.enrolledUsers?.map((user) => (
            <tr key={user?._id} className="border-b">
              <td className="py-2">{user?.userid?.username}</td>
              <td>{user?.userid?.email}</td>
              <td>5</td>
              <td>5</td>
              <td>5</td>
              <td>{user?.completedPercentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Program;
