import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllBootcamps } from "../../api/company";
import Loader from "../../components/loader/loader";
import { useProgramStore } from "../../store/programStore";
import { useUserStore } from "../../store/UserProvider";

const Program = ({ program }) => {
  return (
    <div
      key={program.id}
      className="flex flex-col w-full h-full bg-gray-200 rounded-xl"
    >
      {/* <img src={programImg} alt="programImg" /> */}
      <div className="p-2 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mt-2">{program.bootcampName}</h1>
        {/* <h1 className="text-2xl text-gray-500 mt-2">
          {program.description || "No desc"}
        </h1> */}
        <Link
          to={`/program/${program._id}`}
          state={{
            program,
          }}
          className="w-full"
        >
          <button className="bg-blue-700 w-full py-2 rounded-xl mt-2 text-gray-100">
            View Users
          </button>
        </Link>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [bootcamps, setBootcamps] = useState(null);
  const [loading, setLoading] = useState(false);
  const setPrograms = useProgramStore((state) => state.setPrograms);
  const { user } = useUserStore();
  console.log(user?._id);
  const init = () => {
    setLoading(true);
    getAllBootcamps({
      company_id: user?._id,
    })
      .then((res) => {
        console.log(res);
        if (res?.status === 200) {
          setBootcamps(res?.allBootcamps);
          setPrograms(res?.allBootcamps);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };
  useEffect(() => {
    if (bootcamps || !user?._id) return;
    init();
    // eslint-disable-next-line 
  }, []);

  return (
    <div className="px-36 py-12">
      { user?.role === "SUPER_STUDENT_ADMIN" && <div>
        <Link to={`/student/analytics`} className="w-full">
          <button className="bg-blue-700 w-full py-2 px-36 rounded-xl mt-2 text-gray-100">
            View Bootcamps
          </button>
        </Link>
      </div>}

    {user?.role !== "SUPER_STUDENT_ADMIN" &&  <>
      <h1 className="text-4xl font-bold text-gray-100">My Programs</h1>
      {bootcamps?.length > 0 && (
        <div className="grid grid-cols-3 gap-16 mt-12">
          {bootcamps?.map((program) => (
            <Program program={program} />
          ))}
        </div>
      )}

      {!loading && bootcamps?.length === 0 && (
        <div className="mt-4">
          <p className="text-xl text-center text-gray-100">
            No Bootcamps found for {user?.company_name}
          </p>
        </div>
      )}
      
      </>
}
      {loading && <Loader />}
    </div>
  );
};

export default Dashboard;
