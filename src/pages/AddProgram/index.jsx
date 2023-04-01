import { addProgram } from "../../api/company";

export const AddProgram = () => {
  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const programName = formData.get("programName");
    const learningPath = formData.get("learningPath");
    const emails = formData.get("emails");

    console.log(programName, learningPath, emails);

    addProgram({
      programName,
      learningPath,
      emails,
    }).then((res) => {
      console.log(res);
    });

    e?.target?.reset();
  };
  return (
    <div className="mx-36 mt-8">
      <form onSubmit={handleSubmit} className="w-8/12 mx-auto">
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Program Name
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="programName"
              type="text"
              placeholder="Program Name"
              required
            />
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
              required
            />
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
              placeholder="Learning Path ID"
              required
            ></textarea>
            <p className="text-white text-xs italic">
              Please enter emails of learners as a comma seperated value
            </p>
          </div>
        </div>

        <button
          className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Save
        </button>
      </form>
    </div>
  );
};
