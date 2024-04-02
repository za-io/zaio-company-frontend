import { Link, useNavigate } from "react-router-dom";
import { roundOff } from "../../utils/mathUtils";
import { useUserStore } from "../../store/UserProvider";
import { useState } from "react";

const LearningpathTable = ({
  data,
  userData,
  loading,
  userId,
  learningpath,
}) => {
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();
  const [searchQuery, setSearchQuery] = useState(null);

  return (
    <div>
      {!loading && (
        <div>
          {user?.email && (
            <div
              onClick={() => {
                navigate(-1);
              }}
              className="cursor-pointer"
            >
              <i class="bi bi-arrow-left text-white text-4xl"></i>
            </div>
          )}

          <h5 className="text-red-500 font-bold">
            Student Name : {userData?.username}
          </h5>
          <p className="text-white">
            Challenges Avg:{" "}
            {roundOff(
              (learningpath?.learningpath?.analytics[0]?.score?.challenge
                ?.marks /
                learningpath?.learningpath?.analytics[0]?.score?.challenge
                  ?.total) *
                100
            ) || 0}
            %
          </p>
          <p className="text-white">
            MCQ Avg:{" "}
            {roundOff(
              (learningpath?.learningpath?.analytics[0]?.score?.mcq?.marks /
                learningpath?.learningpath?.analytics[0]?.score?.mcq?.total) *
                100
            ) || 0}
            %
          </p>
        </div>
      )}

      {data && (
        <div className="my-3">
          <input
            list="lectures"
            placeholder="Search Lecture by name or id"
            onChange={(e) => setSearchQuery(e?.target?.value)}
            className="appearance-none w-50 block bg-gray-200 text-gray-700 border border-gray-200 rounded py-2 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
          />
          <datalist id="lectures">
            {learningpath?.allLectures?.map((d) => (
              <option value={d?.lectureId}>{d?.lecturename}</option>
            ))}
          </datalist>
        </div>
      )}
      <table class=" overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
        <thead className="border-b text-2xl bg-gray-50">
          <tr className="">
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Course Name
            </th>
            <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
              Lectures
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
        {data && (
          <tbody className="divide-y divide-gray-200">
            {data
              ?.filter((course) =>
                searchQuery && searchQuery?.length === 24
                  ? course?.lectures?.filter(
                      (lecture) => lecture?.lectureId === searchQuery
                    )?.length > 0
                  : true
              )
              ?.map((course) => {
                const challAvg =
                  roundOff(
                    (course?.analytics[0]?.completedChallengesCount /
                      course?.total?.challenge) *
                      100
                  ) || 0;

                const AssiAvg =
                  roundOff(
                    (course?.analytics[0]?.completedAssignmentCount /
                      course?.total?.assignment) *
                      100
                  ) || 0;

                const lecsAvg =
                  roundOff(
                    (course?.analytics[0]?.completedLecturesCount /
                      course?.total?.lectures) *
                      100
                  ) || 0;

                const mcqAvg = roundOff(course?.analytics[0]?.avgMcqMarks) || 0;

                const totalProgress = roundOff(
                  (((course?.analytics[0]?.completedChallengesCount || 0) +
                    (course?.analytics[0]?.completedMCQCount || 0) +
                    (course?.analytics[0]?.completedLecturesCount || 0) +
                    (course?.analytics[0]?.completedAssignmentCount || 0)) /
                    Object.values(course?.total).reduce(
                      (val, tot) => (val ?? 0) + tot,
                      0
                    )) *
                    100
                );

                return (
                  <tr
                    className={`cursor-pointer hover:bg-gray-100 cursor-pointer`}
                    key={course._id}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {/* {user?.userid?.username} */}
                      {course.courseName}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {`${course?.analytics[0]?.completedLecturesCount}/${course?.total?.lectures}`}{" "}
                      ({lecsAvg}%)
                    </td>

                    <Link
                      to={{
                        pathname: `/student/course/${course._id}/mcq/${userId}`,
                      }}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {`${course?.analytics[0]?.completedMCQCount}/${course?.total?.mcq}`}{" "}
                        ({mcqAvg}%)
                      </td>
                    </Link>
                    <td
                      onClick={() => {
                        navigate(
                          `/student/course/${course._id}/challenges/${userId}`
                        );
                      }}
                      className="px-6 py-4 text-sm font-medium text-gray-800"
                    >
                      {`${course?.analytics[0]?.completedChallengesCount}/${course?.total?.challenge}`}{" "}
                      ({challAvg}%)
                    </td>
                    <td
                      onClick={() => {
                        navigate(
                          `/student/course/${course._id}/assignments/${userId}`
                        );
                      }}
                      className="px-6 py-4 text-sm font-medium text-gray-800"
                    >
                      {`${course?.analytics[0]?.completedAssignmentCount}/${course?.total?.assignment}`}
                      ({AssiAvg}%)
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {totalProgress}%
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
