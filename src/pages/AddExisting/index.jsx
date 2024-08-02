import { useEffect, useState } from "react";
import {
  addIntoExiting,
  checkEnrollmentEligibility,
  enrollStudentsIntoLP,
  getAllBootcamps,
  getAllLPs,
} from "../../api/company";
import Loader from "../../components/loader/loader";
import { useUserStore } from "../../store/UserProvider";
import { flowTypes } from "../AddProgram";
export const AddExiting = () => {
  const [loading, setLoading] = useState(false);
  const [bootcampList, setBootcampList] = useState(null);
  const [allEnrolled, setAllEnrolled] = useState(null);
  const [flow, setFlow] = useState(null);
  const [lpList, setLpList] = useState(null);

  const { user } = useUserStore();

  const [msg, setMsg] = useState(null);
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const allBootcampsRes = await getAllBootcamps({
          company_id: user?._id,
        });

        const allLPsRes = await getAllLPs();

        console.log(allBootcampsRes);
        if (allBootcampsRes?.status === 200) {
          setBootcampList(allBootcampsRes?.allBootcamps);
        }

        if (allLPsRes?.status === 200) {
          setLpList(allLPsRes?.allLps);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const checkAndEnrollStudents = (e) => {
    const formData = new FormData(e.target);
    const learningPath = formData.get("learningPath");
    const emails = formData.get("emails");

    if (!learningPath || !emails)
      return setMsg("Please enter learningpath and emails.");
    setLoading(true);
    checkEnrollmentEligibility({
      learningPath,
      emails,
    })
      .then(async (res) => {
        if (res?.missingEmails?.length > 0) {
          //show the list of missing users
          setMsg(`Please ask the below students to make an account as they can not be seen in the Zaio system:\n
          ${res?.missingEmails?.join(", ")}
          `);
        } else {
          //call the enrollment api
          const enrollRes = await enrollStudentsIntoLP({
            emails,
            learningpathid: learningPath,
          });

          console.log(enrollRes, "enrollRes");
          setAllEnrolled(true);
          setMsg(enrollRes?.message || "Error enrolling the students.");
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (flow === flowTypes.enroll_students) return checkAndEnrollStudents(e);

    setMsg(null);

    const formData = new FormData(e.target);
    const bootcampDocId = formData.get("bootcampDocId");
    const emails = formData.get("emails");
    const startDate = formData.get("startDate");
    const commitedMins = formData.get("commitedMins");
    const holidays = formData.get("holidays");

    if (!allEnrolled) {
      return setMsg(
        "Please enroll all the students into the learningpath first."
      );
    }

    setLoading(true);

    addIntoExiting({
      bootcampDocId,
      emails,
      startDate,
      commitedMins,
      holidays,
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
        <p className="uppercase text-white text-large font-bold mb-4">
          Add to Existing Program
        </p>
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              Bootcamp Doc Id
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="bootcampDocId"
              type="text"
              placeholder="Bootcamp Doc Id"
              required
              list="bootcamp_suggestions"
            />
            <datalist id="bootcamp_suggestions">
              {bootcampList?.map((bootcamp) => (
                <option value={bootcamp?._id}>{bootcamp?.bootcampName}</option>
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              learning path ID
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="learningPath"
              type="text"
              placeholder="Learning Path ID"
              list="lp_suggestions"
            />
            <datalist id="lp_suggestions">
              {lpList?.map((lp) => (
                <option value={lp?._id}>{lp?.learningpathname}</option>
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
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Add Holidays
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="holidays"
              type="text"
              placeholder="'MM-DD-YYYY'-'MM-DD-YYYY','MM-DD-YYYY'-'MM-DD-YYYY'"
            />
            <p className="text-white text-xs italic">
              Please enter holidays in the following syntex
              "08/10/2024"-"08/12/2024","09/10/2024"-"09/14/2024","10/01/2024"-"10/01/2024"
              where the date format will be MM-DD-YYYY
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setFlow(flowTypes.bootcamp_api);
          }}
          className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Save
        </button>

        <button
          onClick={() => {
            setFlow(flowTypes.enroll_students);
          }}
          className="shadow ml-3 bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Enroll into learningpath
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
