import { useEffect, useRef, useState } from "react";
import { registerTutor } from "../../api/company";
import Loader from "../../components/loader/loader";
import { getAllBootcamps } from "../../api/student";
import Multiselect from "multiselect-react-dropdown";

export const AddTutor = () => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [allBootcamps, setAllBootcamps] = useState([]);
  const bootcampSelectionRef = useRef();
  const fetchDropdownData = async () => {
    setLoading(true);
    const bootcamps = await getAllBootcamps();
    setAllBootcamps(bootcamps?.bootcamps);
    setLoading(false);
  };

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    setMsg(null);

    const formData = new FormData(e.target);

    const company_username = formData.get("company_username");
    const password = formData.get("password");
    const email = formData.get("email");
    const calendlyLink = formData.get('calendly')
    const image = formData.get('company_user_image')
    const bootcamps = bootcampSelectionRef.current
      ?.getSelectedItems()
      ?.map((item) => item?.id);

    setLoading(true);
    registerTutor({
      bootcamps,
      company_username,
      email,
      password,
      role: "TUTOR",
      calendlyLink,
      image
    })
      .then((res) => {
        if (res.success) {
          setMsg("Success");
          e?.target?.reset();
        } else {
          setMsg(res?.errMsg);
        }
        bootcampSelectionRef.current?.resetSelectedValues();
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="mt-8 bg-[#0d1e3a] min-h-screen">
      <form onSubmit={handleSubmit} className="w-8/12 mx-auto">
        <p className="uppercase text-white text-large font-bold mb-4">
          Create Tutor Account
        </p>
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Tutor Username
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="company_username"
              type="text"
              placeholder="Tutor Username"
              required
            />
          </div>
        </div>
        
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Image Upload
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="company_user_image"
              // onChange={handleImage}
              type="file"
              placeholder="Upload Your Image (Optional)"
            />
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              Tutor Email
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="email"
              type="email"
              placeholder="Tutor Email"
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              Password
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="password"
              type="text"
              placeholder="Password"
              required
            />
          </div>
        </div>

        {/* <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Tutor Name
            </label>

            <Multiselect
              className="appearance-none block  w-full bg-gray-200 text-gray-700 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              options={allBootcamps?.map((bootcamp) => ({
                name: bootcamp?.bootcampName,
                id: bootcamp?._id,
              }))}
              ref={bootcampSelectionRef}
              displayValue="name" // Property name to display in the dropdown options
            />
          </div>
        </div> */}
       
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              Calendly Link
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="calendly"
              type="text"
              placeholder="Fill the link"
              required
            />
          </div>
        </div>

        <button
          className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Create
        </button>

        {msg && (
          <p
            dangerouslySetInnerHTML={{
              __html: msg,
            }}
            className="text-white text-md mt-3"
          />
        )}
      </form>

      {loading && (
        <div className="absolute left-0 right-0 top-0 bottom-0 flex align-center justify-center">
          <Loader />
        </div>
      )}
    </div>
  );
};
