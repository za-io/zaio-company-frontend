import React, { useState } from "react";
import logo from "../../assets/img/logo/zaio-logo-light.png";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/UserProvider";

const Navbar = () => {
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem("TOKEN");
    localStorage.clear()
    navigate("/login");
    setUser(null);
  };
  return (
    <>
      <div className="w-full flex justify-between items-center px-36 py-4 border-b border-gray-500">
        <Link to="/" className="flex items-end">
          <img className="h-10" src={logo} alt="" />
          {user?.email && user?.role !== "TUTOR" && (
            <p className="text-white m-0 ms-3 text-lg font-bold text-purple-200">
              Hello, {user?.company_username}
            </p>
          )}
        </Link>

        <div className="flex items-center space-x-4">
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
                    case "/tutor/add":
                    case "/assessor/add":
                    case "/moderator/add":
                    case "/program/manage":
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
                  ["SUPER_ADMIN", "COMPANY_ADMIN"]?.includes(user?.role) && (
                    <option value="/program/add">New Program</option>
                  )}
                {user?.email &&
                  ["SUPER_ADMIN", "COMPANY_ADMIN"]?.includes(user?.role) && (
                    <option value="/program/add/exiting">
                      Add to existing program
                    </option>
                  )}
                {user?.email && ["SUPER_ADMIN"]?.includes(user?.role) && (
                  <option value="/company/add">New Company</option>
                )}
                {user?.email && ["SUPER_ADMIN"]?.includes(user?.role) && (
                  <option value="/tutor/add">New Tutor</option>
                )}
                {user?.email && ["SUPER_ADMIN"]?.includes(user?.role) && (
                  <option value="/assessor/add">New Assessor</option>
                )}
                {user?.email && ["SUPER_ADMIN"]?.includes(user?.role) && (
                  <option value="/moderator/add">New Moderator</option>
                )}
                  {user?.email && ["SUPER_ADMIN", "COMPANY_ADMIN"]?.includes(user?.role) && (
                  <option value="/program/manage">Manage Bootcamps</option>
                )}
              </select>
            )}
          
          {/* Create new OC cohort Button */}
          {user?.email && ["SUPER_ADMIN", "COMPANY_ADMIN"]?.includes(user?.role) && (
            <button
              onClick={() => navigate("/oc-cohort/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Create new OC cohort
            </button>
          )}
          
          {/* View OC programs Button */}
          {user?.email && ["SUPER_ADMIN", "COMPANY_ADMIN", "ASSESSOR", "MODERATOR", "TUTOR"]?.includes(user?.role) && (
            <button
              onClick={() => navigate("/oc-programs")}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              View OC programs
            </button>
          )}
          
          {user?.email && (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-12 py-3 rounded font-medium transition-colors"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
