import React from "react";
import logo from "../../assets/img/logo/zaio-logo-light.png";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/UserProvider";

const Navbar = () => {
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("TOKEN");
    navigate("/login");
    setUser(null);
  };
  return (
    <div className="w-full flex justify-between items-center px-36 py-4 border-b border-gray-500">
      <Link to="/" className="flex items-end">
        <img className="h-10" src={logo} alt="" />
        {user?.email && (
          <p className="text-white m-0 ms-3 text-lg font-bold text-purple-200">
            Hello, {user?.company_username}
          </p>
        )}
      </Link>

      <div className="flex">
        {user?.email &&
          ["SUPER_ADMIN", "COMPANY_ADMIN"]?.includes(user?.role) && (
            <select
              className="bg-gray-800 border text-white px-4 py-2 rounded font-medium"
              onChange={(event) => {
                const selectedOption = event.target.value;
                // Handle selected option
                switch (selectedOption) {
                  case "/program/add":
                  case "/program/add/exiting":
                  case "/company/add":
                    navigate(selectedOption);
                    break;

                  default:
                    break;
                }
              }}
            >
              <option value="" disabled>
                --options--
              </option>
              {user?.email &&
                ["SUPER_ADMIN", "COMPANY_ADMIN"]?.includes(
                  user?.role
                ) && <option value="/program/add">New Program</option>}
              {user?.email &&
                ["SUPER_ADMIN", "COMPANY_ADMIN"]?.includes(
                  user?.role
                ) && (
                  <option value="/program/add/exiting">Add to existing program</option>
                )}
              {user?.email && ["SUPER_ADMIN"]?.includes(user?.role) && (
                <option value="/company/add">New Company</option>
              )}
            </select>
          )}
        {user?.email && (
          <button
            onClick={handleLogout}
            className="bg-red-500 ms-4 px-12 py-3 rounded font-medium"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
