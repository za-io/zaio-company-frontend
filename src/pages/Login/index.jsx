import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useState } from "react";
import { loginCompany } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState({
    name: "",
    password: "",
    error: null,
  });
  const [loading, setLoading] = useState(false);
  const { setUser } = useUserStore();

  const onChangeUsername = (e) => {
    setState({
      ...state,
      name: e.target.value,
    });
  };

  const onChangePassword = (e) => {
    setState({
      ...state,
      password: e.target.value,
    });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    loginCompany({
      email: state?.name,
      password: state?.password,
    })
      .then((res) => {
        console.log(res);
        if (!res?.success || !res?.token) {
          setState((prev) => ({ ...prev, error: res?.message }));
        } else {
          localStorage.setItem("TOKEN", res?.token);
          setUser(res?.data?.userDoc);
          navigate("/");
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="py-24">
      <form
        className="max-w-[25vw] rounded-xl bg-gray-100 p-6 mx-auto"
        onSubmit={handleLogin}
      >
        <h1 className="text-2xl font-semibold text-center mb-2">Login</h1>
        {state.message && (
          <div className="form-group">
            <div className="alert alert-danger" role="alert">
              {state.message}
            </div>
          </div>
        )}
        <div className="pt-4">
          <label className="font-semibold" htmlFor="username">
            Company Email
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
            name="username"
            placeholder="Zaio"
            value={state.name}
            onChange={onChangeUsername}
            required
          />
        </div>

        <div className="pt-4">
          <label className="font-semibold" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
            name="password"
            placeholder="******"
            value={state.password}
            onChange={onChangePassword}
            required
          />
        </div>

        {state?.error && <p className="text-xs mt-1">{state?.error}</p>}
        <button
          type="submit"
          className="flex w-full text-lg bg-violet-700 text-white rounded-lg p-2 mt-4 mb-4 items-center justify-center"
          disabled={loading}
        >
          {loading ? <span>Logging</span> : <span>Login</span>}
        </button>
        {/* <p className="text-xs mt-1">
        New to ZAIO?{" "}
        <Link className="text-blue-500" to={`/register`}>
          REGISTER
        </Link>
      </p>
      <p className="text-xs mt-1">
        Forgot password?{" "}
        <Link className="text-blue-500" to={`/forgotpassword`}>
          forgot password
        </Link>
      </p> */}

        {/* <div>
        <button
          className='btn btn-primary btn-block'
          disabled={state.loading}
          style={{ color: "#17325b", backgroundColor: "white" }}
          onClick={openSnapplify}

        >
          {state.loading && (
            <span className='spinner-border spinner-border-sm'></span>
          )}
          <span>SIGN IN WITH SNAPPLIFY</span>
        </button>
      </div> */}
      </form>
    </div>
  );
};

export default Login;
