const PRODUCTION_COMPANY_HOSTS = new Set([
  "zaio-companies.netlify.app",
  "companies.zaio.io",
  "company.zaio.io",
]);

export function getLearnerAppBaseUrl() {
  const fromEnv = (
    process.env.REACT_APP_LEARNER_APP_URL ||
    process.env.REACT_APP_STUDENT_APP_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3000";
    }
    if (PRODUCTION_COMPANY_HOSTS.has(host)) {
      return "https://www.zaio.io";
    }
    return "https://learn.zaio.io";
  }
  return "https://www.zaio.io";
}
