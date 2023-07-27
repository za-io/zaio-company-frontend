import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Program from "./pages/Program";
import Navbar from "./components/Navbar";
import { AddProgram } from "./pages/AddProgram";
import { useEffect, useState } from "react";
import { checkAuthToken } from "./api/company";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "./store/UserProvider";
import Loader from "./components/loader/loader";

const AppHelper = () => {
  return (
    <div className="bg-[#0d1e3a] min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/program/add" element={<AddProgram />} />
        <Route path="/program/:id" element={<Program />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
      </Routes>
    </div>
  );
};

function App() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUserStore();

  const checkAuth = () => {
    const token = localStorage.getItem("TOKEN");
    if (!token) {
      navigate("/login");
    }

    setLoading(true);
    checkAuthToken({ token })
      .then((res) => {
        console.log(res);
        if (!res?.success) {
          navigate("/login");
        } else {
          setUser(res?.data?.userDoc);
          navigate("/");
        }
      })
      .catch((err) => {})
      .finally(() => {
        setLoading(false);
      });
  };
  useEffect(() => {
    checkAuth();
  }, []);

  return loading ? <Loader /> : <AppHelper />;
}

export default App;
