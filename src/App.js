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
import ProtectedRoute, { publicRoutes } from "./components/ProtectedRoute";
import { AddExiting } from "./pages/AddExisting";
import { AddCompany } from "./pages/AddCompany";
import TutorAnalytics from "./pages/StudentAnalytics/TutorAnalytics";
import { AddTutor } from "./pages/AddTutor";
import ManageBootcamps from "./pages/ManageBootcamps/ManageBootcamps";
import SetGoal from "./pages/Goals";

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
          path="/tutor/analytics"
          element={
            <ProtectedRoute
              path="/tutor/analytics"
              component={<TutorAnalytics />}
            />
          }
        />
        <Route
          path="/program/add"
          element={
            <ProtectedRoute path="/program/add" component={<AddProgram />} />
          }
        />

        <Route
          path="/company/add"
          element={
            <ProtectedRoute path="/company/add" component={<AddCompany />} />
          }
        />

        <Route
          path="/tutor/add"
          element={
            <ProtectedRoute path="/tutor/add" component={<AddTutor />} />
          }
        />
        <Route
          path="/program/manage"
          element={
            <ProtectedRoute
              path="/program/manage"
              component={<ManageBootcamps />}
            />
          }
        />
        <Route
          path="/program/add/exiting"
          element={
            <ProtectedRoute
              path="/program/add/exiting"
              component={<AddExiting />}
            />
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

        <Route
          path="/defer-student/goals"
          element={
            <ProtectedRoute
            path="/defer-student/goals/"
            component={<SetGoal />}
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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUserStore();

  const checkAuth = () => {
    const token = localStorage.getItem("TOKEN");
    if (!token) {
      setLoading(false);
      return navigate("/login");
    }

    setLoading(true);
    checkAuthToken({ token })
      .then((res) => {
        console.log(res);
        if (!res?.success) {
          navigate("/login");
        }

        setUser(res?.data?.userDoc);
        navigate(window.location.pathname + window.location.search);
      })
      .catch((err) => {})
      .finally(() => {
        setLoading(false);
      });
  };
  useEffect(() => {
    const path = window.location.pathname;

    const isPublic = publicRoutes.some((ele) => path.startsWith(ele));

    if (!isPublic) checkAuth();
    // eslint-disable-next-line
  }, []);

  return loading ? <Loader /> : <AppHelper />;
}

export default App;
