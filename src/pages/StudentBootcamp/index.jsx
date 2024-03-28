import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAllBootcamps, getUserBootcampAnalytics } from "../../api/student";
import Loader from "../../components/loader/loader";
import CustomDataTable from "./table";

const StudentBootcamp = () => {
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [bootcampId, setBootcampId] = useState(
    searchParams.get("bootcampid")
      ? searchParams.get("bootcampid")
      : "642b6236fa796e00203ffe0b"
  );
  const [userId] = useState("636d6613a75d3600222f1875");
  const [allBootcamps, setAllBootcamps] = useState([]);
  const [bootcamp, setBootcamp] = useState(null);
  const [total, setTotal] = useState(null);
  const navigate = useNavigate();
  const handleChange = (event) => {
    console.log("ddsda", event.target.value);
    setBootcampId(event.target.value);
  };

  const getBootcamps = () => {
    // setLoading(true);
    getAllBootcamps()
      .then((res) => {
        setAllBootcamps(res?.bootcamps);
        console.log("sasa", res.bootcamps);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getBootcampAnalytics = () => {
    navigate(`?bootcampid=${bootcampId}`, { replace: true });

    setLoading(true);
    console.log(userId, bootcampId);
    getUserBootcampAnalytics(userId, bootcampId)
      .then((res) => {
        setBootcamp(res?.bootcamp);
        setTotal(res?.total);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    getBootcamps();
  }, []);
  return (
    <div className="px-36 py-12">
      <div>
        <select value={bootcampId} onChange={handleChange}>
          {allBootcamps.map((ab) => {
            return <option value={ab._id}>{ab.bootcampName}</option>;
          })}
        </select>
        <button
          onClick={getBootcampAnalytics}
          className="bg-blue-200 mx-2 px-5 rounded font-small"
        >
          Get Details
        </button>
      </div>

      <h1 className="text-4xl font-bold text-gray-100">
        Program: {bootcamp?.bootcampName}
      </h1>
      <CustomDataTable setBootcamp={setBootcamp} data={bootcamp} total={total} loading={loading} />
      {loading && <Loader />}
    </div>
  );
};

export default StudentBootcamp;
