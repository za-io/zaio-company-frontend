import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getBootcampDetails } from "../../api/company";
import { Pie } from "react-chartjs-2";
import { MoreDetailsModal } from "./MoreDetailsModal";

export const StylesConfig = {
  completed: {
    styles: "bg-green-500 text-white",
    color: "white",
    clr: "green",
  },
  late: {
    styles: "bg-yellow-500 text-white",
    color: "white",
    clr: "yellow",
  },
  pending: {
    styles: "bg-red-500 text-white",
    color: "white",
    clr: "red",
  },
  blocked: {
    styles: "bg-gray-500 text-white",
    color: "white",
    clr: "gray",
  },
  advanced: {
    styles: "bg-blue-500 text-white",
    color: "white",
    clr: "blue",
  },
};

const groupBy = (items, key) =>
  items.reduce(
    (result, item) => ({
      ...result,
      [item[key]]: [...(result[item[key]] || []), item],
    }),
    {}
  );

const Program = () => {
  const [bootcampDetails, setBootcampDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [showDetailsModal, setShowDetailsModal] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const program = location?.state?.program;

  const init = () => {
    setLoading(true);
    console.log(program?._id);
    getBootcampDetails(program?._id)
      .then((res) => {
        console.log(res?.bootcampDetails);
        if (res?.status === 200) {
          setBootcampDetails(res?.bootcampDetails);
          setAnalytics(
            groupBy(res?.bootcampDetails?.enrolledUsers, "currentPerformance")
          );
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };
  useEffect(() => {
    if (bootcampDetails) return;
    init();
    // eslint-disable-next-line
  }, []);

  const openProfile = (user) => {
    window.open(
      `https://www.zaio.io/app/zaio-profile/${user?.userid?.email}`,
      "_blank"
    );
  };

  const showMoreDetails = (e, user) => {
    setShowDetailsModal({
      userid: user?.userid?._id,
      learningpath: user?.learningpath,
      email: user?.userid?.email
    });
    e?.stopPropagation();
  };

  useEffect(() => {
    if (!program) {
      navigate("/");
    }
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return (
      <div className="px-36 py-12">
        <p className="text-white">Loading bootcamp details....</p>
      </div>
    );
  }

  return (
    <div className="px-36 py-12">
      <div className="flex justify-between">
        <MoreDetailsModal
          showDetailsModal={showDetailsModal}
          setShowDetailsModal={setShowDetailsModal}
          init={init}
        />
        <h1 className="text-4xl font-bold text-gray-100">
          Program: {program?.bootcampName}
        </h1>
        <div>
          <button
            onClick={() => {
              setShowAnalytics((prev) => {
                if (prev) {
                  setFilterType(null);
                }

                return !prev;
              });
            }}
            className="shadow ml-3 bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
            type="button"
          >
            Show Analytics
          </button>

          <button
            onClick={() => {
              setFilterType(null);
            }}
            className="shadow ml-3 bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
            type="button"
          >
            Clear filter {filterType ? "(" + filterType + ")" : ""}
          </button>
        </div>
      </div>
      {showAnalytics && analytics && (
        <div className="flex flex-column align-center justify-center py-10 w-25">
          <Pie
            data={{
              labels: Object.keys(analytics),

              datasets: [
                {
                  label: "Number of Students",
                  data: Object.values(analytics)?.map((types) => types.length),
                  backgroundColor: Object.keys(analytics)?.map(
                    (type) => StylesConfig?.[type]?.clr
                  ),
                },
              ],
            }}
            options={{
              onClick: function (evt, element) {
                if (element.length > 0) {
                  setFilterType(Object.keys(analytics)[element?.[0]?.index]);
                }
              },
            }}
          />

          <div className="flex flex-column">
            {Object.keys(analytics).map((analytic) => (
              <p className="text-white my-1 w-100">
                {analytic.toLowerCase()} : {analytics[analytic].length} Students
              </p>
            ))}
          </div>

          <p className="text-white mt-2">
            Note: Click on the Pie Arc to filter the data.
          </p>
        </div>
      )}
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

            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              More
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {bootcampDetails?.enrolledUsers
            ?.filter((user) =>
              filterType ? user?.currentPerformance === filterType : true
            )
            ?.map((user) => {
              const classes =
                StylesConfig[user?.currentPerformance]?.styles || "";

              return (
                <tr
                  key={user?._id}
                  className={`${classes} cursor-pointer hover:bg-gray-100 cursor-pointer`}
                  onClick={() => openProfile(user)}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {user?.userid?.username} ({user?.commitedTime} mins)
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
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    <button
                      onClick={(e) => {
                        showMoreDetails(e, user);
                      }}
                    >
                      <i class="bi bi-three-dots-vertical pointer"></i>
                    </button>
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
