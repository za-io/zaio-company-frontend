import bootcamp from "actions/services/bootcamp.service";
import Loader from "components/Loader/Loader";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export const AllEnrolledBootcamps = ({ user }) => {
  const [enrolledBootcamps, setEnrolledBootcamps] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (enrolledBootcamps) return;
    setLoading(true);
    console.log(user?.data?.email);
    bootcamp
      .fetchAllEnrolledBootcamps({
        email: user?.data?.email,
      })
      .then((res) => {
        setEnrolledBootcamps(res?.enrolledBootcamps);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col align-center items-center">
      {enrolledBootcamps?.map((enrolledBootcamp) => (
        <div className="my-4">
          <Link
            to={{
              pathname: `bootcamp-mode`,
              search: `?learningpath=${enrolledBootcamp?.learningpath?._id}`,
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {enrolledBootcamp?.learningpath?.learningpathname}
          </Link>
        </div>
      ))}

      {loading && <p>Loading...</p>}
      {!loading && enrolledBootcamps?.length === 0 && <p>No Bootcamps</p>}
    </div>
  );
};
