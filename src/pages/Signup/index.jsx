import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// import { Button } from "react-bootstrap";
// import AuthService from "actions/services/auth.service";
import { useState } from "react";
import GoogleLogin from "react-google-login";

import googleLoginIcon from "../../assets/img/dashboard/googleLoginIcon.svg";
import { useUserStore } from "../../store/UserProvider";
import { registerCompany } from "../../api/company";
import { useMutation } from "react-query";
// import mixpanel from "mixpanel-browser";

const Signup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queries = new URLSearchParams(location.search);
  const { user, setUser } = useUserStore((state) => state);
  const [state, setState] = useState({
    name: "",
    email: "",
    phone: "",
    website: '',
    description: '',
    address: '',
    password: "",
    password_confirmation: "",
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

  const registerMutation = useMutation((formData) => registerCompany(formData), {
    onSuccess: (data) => {
      if (data) {
        console.log("success");
        setLoading(false);
        navigate("/login");
      }
    },
    onError: (error) => {
      console.log(error);
    },
  });
  const handleRegister = (e) => {
    e.preventDefault();
    const { password_confirmation, ...other } = state;
    console.log(other);
    setLoading(true);
    registerMutation.mutate(other);

    // setLoading(true);

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
      <div className="py-2">
        <form
          className="max-w-[50vw] rounded-xl bg-gray-100 p-6 mx-auto"
          onSubmit={handleRegister}
        >
          <h1 className="text-2xl font-semibold text-center mb-2">Register</h1>
          {state.message && (
            <div className="form-group">
              <div className="alert alert-danger" role="alert">
                {state.message}
              </div>
            </div>
          )}
          <div className="flex gap-4 w-full">
            <div className="pt-4 w-full">
              <label className="font-semibold">Company Name</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
                placeholder="Zaio"
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
                required
              />
            </div>
            <div className="pt-4 w-full">
              <label className="font-semibold">Email</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
                placeholder="email@address.com"
                value={state.email}
                onChange={(e) => setState({ ...state, email: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex gap-4 w-full">
            <div className="pt-4 w-full">
              <label className="font-semibold">Phone no.</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
                placeholder="0123456789"
                value={state.phone}
                onChange={(e) => setState({ ...state, phone: e.target.value })}
                required
              />
            </div>
            <div className="pt-4 w-full">
              <label className="font-semibold">Website</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
                placeholder="www.zaio.io"
                value={state.website}
                onChange={(e) =>
                  setState({ ...state, website: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="pt-4">
            <label className="font-semibold" htmlFor="password">
              Address
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
              name="text"
              placeholder="Company Address"
              value={state.address}
              onChange={(e) => setState({ ...state, address: e.target.value })}
              required
            />
          </div>
          <div className="pt-4">
            <label className="font-semibold" htmlFor="password">
              Description
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
              name="text"
              placeholder="Company Description"
              value={state.description}
              onChange={(e) => setState({ ...state, description: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-4 w-full">
            <div className="pt-4 w-full">
              <label className="font-semibold">Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
                placeholder="********"
                value={state.password}
                onChange={(e) =>
                  setState({ ...state, password: e.target.value })
                }
                required
              />
            </div>
            <div className="pt-4 w-full">
              <label className="font-semibold">Confirm Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xl focus:outline-none mt-2"
                placeholder="********"
                value={state.password_confirmation}
                onChange={(e) =>
                  setState({ ...state, password_confirmation: e.target.value })
                }
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="flex w-full text-lg bg-violet-700 text-white rounded-lg p-2 mt-4 mb-4 items-center justify-center"
            // disabled={loading}
          >
            {loading ? (
              <span className="">Registering</span>
            ) : (
              <span>Register</span>
            )}
          </button>
          <p className="text-xs mt-1">
            Already Registered?{" "}
            <Link className="text-blue-500" to={`/login`}>
              LOGIN
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

export default Signup;
