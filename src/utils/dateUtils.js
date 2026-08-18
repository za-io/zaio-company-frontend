const options = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

export const formatDate = (date) =>
  new Date(date)?.toLocaleDateString("en-US", options);

export const formatDateTime = (date) =>
  new Date(date)?.toLocaleString("en-US", {
    ...options,
    hour: "numeric",
    minute: "2-digit",
  });

export const formatTime = (date) =>
  new Date(date)?.toLocaleTimeString("en-US", options);
