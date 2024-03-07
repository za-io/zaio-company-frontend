import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";

import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.min.js";
import { TasksProvider } from "./context/TasksProvider";

import "./index.css";
import {Chart, ArcElement, Tooltip} from 'chart.js'
const queryClient = new QueryClient();

Chart.register(ArcElement, Tooltip);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <TasksProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <ReactQueryDevtools initialIsOpen />
        </BrowserRouter>
      </QueryClientProvider>
    </TasksProvider>
  </React.StrictMode>
);
