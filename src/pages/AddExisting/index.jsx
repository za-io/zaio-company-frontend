import { useEffect, useState } from "react";
import { addIntoExiting, getAllBootcamps } from "../../api/company";
import Loader from "../../components/loader/loader";
import useDate from "../../hooks/useDate";
import { useUserStore } from "../../store/UserProvider";
export const AddExiting = () => {
  const [loading, setLoading] = useState(false);
  const [bootcampList, setBootcampList] = useState(null);
  const date = useDate();
  const { user } = useUserStore();

  const [msg, setMsg] = useState(null);
  useEffect(() => {
    const init = () => {
      setLoading(true);
      getAllBootcamps({
        company_id: user?._id,
      })
        .then((res) => {
          console.log(res);
          if (res?.status === 200) {
            setBootcampList(res?.allBootcamps);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    };

    init();
  }, []);
  const handleSubmit = (e) => {
    e.preventDefault();

    setMsg(null);
    const formData = new FormData(e.target);
    const bootcampDocId = formData.get("bootcampDocId");
    const emails = formData.get("emails");
    const startDate = formData.get("startDate");
    const commitedMins = formData.get("commitedMins");

    setLoading(true);
    addIntoExiting({
      bootcampDocId,
      emails,
      startDate,
      commitedMins,
    })
      .then((res) => {
        if (res.status === 200) {
          setMsg("Success");
          e?.target?.reset();
        } else {
          setMsg(res?.errMsg);
        }
        console.log(res);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="mt-8 pb-8">
      <form onSubmit={handleSubmit} className="w-8/12 mx-auto">
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              Bootcamp Doc ID
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="bootcampDocId"
              type="text"
              placeholder="Bootcamp Doc ID"
              required
              list="bootcamp_suggestions"
            />
            <datalist id="bootcamp_suggestions">
              {bootcampList?.map((bootcamp) => (
                <option value={bootcamp?.bootcampName} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              Emails of Learners
            </label>
            <textarea
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="emails"
              type="text"
              placeholder="Emails of Learners"
              required
            ></textarea>
            <p className="text-white text-xs italic">
              Please enter emails of learners as a comma seperated value
            </p>
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Commited Minutes
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="commitedMins"
              type="number"
              placeholder="Commited Minutes"
            />
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Start Date (MM-DD-YYYY)
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="startDate"
              type="text"
              placeholder="MM-DD-YYYY"
            />
          </div>
        </div>

        <button
          className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Save
        </button>

        {msg && <p className="text-white text-md mt-3">{msg}</p>}
      </form>

      {loading && (
        <div className="absolute left-0 right-0 top-0 bottom-0 flex align-center justify-center">
          <Loader />
        </div>
      )}
    </div>
  );
};
