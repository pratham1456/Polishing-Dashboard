import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity, Camera, Check, Gauge, Settings2, Wifi } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { clockTime, fmtTime, statusClass } from "../dashboard-utils";

export function HeaderSection(props) {
  const {
    mode,
    config,
    draft,
    settingsOpen,
    snapshot,
    backend,
    cameraError,
    streamReady,
    error,
    now,
    camUrl,
    camConnected,
    avgComponent,
    data,
    chartData,
    states,
    cycleLabel,
    stageIndex,
    saveSettings,
    modeChange,
    setDraft,
    setSettingsOpen,
    setStreamReady,
    setCameraError,
  } = props;
  return _jsxs("header", {
    className: "topbar",
    children: [
      _jsxs("div", {
        className: "brand",
        children: [
          _jsx("div", {
            className: "brand-mark",
            children: _jsx(Activity, { size: 20, strokeWidth: 2.5 }),
          }),
          _jsxs("div", {
            children: [
              _jsx("div", {
                className: "brand-name",
                children: "SURFACE / FINISH",
              }),
              _jsx("div", {
                className: "brand-sub",
                children: "Production control \u00B7 cell 04",
              }),
            ],
          }),
        ],
      }),
      _jsxs("div", {
        className: "top-meta",
        children: [
          _jsxs("span", {
            className: `mode-pill ${mode}`,
            "data-testid": "status-mode",
            children: [
              _jsx("i", {
                className: "live-dot",
                style: {
                  background: mode === "demo" ? "#e7c35b" : "#7bbdf1",
                },
              }),
              mode === "demo" ? "DEMO DATA" : "LIVE SERVICE",
            ],
          }),
          _jsxs("time", {
            className: "clock",
            "data-testid": "text-clock",
            children: [
              now.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
              " \u00A0 ",
              clockTime(),
            ],
          }),
          _jsxs("div", {
            className: "head-actions",
            children: [
              _jsxs("select", {
                className: "select-mode",
                "aria-label": "Data mode",
                "data-testid": "select-data-mode",
                value: mode,
                onChange: (e) => modeChange(e.target.value),
                children: [
                  _jsx("option", { value: "demo", children: "Demo" }),
                  _jsx("option", {
                    value: "live",
                    children: "Live FastAPI",
                  }),
                ],
              }),
              _jsx("button", {
                className: "icon-button",
                title: "Connection settings",
                "aria-label": "Open connection settings",
                "data-testid": "button-settings",
                onClick: () => {
                  setDraft(config);
                  setSettingsOpen(true);
                },
                children: _jsx(Settings2, { size: 16 }),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function MachineSection(props) {
  const {
    mode,
    config,
    draft,
    settingsOpen,
    snapshot,
    backend,
    cameraError,
    streamReady,
    error,
    now,
    camUrl,
    camConnected,
    avgComponent,
    data,
    chartData,
    states,
    cycleLabel,
    stageIndex,
    saveSettings,
    modeChange,
    setDraft,
    setSettingsOpen,
    setStreamReady,
    setCameraError,
  } = props;
  return _jsxs("div", {
    className: "machine-line",
    children: [
      _jsxs("div", {
        children: [
          _jsx("div", {
            className: "section-label",
            children: "Active workstation",
          }),
          _jsxs("div", {
            className: "machine-title",
            children: [
              _jsx("h1", { children: "Part Polishing / Buffing" }),
              _jsx("span", { children: "STATION \u00B7 POL-04" }),
            ],
          }),
        ],
      }),
      _jsxs("div", {
        className: "connectivity",
        "aria-label": "Connection states",
        children: [
          _jsxs("div", {
            className: `conn ${statusClass(mode === "demo" ? null : camConnected)}`,
            "data-testid": "status-camera",
            children: [
              _jsx("i", { className: "led" }),
              _jsx(Camera, { size: 12 }),
              _jsx("b", { children: "CAMERA" }),
              _jsx("span", {
                children:
                  mode === "demo"
                    ? "Demo"
                    : camConnected
                      ? "Connected"
                      : snapshot.camera.connected
                        ? "Stream offline"
                        : "Disconnected",
              }),
            ],
          }),
          _jsxs("div", {
            className: `conn ${statusClass(mode === "demo" ? null : backend === "connected")}`,
            "data-testid": "status-backend",
            children: [
              _jsx("i", { className: "led" }),
              _jsx(Wifi, { size: 12 }),
              _jsx("b", { children: "BACKEND" }),
              _jsx("span", {
                children:
                  mode === "demo"
                    ? "Demo"
                    : backend === "connected"
                      ? "Connected"
                      : backend === "connecting"
                        ? "Connecting"
                        : "Disconnected",
              }),
            ],
          }),
          _jsxs("div", {
            className: `conn ${statusClass(mode === "demo" ? null : snapshot.yoloRunning)}`,
            "data-testid": "status-yolo",
            children: [
              _jsx("i", { className: "led" }),
              _jsx(Gauge, { size: 12 }),
              _jsx("b", { children: "YOLO MODEL" }),
              _jsx("span", {
                children:
                  mode === "demo"
                    ? "Demo"
                    : snapshot.yoloRunning
                      ? "Running"
                      : "Stopped",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function DemoNotice(props) {
  const {
    mode,
    config,
    draft,
    settingsOpen,
    snapshot,
    backend,
    cameraError,
    streamReady,
    error,
    now,
    camUrl,
    camConnected,
    avgComponent,
    data,
    chartData,
    states,
    cycleLabel,
    stageIndex,
    saveSettings,
    modeChange,
    setDraft,
    setSettingsOpen,
    setStreamReady,
    setCameraError,
  } = props;
  return (
    mode === "demo" &&
    _jsx("div", {
      className: "error-banner",
      style: {
        background: "#29271d",
        borderColor: "#5e5432",
        color: "#e0ca7e",
      },
      "data-testid": "notice-demo",
      children:
        "DEMO MODE \u2014 simulated workstation data. Camera, backend and model are not connected.",
    })
  );
}

export function LiveErrorNotice(props) {
  const {
    mode,
    config,
    draft,
    settingsOpen,
    snapshot,
    backend,
    cameraError,
    streamReady,
    error,
    now,
    camUrl,
    camConnected,
    avgComponent,
    data,
    chartData,
    states,
    cycleLabel,
    stageIndex,
    saveSettings,
    modeChange,
    setDraft,
    setSettingsOpen,
    setStreamReady,
    setCameraError,
  } = props;
  return (
    error &&
    _jsx("div", {
      className: "error-banner",
      role: "alert",
      "data-testid": "notice-live-error",
      children: error,
    })
  );
}
