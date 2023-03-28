import React from "react";
import programImg from "../../assets/img/dashboard/reactjs.png";
import { Link } from "react-router-dom";

const programs = [
  {
    id: 1,
    name: "ReactJS",
    description: "ReactJS Description",
    img: programImg,
  },
  {
    id: 2,
    name: "ReactJS",
    description: "ReactJS Description",
    img: programImg,
  },
  {
    id: 2,
    name: "ReactJS",
    description: "ReactJS Description",
    img: programImg,
  },
  {
    id: 2,
    name: "ReactJS",
    description: "ReactJS Description",
    img: programImg,
  },
]

const Program = ({ program }) => {
  return (
    <div key={program.id} className="flex flex-col w-full h-full bg-gray-200 rounded-xl">
      <img src={program.img} alt="programImg" />
      <div className="p-2 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mt-2">{program.name}</h1>
        <h1 className="text-2xl text-gray-500 mt-2">{program.description}</h1>
        <Link to={`/program/${program.id}`} className="w-full">
          <button className="bg-blue-700 w-full py-2 rounded-xl mt-2 text-gray-100">Go Somewhere</button>
        </Link>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <div className="px-36 py-12">
      <h1 className="text-4xl font-bold text-gray-100">My Programs</h1>
      <div className="grid grid-cols-3 gap-16 mt-12">
        {programs.map(program => <Program program={program} />)}
      </div>
    </div>
  );
};

export default Dashboard;
