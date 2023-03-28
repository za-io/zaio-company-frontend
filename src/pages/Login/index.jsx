import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// import { Button } from "react-bootstrap";
// import AuthService from "actions/services/auth.service";
import { useState } from "react";
import GoogleLogin from "react-google-login";

import googleLoginIcon from "../../assets/img/dashboard/googleLoginIcon.svg";
import { useUserStore } from "../../store/UserProvider";
import { useMutation, useQueries, useQuery } from "react-query";
import { loginCompany } from "../../api/company";
// import mixpanel from "mixpanel-browser";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queries = new URLSearchParams(location.search);
  const { user, setUser } = useUserStore((state) => state);
  const [state, setState] = useState({
    name: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  //   useEffect(() => {
  //     mixpanel.track("Web Page view", {
  //       "Page url": "/login",
  //       "Page name": "Login",
  //     });
  //     const queries = new URLSearchParams(location.search);
  //     if (queries.has("username")) {
  //       setState({
  //         ...state,
  //         email: queries.get("email"),
  //         username: queries.get("username"),
  //         phonenumber: queries.get("phone"),
  //         src: queries.get("src"),
  //       });
  //     }
  //   }, []);

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

  const loginMutation = useMutation((formData) => loginCompany(formData), {
    onSuccess: (data) => {
      if (data.success) {
        setLoading(false);
        setUser({ ...data.data });
        navigate("/");
      }
    },
    onError: (error) => {
      console.log(error);
    },
  });
  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    loginMutation.mutate(state);

    //     AuthService.login(state.username, state.password, state.src)
    //       .then((response) => {
    //         console.log("signin");
    //         //mixpanel

    //         // alert("RESPONSE:" + JSON.stringify(response) + " ");

    //         if (response.success) {
    //           Mixpanel.identify(state.username);
    //           Mixpanel.identify(state.username);
    //           Mixpanel.people.set({
    //             $email: state.username,
    //             $distinct_id: state.username,
    //           });
    //           Mixpanel.track("Login", { method: "normal" });

    //           console.log("signin", response);

    //           if (response.data.enrolled) {
    //             setUser({ ...user, ...response.data });
    //             history.push("/updated-dashboard");
    //           } else if (!response.data.username) {
    //             history.push("/completesignin");
    //           }
    //           if (response.data.isadmin) {
    //             history.push("/admin/paid-users");
    //           }
    //           setState({
    //             ...state,
    //             success: true,
    //             message: response.message,
    //           });
    //           setUser({ ...response, ...response.data });
    //         } else {
    //           const resMessage = response.message;
    //           setState({
    //             ...state,
    //             successful: false,
    //             message: resMessage,
    //           });
    //         }
    //       })
    //       .catch((reject) => alert("somethingwentwrong"))
    //       .then(() => setLoading(false));
  };

  const responseSuccessGoogle = (response) => {
    // setLoading(true);
    // AuthService.googleLogin(response.tokenId)
    //   .then((response) => {
    //     //mixpanel
    //     if (response.success) {
    //       Mixpanel.identify(state.username);
    //       Mixpanel.people.set({
    //         $email: state.username,
    //         $distinct_id: state.username,
    //       });
    //       Mixpanel.track("Login", { method: "google" });
    //       if (!response.alreadyRegister) {
    //         console.log("alreadyRegister2", response.alreadyRegister);
    //         // setUser({ ...user, ...response.data });
    //         history.push("/completesignin");
    //       }
    //       if (response.data.enrolled) {
    //         setUser({ ...user, ...response.data });
    //         history.push("/updated-dashboard");
    //       }
    //       if (response.data.isadmin) {
    //         history.push("/admin/paid-users");
    //       }
    //       setState({
    //         ...state,
    //         success: true,
    //         message: response.message,
    //       });
    //       setUser({ ...response, ...response.data });
    //     } else {
    //       const resMessage = response.message;
    //       setState({
    //         ...state,
    //         successful: false,
    //         message: resMessage,
    //       });
    //     }
    //   })
    //   .catch((reject) => alert("somethingwentwrong"))
    //   .then(() => setLoading(false));
    // console.log(response);
  };

  const responseErrorGoogle = (response) => {
    console.log(response);
  };

  if (state.success && user?.success) {
    // alert("REDIRECTING NOW...")
    location.push(`${state.redirect}`);
    return null;
  } else {
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
              Company Name
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
          <button
            type="submit"
            className="flex w-full text-lg bg-violet-700 text-white rounded-lg p-2 mt-4 mb-4 items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <span>Logging</span>
            ) : (
              <span>Login</span>
            )}
          </button>
          <p className="text-xs mt-1">
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
          </p>

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
  }
};

export default Login;
