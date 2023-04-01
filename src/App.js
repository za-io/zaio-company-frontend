import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Program from "./pages/Program";
import Navbar from "./components/Navbar";
import { AddProgram } from "./pages/AddProgram";

function App() {
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
}

export default App;
