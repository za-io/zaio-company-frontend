import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  getUserLearningpathAnalytics,
} from "../../api/student";
import Loader from "../../components/loader/loader";
import LearningpathTable from "../StudentLearningPath/table";

const StudentLearningPath = () => {
  const { learningpathid } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const user_id = queryParams.get("user_id");

  const [loading, setLoading] = useState(false);
  const [learningpathId] = useState(learningpathid);
  const [userId] = useState(user_id ? user_id : "636d6613a75d3600222f1875");
  const [learningpath, setLearningpath] = useState(null);

  const getAnalytics = () => {
    setLoading(true);
    getUserLearningpathAnalytics(userId, learningpathId)
      .then((res) => {
        console.log("learningpathcouruoeuzoudsouasdou", res);
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
    <div className="px-36 py-12">
      {/* <button disabled={loading} onClick={getAnalytics} className="bg-blue-500 px-12 py-3 rounded font-medium">
        Refresh
      </button> */}

      <LearningpathTable
      learningpath={learningpath}
        data={learningpath?.courses}
        total={learningpath?.total}
        loading={loading}
        userId={userId}
      />

      {loading && <Loader />}
    </div>
  );
};

export default StudentLearningPath;
