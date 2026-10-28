const LEARNER_APP_PRODUCTION = "https://learn.zaio.io";

function isLoopbackUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

export function getLearnerAppBaseUrl() {
  const fromEnv = (
    process.env.REACT_APP_LEARNER_APP_URL ||
    process.env.REACT_APP_STUDENT_APP_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const onLoopback = host === "localhost" || host === "127.0.0.1";

  // A localhost value in .env is for local dev. Ignore it when this app is
  // served from a real host, otherwise profile links open localhost:3000.
  if (fromEnv && (onLoopback || !isLoopbackUrl(fromEnv))) return fromEnv;
  if (onLoopback) return "http://localhost:3000";
  return LEARNER_APP_PRODUCTION;
}
