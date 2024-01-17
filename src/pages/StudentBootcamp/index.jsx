import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getBootcampDetails } from "../../api/company";
import { getAllBootcamps, getUserBootcampAnalytics } from "../../api/student";
import Loader from "../../components/loader/loader";
import CustomDataTable from "./table";

const StylesConfig = {
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

const StudentBootcamp = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [bootcampId, setBootcampId] = useState(searchParams.get("bootcampid") ? searchParams.get("bootcampid") : "642b6236fa796e00203ffe0b");
  const [userId, setUserId] = useState("636d6613a75d3600222f1875");
  const [allBootcamps, setAllBootcamps] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [bootcamp, setBootcamp] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [total, setTotal] = useState(null);
const navigate = useNavigate()
  const handleChange = (event) => {
    console.log("ddsda", event.target.value);
    setBootcampId(event.target.value);
  }


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
    navigate(`?bootcampid=${bootcampId}`, { replace: true })


    setLoading(true);
    console.log(userId, bootcampId);
    getUserBootcampAnalytics(userId, bootcampId)
      .then((res) => {
        setShowTable(true);
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
      <CustomDataTable data={bootcamp} total={total} loading={loading} />
      {loading && <Loader />}
    </div>
  );
};

export default StudentBootcamp;
