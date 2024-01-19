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
      <Link to="/" className="flex items-center">
        <img className="h-10" src={logo} alt="" />
        {user?.email && <p className="text-white m-0 ml-2 text-lg font-bold text-purple-200">Hello, {user?.company_name}</p>}
      </Link>

      <div className="flex items-center gap-4">
        {/* <Link to='/' className='text-gray-100 font-medium'>Programs</Link> */}
        {user?.email && user?.role !=='SUPER_STUDENT_ADMIN' && (
          <Link to="/program/add" className="bg-yellow-500 px-12 py-3 rounded font-medium">
            New Program
          </Link>
        )}

        {user?.email && (
          <button
            onClick={handleLogout}
            className="bg-red-500 px-12 py-3 rounded font-medium"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
