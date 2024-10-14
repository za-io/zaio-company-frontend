const options = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

export const formatDate = (date) =>
  new Date(date)?.toLocaleDateString("en-US", options);

export const formatTime = (date) =>
  new Date(date)?.toLocaleTimeString("en-US", options);
