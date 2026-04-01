import React, { useEffect, useState } from "react";
import {
  getAllBootcamps,
  getAllCompanyAdmins,
  mapCompanyBootcamp,
} from "../../api/company";
import Loader from "../../components/loader/loader";
import { useProgramStore } from "../../store/programStore";
import { useUserStore } from "../../store/UserProvider";

function formatCompanyAdminLabel(admin) {
  const name = (admin?.company_name || "").trim() || (admin?.company_username || "").trim();
  const email = (admin?.email || "").trim();
  if (name && email) return `${name} · ${email}`;
  if (name) return name;
  return email || String(admin?._id || "");
}

const ManageBootcamps = () => {
  const [bootcamps, setBootcamps] = useState(null);
  const [companyAdmins, setCompanyAdmins] = useState(null);

  const [loading, setLoading] = useState(false);
  const setPrograms = useProgramStore((state) => state.setPrograms);
  const { user } = useUserStore();
  const init = async () => {
    setLoading(true);
    const res = await getAllBootcamps({
      company_id: user?._id,
    });
    const resAdmins = await getAllCompanyAdmins();

    if (resAdmins?.success) {
      setCompanyAdmins(resAdmins?.data);
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
      companyid: companyid || null,
    })
      .then((res) => {
        if (res?.success) {
          init();
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

  const adminIds = (companyAdmins || []).map((a) => a?._id?.toString()).filter(Boolean);

  return (
    <div className="px-36 py-12">
      <p className="text-white text-lg font-bold">Attach company admin with bootcamp</p>
      <p className="text-gray-400 text-sm mb-4">
        Each bootcamp is linked to a company admin account (the same ID used elsewhere in the company app).
      </p>
      {bootcamps?.map((bc) => (
        <div
          key={bc._id}
          className="border border-gray align-items-center rounded my-4 p-4 d-flex"
        >
          <p className="text-white w-50 text-lg text-bold">{bc?.bootcampName}</p>

          <form
            className="d-flex w-50"
            onSubmit={(e) => handleBootcampUpdate(e, bc?._id)}
          >
            <select
              key={`${bc._id}-${bc?.companyid ?? ""}`}
              name="companyid"
              className="block appearance-none w-3/4 bg-gray-200 border border-gray-200 text-gray-700 py-2 pl-4 pr-6 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              defaultValue={bc?.companyid ? String(bc.companyid) : ""}
            >
              <option value="">
                {bc?.companyid && !adminIds.includes(String(bc.companyid))
                  ? "-- Linked (unknown admin) — pick to replace --"
                  : "-- Not linked --"}
              </option>
              {(companyAdmins || []).map((admin) => (
                <option key={admin._id} value={admin._id}>
                  {formatCompanyAdminLabel(admin)}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="bg-blue-500 ml-4 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Save changes
            </button>
            {loading === bc?._id && <Loader size={35} />}
          </form>
        </div>
      ))}
      {loading === true && <Loader size={35} />}
    </div>
  );
};

export default ManageBootcamps;
