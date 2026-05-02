import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getUserLearningpathAnalytics } from "../../api/student";
import Loader from "../../components/loader/loader";
import LearningpathTable from "../StudentLearningPath/table";

const StudentLearningPath = () => {
  const { learningpathid, bootcampid } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const user_id = queryParams.get("user_id");

  const [loading, setLoading] = useState(true);
  const [learningpathId] = useState(learningpathid);
  const [userId] = useState(user_id ? user_id : "636d6613a75d3600222f1875");
  const [learningpath, setLearningpath] = useState(null);

  const getAnalytics = () => {
    getUserLearningpathAnalytics(userId, learningpathId)
      .then((res) => {
        setLearningpath(res);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    getAnalytics();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1117] px-6 md:px-12 lg:px-24 xl:px-36 py-8">
      <LearningpathTable
        learningpath={learningpath}
        learningpathId={learningpathId}
        bootcampId={bootcampid || null}
        data={learningpath?.courses}
        total={learningpath?.total}
        loading={loading}
        userId={userId}
        userData={learningpath?.userData}
        onDataRefresh={getAnalytics}
      />

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader />
          <p className="mt-4 text-gray-400">Loading student progress...</p>
        </div>
      )}
    </div>
  );
};

export default StudentLearningPath;
