import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTutorDetails } from "../../api/company";
import Loader from "../../components/loader/loader";

export const ViewTutor = () => {
  const { tutorId } = useParams();
  const [tutorDetails, setTutorDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchTutorDetails = async () => {
    setLoading(true);
    try {
      const tutorDetRes = await getTutorDetails(tutorId);
      if (tutorDetRes?.success) {
        setTutorDetails(tutorDetRes?.data);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(tutorId);
    if (tutorId) fetchTutorDetails();
  }, [tutorId]);

  return (
    <div className="w-100 px-32">
      <div className="mt-3 flex">
        <a
          onClick={(e) => {
            e.preventDefault();
            navigate(`/ssm/tutor/all/`);
          }}
          className="text-blue-400 cursor-pointer me-2"
        >
          All Tutor
        </a>
        <p
          className="
          m-0 text-white"
        >
          / {tutorDetails?.company_username}
        </p>
      </div>
      <div className="mt-4 border border-gray-700 rounded p-4">
        <h3 className="text-lg mb-4 font-semibold text-white">
          Enrolled Bootcamps
        </h3>
        <div className="mt-2">
          <ul>
            {tutorDetails?.bootcamps?.map((bootcamp, index) => (
              <li
                key={index}
                className="flex justify-between text-white p-2 border-b border-gray-700"
              >
                {bootcamp.bootcampName}{" "}
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/ssm/tutor/${tutorDetails?._id}/bootcamp/${bootcamp?._id}`, {
                      state: bootcamp.bootcampName,
                    });
                  }}
                  className="text-blue-400 cursor-pointer"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
          {!loading && !tutorDetails?.bootcamps?.length && (
            <p className="text-gray-400">
              No Bootcamps available at the moment.
            </p>
          )}
        </div>
        {/* Loader */}
        {loading && (
          <div className="flex flex-col items-center">
            <Loader />
            <p className="m-0 text-white text-center">Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
};
