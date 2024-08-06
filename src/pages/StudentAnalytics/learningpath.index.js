import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { blockUser, unblockUser } from "../../api/student";
import Loader from "../../components/loader/loader";

export const SORTING = {
  PROGRESS_ASC: "PROGRESS_ASC",
  PROGRESS_DESC: "PROGRESS_DESC",
  DEFERRED_ASC: "DEFERRED_ASC",
  DEFERRED_DESC: "DEFERRED_DESC",
};

const LPAnalyticsTable = ({
  data,
  total,
  loading,
  searchType,
  getAnalytics,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rowLoading, setRowLoading] = useState(false);
  const [sortBy, setSortBy] = useState(SORTING.PROGRESS_DESC);

  const navigate = useNavigate();

  const handleLearningpath = (learningpathId, userid) => {
    navigate(`/student/learningpath/${learningpathId}?user_id=${userid}`);
  };

  const handleBlockUnBlock = async (e, user) => {
    e?.preventDefault();
    console.log(user);
    setRowLoading(user?.userid?._id);
    if (user?.userid?.accBlocked) {
      await unblockUser({
        userid: user?.userid?._id,
      });
    } else {
      await blockUser({
        userid: user?.userid?._id,
      });
    }
    getAnalytics();
    setRowLoading(null);
  };

  const handleChange = (event) => {
    setSortBy(event.target.value);
  };

  if (loading) return <></>;

  return (
    <div>
      {data?.learningpathenrolledusers?.length > 0 && (
        <>
          <div>
            <input
              list="browsers"
              value={searchQuery}
              placeholder="Search Student"
              onChange={(e) => setSearchQuery(e?.target?.value)}
              className="appearance-none block bg-gray-200 text-gray-700 border border-gray-200 rounded py-2 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            />
            <datalist id="browsers">
              {data?.learningpathenrolledusers?.map((d) => (
                <option value={d?.userid?.username} />
              ))}
            </datalist>
            <select
              className={`py-2 rounded`}
              value={sortBy}
              onChange={handleChange}
            >
              <option className="text-black-500" disabled>
                {" "}
                -- sort --{" "}
              </option>
              <option value={SORTING.PROGRESS_ASC} className="text-black-500">
                Progress ASC
              </option>
              <option value={SORTING.PROGRESS_DESC} className="text-black-500">
                Progress DESC
              </option>
              <option value={SORTING.DEFERRED_ASC} className="text-black-500">
                DEFERRED ASC
              </option>
              <option value={SORTING.DEFERRED_DESC} className="text-black-500">
                DEFERRED DESC
              </option>
            </select>
          </div>

          <table class=" overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
            <thead className="border-b text-2xl bg-gray-50">
              <tr className="">
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Username
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Progress
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Account Status
                </th>
              </tr>
            </thead>
            {data && data.learningpathenrolledusers.length !== 0 && (
              <tbody className="divide-y divide-gray-200">
                {data.learningpathenrolledusers
                  ?.filter(
                    (ba) =>
                      ba?.userid?.username
                        ?.toLowerCase()
                        ?.includes(searchQuery?.toLowerCase()) ||
                      ba?.userid?.email
                        ?.toLowerCase()
                        ?.includes(searchQuery?.toLowerCase())
                  )
                  ?.sort((a, b) => {
                    if (sortBy === SORTING.PROGRESS_DESC) {
                      return b?.lpProgress - a?.lpProgress;
                    } else if (sortBy === SORTING.PROGRESS_ASC) {
                      return a?.lpProgress - b?.lpProgress;
                    } else if (sortBy === SORTING.DEFERRED_ASC) {
                      return (
                        Boolean(b?.deferredDetails?.studentDeferred) -
                        Boolean(a?.deferredDetails?.studentDeferred)
                      );
                    } else if (sortBy === SORTING.DEFERRED_DESC) {
                      return (
                        Boolean(a?.deferredDetails?.studentDeferred) -
                        Boolean(b?.deferredDetails?.studentDeferred)
                      );
                    }
                  })
                  ?.map((ba) => {
                    return (
                      <tr
                        key={ba?._id}
                        className={`cursor-pointer hover:bg-gray-100 cursor-pointer`}
                        onClick={() => {
                          handleLearningpath(
                            ba.learningpathid,
                            ba?.userid?._id
                          );
                        }}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                          {ba?.userid?.username}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                          {ba?.userid?.email}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                          {ba?.lpProgress}%
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                          <div className="d-flex">
                            <button
                              className={`bg-${
                                ba?.userid?.accBlocked ? "green" : "red"
                              }-200 me-2 py-2 px-5 my-2 rounded font-small`}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleBlockUnBlock(event, ba);
                              }}
                            >
                              {ba?.userid?.accBlocked ? "Unblock" : "Block"}
                            </button>
                            {rowLoading === ba?.userid?._id && (
                              <Loader size={20} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            )}
          </table>
        </>
      )}
      {data && data.learningpathenrolledusers.length === 0 && (
        <div className="text-gray-100">
          No student enrolled for this learningpath
        </div>
      )}
    </div>
  );
};

export default LPAnalyticsTable;
