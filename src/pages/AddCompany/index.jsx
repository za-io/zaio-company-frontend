import { useState } from "react";
import { addCompany } from "../../api/company";
import Loader from "../../components/loader/loader";

export const AddCompany = () => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    setMsg(null);

    const formData = new FormData(e.target);

    const company_username = formData.get("company_username");
    const password = formData.get("password");
    const email = formData.get("email");
    const company_name = formData.get("company_name");

    setLoading(true);
    addCompany({
      company_name,
      company_username,
      email,
      password,
      role: "COMPANY_ADMIN",
    })
      .then((res) => {
        if (res.success) {
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
        <p
          className="uppercase text-white text-large font-bold mb-4"
        >
          Create Company Account
        </p>
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Company Username
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="company_username"
              type="text"
              placeholder="Company Username"
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              Company Email
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="email"
              type="text"
              placeholder="Company Email"
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

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Company Name
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="company_name"
              type="text"
              placeholder="Company Name"
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
