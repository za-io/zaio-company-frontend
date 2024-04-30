import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllBootcamps,
  getAllcompanies,
  mapCompanyBootcamp,
} from "../../api/company";
import Loader from "../../components/loader/loader";
import { useProgramStore } from "../../store/programStore";
import { useUserStore } from "../../store/UserProvider";

const ManageBootcamps = () => {
  const [bootcamps, setBootcamps] = useState(null);
  const [companies, setCompanies] = useState(null);

  const [loading, setLoading] = useState(false);
  const setPrograms = useProgramStore((state) => state.setPrograms);
  const { user } = useUserStore();
  const init = async () => {
    setLoading(true);
    const res = await getAllBootcamps({
      company_id: user?._id,
    });
    const resCompany = await getAllcompanies();

    if (resCompany?.success) {
      console.log(resCompany, "resCompany");
      setCompanies(resCompany?.data);
    }
    if (res?.status === 200) {
      setBootcamps(res?.allBootcamps);
      setPrograms(res?.allBootcamps);
    }
    setLoading(false);
  };

  const handleBootcampUpdate = (e, bootcampid) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const companyid = formData.get("companyid");

    setLoading(bootcampid);
    mapCompanyBootcamp({
      bootcampid,
      companyid,
    })
      .then((res) => {
        console.log(res);
        if (res?.success) {
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    init();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="px-36 py-12">
<p className="text-white text-lg font-bold">Attach Company with Bootcamp,</p>
      {bootcamps?.map((bc) => (
        <div className="border border-gray align-items-center rounded my-4 p-4 d-flex">
          <p className="text-white w-50 text-lg text-bold">
            {bc?.bootcampName}
          </p>

          <form
            className="d-flex w-50"
            onSubmit={(e) => handleBootcampUpdate(e, bc?._id)}
            key={`FORM_${bc?.companyid}`}
          >
            <select
              name="companyid"
              className="block appearance-none w-3/4 bg-gray-200 border border-gray-200 text-gray-700 py-2 pl-4 pr-6 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            >
              {[null, ...companies]?.map((comp) => {
                if (comp === null) {
                  return (
                    <option
                      disabled
                      selected={
                        !companies
                          ?.map((com) => com?._id?.toString())
                          ?.includes(bc?.companyid?.toString())
                      }
                    >
                      -- Not Linked --
                    </option>
                  );
                }
                return (
                  <option
                    selected={
                      bc?.companyid?.toString() === comp?._id?.toString()
                    }
                    key={comp?._id}
                    value={comp?._id}
                  >
                    {comp?.companyname}
                  </option>
                );
              })}
            </select>

            <button
              type="submit"
              className="bg-blue-500 ml-4 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Save Changes
            </button>
            {loading === bc?._id && <Loader size={35} />}
          </form>
        </div>
      ))}
      {loading === true  && <Loader size={35} />}
    </div>
  );
};

export default ManageBootcamps;
