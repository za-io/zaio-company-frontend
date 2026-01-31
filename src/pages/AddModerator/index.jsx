import { useState } from "react";
import { registerTutor } from "../../api/company";
import Loader from "../../components/loader/loader";

export const AddModerator = () => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    setMsg(null);

    const formData = new FormData(e.target);

    const company_username = formData.get("company_username");
    const password = formData.get("password");
    const email = formData.get("email");
    const calendlyLink = formData.get('calendly');
    const image = formData.get('company_user_image');

    // Create FormData for API call (needed for file upload)
    const apiFormData = new FormData();
    apiFormData.append('company_username', company_username);
    apiFormData.append('email', email);
    apiFormData.append('password', password);
    apiFormData.append('role', 'MODERATOR');
    apiFormData.append('bootcamps', JSON.stringify([]));
    if (calendlyLink) {
      apiFormData.append('calendlyLink', calendlyLink);
    }
    if (image) {
      apiFormData.append('image', image);
    }

    setLoading(true);
    registerTutor(apiFormData)
      .then((res) => {
        if (res.success) {
          setMsg("Moderator created successfully!");
          e?.target?.reset();
        } else {
          setMsg(res?.errMsg || res?.message || "Error creating moderator");
        }
      })
      .catch((err) => {
        setMsg("Error creating moderator. Please try again.");
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="mt-8 bg-[#0d1e3a] min-h-screen">
      <form onSubmit={handleSubmit} className="w-8/12 mx-auto">
        <p className="uppercase text-white text-large font-bold mb-4">
          Create Moderator Account
        </p>
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              htmlFor="company_username"
            >
              Moderator Username
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="company_username"
              type="text"
              placeholder="Moderator Username"
              required
            />
          </div>
        </div>
        
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              htmlFor="company_user_image"
            >
              Image Upload (Optional)
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="company_user_image"
              type="file"
              placeholder="Upload Your Image (Optional)"
            />
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2" htmlFor="email">
              Moderator Email
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="email"
              type="email"
              placeholder="Moderator Email"
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2" htmlFor="password">
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
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2" htmlFor="calendly">
              Calendly Link (Optional)
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="calendly"
              type="text"
              placeholder="Fill the link (Optional)"
            />
          </div>
        </div>

        <button
          className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Moderator"}
        </button>

        {msg && (
          <p
            dangerouslySetInnerHTML={{
              __html: msg,
            }}
            className={`text-md mt-3 ${msg.includes("successfully") ? "text-green-500" : "text-red-500"}`}
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

