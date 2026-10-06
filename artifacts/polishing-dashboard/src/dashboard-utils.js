export const statusClass = (on) =>
  on === true ? "ok" : on === false ? "bad" : "warn";
export const fmtTime = (seconds) =>
  `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
export const clockTime = () =>
  new Date().toLocaleTimeString("en-GB", { hour12: false });
