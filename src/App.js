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
import StudentBootcamp from "./pages/StudentBootcamp";
import StudentLearningPath from "./pages/StudentLearningPath";
import StudentAnalytics from "./pages/StudentAnalytics";
import StudentMCQ from "./pages/StudentMCQ";
import StudentChallenges from "./pages/StudentChallenges";
import StudentAssignments from "./pages/StudentAssignments";
import ProtectedRoute from "./components/ProtectedRoute";

const AppHelper = () => {
  return (
    <div className="bg-[#0d1e3a] min-h-screen">
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={<ProtectedRoute path="/" component={<Dashboard />} />}
        />
        <Route
          path="/program/add"
          element={
            <ProtectedRoute path="/program/add" component={<AddProgram />} />
          }
        />
        <Route
          path="/program/:id"
          element={
            <ProtectedRoute path="/program/:id" component={<Program />} />
          }
        />
        <Route path="/login" element={<Login />} />
        <Route
          path="/register"
          element={<ProtectedRoute path="/register" component={<Signup />} />}
        />
        <Route
          path="/student/bootcamp"
          element={
            <ProtectedRoute
              path="/student/bootcamp"
              component={<StudentBootcamp />}
            />
          }
        />
        <Route
          path="/student/analytics"
          element={
            <ProtectedRoute
              path="/student/analytics"
              component={<StudentAnalytics />}
            />
          }
        />
        <Route
          path="/student/bootcamp/:bootcampid/learningpath/:learningpathid"
          element={
            <ProtectedRoute
              path="/student/bootcamp/:bootcampid/learningpath/:learningpathid"
              component={<StudentLearningPath />}
            />
          }
        />
        <Route
          path="/student/learningpath/:learningpathid"
          element={
            <ProtectedRoute
              path="/student/learningpath/:learningpathid"
              component={<StudentLearningPath />}
            />
          }
        />
        <Route
          path="/student/course/:courseid/mcq/:userid"
          element={
            <ProtectedRoute
              path="/student/course/:courseid/mcq/:userid"
              component={<StudentMCQ />}
            />
          }
        />
        <Route
          path="/student/course/:courseid/challenges/:userid"
          element={
            <ProtectedRoute
              path="/student/course/:courseid/challenges/:userid"
              component={<StudentChallenges />}
            />
          }
        />
        <Route
          path="/student/course/:courseid/assignments/:userid"
          element={
            <ProtectedRoute
              path="/student/course/:courseid/assignments/:userid"
              component={<StudentAssignments />}
            />
          }
        />
      </Routes>{" "}
      {/* <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/program/add" element={<AddProgram />} />
        <Route path="/program/:id" element={<Program />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/student/bootcamp" element={<StudentBootcamp />} />
        <Route path="/student/analytics" element={<StudentAnalytics />} />
        <Route
          path="/student/bootcamp/:bootcampid/learningpath/:learningpathid"
          element={<StudentLearningPath />}
        />
        <Route
          path="/student/learningpath/:learningpathid"
          element={<StudentLearningPath />}
        />
        <Route path="/student/course/:courseid/mcq/:userid" element={<StudentMCQ />} />
        <Route path="/student/course/:courseid/challenges/:userid" element={<StudentChallenges />} />
        <Route path="/student/course/:courseid/assignments/:userid" element={<StudentAssignments />} />
      </Routes> */}
    </div>
  );
};

function App() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setUser } = useUserStore();

  const checkAuth = () => {
    const token = localStorage.getItem("TOKEN");
    // if (!token) {
    //   navigate("/login");
    // }

    // setLoading(true);
    checkAuthToken({ token })
      .then((res) => {
        console.log(res);
        // if (!res?.success) {
        //   navigate("/login");
        // } else {
        setUser(res?.data?.userDoc);
        // navigate(window.location.pathname + window.location.search);
        // }
      })
      .catch((err) => {})
      .finally(() => {
        setLoading(false);
      });
  };
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line
  }, []);

  return loading ? <Loader /> : <AppHelper />;
}

export default App;
