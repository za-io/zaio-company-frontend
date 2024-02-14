import React from "react";
import { useUserStore } from "../../store/UserProvider";
import { Navigate, Route } from "react-router-dom";
import Login from "../../pages/Login";

const publicRoutes = ["/student/course", "/student/learningpath"];

const ProtectedRoute = ({ path: Path, component: Component }) => {
  const path = window.location.pathname;
  const token = localStorage.getItem("TOKEN");
  const isPublic = publicRoutes.some((ele) => path.startsWith(ele));
  // console.log(user,user?.email, publicRoutes.some((ele) => ele.startsWith(path)));
  return token || isPublic ? (
    Component
  ) : (
    <Navigate to="/login" replace={true} />
  );
};

export default ProtectedRoute;
