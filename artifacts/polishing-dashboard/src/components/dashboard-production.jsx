import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity, Camera, Check, Gauge, Settings2, Wifi } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { clockTime, fmtTime, statusClass } from "../dashboard-utils";

export function KpiSection(props) {
  const { mode, config, draft, settingsOpen, snapshot, backend, cameraError, streamReady, error, now, camUrl, camConnected, avgComponent, data, chartData, states, cycleLabel, stageIndex, saveSettings, modeChange, setDraft, setSettingsOpen, setStreamReady, setCameraError } = props;
  return _jsxs("section", {
        className: "grid kpi-grid",
        "aria-label": "Production KPIs",
        children: [
          _jsxs("article", {
            className: "panel kpi primary",
            "data-testid": "kpi-produced",
            children: [
              _jsxs("div", {
                className: "kpi-title",
                children: [
                  _jsx("span", { children: "Total produced" }),
                  _jsx("span", { children: "OUTPUT TRAY" }),
                ],
              }),
              _jsxs("div", {
                className: "kpi-value",
                children: [
                  snapshot.producedCount.toLocaleString(),
                  _jsx("small", { children: "parts" }),
                ],
              }),
              _jsx("div", {
                className: "kpi-foot",
                children: "Component type \u00B7 Output Tray",
              }),
            ],
          }),
          _jsxs("article", {
            className: "panel kpi",
            "data-testid": "kpi-rate",
            children: [
              _jsxs("div", {
                className: "kpi-title",
                children: [
                  _jsx("span", { children: "Throughput" }),
                  _jsx("span", { children: "LIVE RATE" }),
                ],
              }),
              _jsxs("div", {
                className: "kpi-value",
                children: [
                  snapshot.componentsPerHour.toFixed(1),
                  _jsx("small", { children: "parts / hr" }),
                ],
              }),
              _jsx("div", {
                className: "kpi-foot",
                children: "Current production pace",
              }),
            ],
          }),
          _jsxs("article", {
            className: "panel kpi",
            "data-testid": "kpi-cycle",
            children: [
              _jsxs("div", {
                className: "kpi-title",
                children: [
                  _jsx("span", { children: "Average cycle" }),
                  _jsx("span", { children: "PER COMPONENT" }),
                ],
              }),
              _jsxs("div", {
                className: "kpi-value",
                children: [
                  snapshot.averageCycleSeconds.toFixed(1),
                  _jsx("small", { children: "sec" }),
                ],
              }),
              _jsx("div", {
                className: "kpi-foot",
                children: "Target reference \u00B7 75.0 sec",
              }),
            ],
          }),
          _jsxs("article", {
            className: "panel kpi",
            "data-testid": "kpi-polishing",
            children: [
              _jsxs("div", {
                className: "kpi-title",
                children: [
                  _jsx("span", { children: "Total polishing time" }),
                  _jsx("span", { children: "CUMULATIVE" }),
                ],
              }),
              _jsxs("div", {
                className: "kpi-value",
                children: [
                  fmtTime(snapshot.totalPolishingSeconds),
                  _jsx("small", { children: "hh:mm:ss" }),
                ],
              }),
              _jsx("div", {
                className: "kpi-foot",
                children: "Active buffing duration",
              }),
            ],
          }),
        ],
      });
}

export function CycleCameraSection(props) {
  const { mode, config, draft, settingsOpen, snapshot, backend, cameraError, streamReady, error, now, camUrl, camConnected, avgComponent, data, chartData, states, cycleLabel, stageIndex, saveSettings, modeChange, setDraft, setSettingsOpen, setStreamReady, setCameraError } = props;
  return _jsxs("section", {
        className: "grid main-grid",
        children: [
          _jsxs("article", {
            className: "panel cycle-panel",
            "data-testid": "card-current-cycle",
            children: [
              _jsxs("div", {
                className: "panel-head",
                children: [
                  _jsx("h2", { children: "Current cycle" }),
                  _jsx("span", { children: "SEQUENCE STATUS" }),
                ],
              }),
              _jsxs("div", {
                className: "cycle-status",
                children: [
                  _jsxs("div", {
                    children: [
                      _jsx("div", {
                        className: "cycle-state",
                        "data-testid": "text-cycle-state",
                        children: cycleLabel,
                      }),
                      _jsx("div", {
                        className: "cycle-id",
                        "data-testid": "text-component-id",
                        children:
                          snapshot.currentCycle.componentId ||
                          "Awaiting component",
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "cycle-clock",
                    "data-testid": "text-cycle-elapsed",
                    children: [
                      fmtTime(snapshot.currentCycle.elapsedSeconds),
                      _jsx("small", { children: " elapsed" }),
                    ],
                  }),
                ],
              }),
              _jsx("div", {
                className: "progress-track",
                "data-testid": "cycle-progression",
                children: states.map((s, i) =>
                  _jsx(
                    "div",
                    {
                      className: `step ${i < stageIndex ? "done" : i === stageIndex ? "active" : ""}`,
                      "data-testid": `step-cycle-${i}`,
                      children: s,
                    },
                    s
                  )
                ),
              }),
              _jsxs("div", {
                className: "cycle-foot",
                children: [
                  _jsx("span", { children: "Cycle state" }),
                  _jsx("strong", { children: cycleLabel }),
                ],
              }),
              _jsxs("div", {
                className: "cycle-foot",
                style: { marginTop: 5 },
                children: [
                  _jsx("span", { children: "Elapsed cycle time" }),
                  _jsxs("strong", {
                    children: [
                      snapshot.currentCycle.elapsedSeconds.toFixed(0),
                      " sec",
                    ],
                  }),
                ],
              }),
            ],
          }),
          _jsxs("article", {
            className: "panel",
            "data-testid": "card-operator",
            children: [
              _jsxs("div", {
                className: "panel-head",
                children: [
                  _jsx("h2", { children: "Operator status" }),
                  _jsx("span", { children: "SHIFT TO DATE" }),
                ],
              }),
              _jsxs("div", {
                className: "analytics-content",
                children: [
                  _jsxs("div", {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 13,
                    },
                    children: [
                      _jsxs("div", {
                        children: [
                          _jsx("div", {
                            style: {
                              color: "#87939c",
                              fontSize: 9,
                              letterSpacing: ".08em",
                            },
                            children: "OPERATOR PRESENCE",
                          }),
                          _jsxs("div", {
                            className: "kpi-value",
                            style: { fontSize: 30, marginTop: 5 },
                            "data-testid": "text-presence",
                            children: [
                              fmtTime(snapshot.operator.presenceSeconds),
                              _jsx("small", { children: "h:m:s" }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        style: { textAlign: "right" },
                        children: [
                          _jsx("div", {
                            style: { color: "#87939c", fontSize: 9 },
                            children: "UTILIZATION",
                          }),
                          _jsxs("div", {
                            className: "kpi-value",
                            style: {
                              fontSize: 32,
                              marginTop: 5,
                              color: "#b8df67",
                            },
                            "data-testid": "text-operator-utilization",
                            children: [
                              snapshot.operator.utilizationPercent.toFixed(1),
                              _jsx("small", { children: "%" }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "metric-pairs",
                    children: [
                      _jsxs("div", {
                        className: "metric-pair",
                        children: [
                          _jsx("label", { children: "Active time" }),
                          _jsx("strong", {
                            "data-testid": "text-operator-active",
                            children: fmtTime(snapshot.operator.activeSeconds),
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "metric-pair",
                        children: [
                          _jsx("label", { children: "Idle time" }),
                          _jsx("strong", {
                            "data-testid": "text-operator-idle",
                            children: fmtTime(snapshot.operator.idleSeconds),
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "metric-pair",
                        children: [
                          _jsx("label", { children: "Efficiency" }),
                          _jsxs("strong", {
                            "data-testid": "text-operator-efficiency",
                            children: [
                              snapshot.operator.efficiencyPercent.toFixed(1),
                              _jsx("em", { children: "%" }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "metric-pair",
                        children: [
                          _jsx("label", { children: "Presence" }),
                          _jsx("strong", {
                            children: fmtTime(
                              snapshot.operator.presenceSeconds
                            ),
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          _jsxs("article", {
            className: "panel cam-panel",
            "data-testid": "card-camera",
            children: [
              _jsxs("div", {
                className: "panel-head",
                children: [
                  _jsx("h2", { children: "Inspection camera" }),
                  _jsx("span", {
                    children:
                      mode === "demo"
                        ? "NO FEED"
                        : camConnected
                          ? "STREAM ACTIVE"
                          : "NO SIGNAL",
                  }),
                ],
              }),
              _jsxs("div", {
                className: "camera-frame",
                children: [
                  mode === "live" &&
                    camUrl &&
                    !cameraError &&
                    config.streamType === "mjpeg" &&
                    _jsx("img", {
                      src: camUrl,
                      alt: "Live workstation camera stream",
                      onLoad: () => {
                        setStreamReady(true);
                        setCameraError(false);
                      },
                      onError: () => {
                        setCameraError(true);
                        setStreamReady(false);
                      },
                    }),
                  mode === "live" &&
                    camUrl &&
                    !cameraError &&
                    config.streamType === "video" &&
                    _jsx("video", {
                      src: camUrl,
                      autoPlay: true,
                      muted: true,
                      playsInline: true,
                      onCanPlay: () => {
                        setStreamReady(true);
                        setCameraError(false);
                      },
                      onError: () => {
                        setCameraError(true);
                        setStreamReady(false);
                      },
                    }),
                  (mode === "demo" || !camUrl || cameraError || !streamReady) &&
                    _jsxs("div", {
                      className: "camera-placeholder",
                      children: [
                        _jsx(Camera, { size: 24, strokeWidth: 1.3 }),
                        _jsx("strong", {
                          children:
                            mode === "demo"
                              ? "DEMO — CAMERA NOT CONNECTED"
                              : cameraError
                                ? "STREAM OFFLINE"
                                : "WAITING FOR CAMERA STREAM",
                        }),
                        _jsx("span", {
                          children:
                            mode === "demo"
                              ? "No simulated camera feed"
                              : camUrl
                                ? "Verify browser-compatible stream URL"
                                : "Set a browser-playable stream in settings",
                        }),
                      ],
                    }),
                  _jsxs("div", {
                    className: "cam-corner",
                    children: [
                      _jsx("span", {
                        className: `cam-live ${mode === "live" && camConnected ? "is-live" : ""}`,
                        children:
                          mode === "live" && camConnected ? "LIVE" : "OFFLINE",
                      }),
                      " POL-04 \u00B7 VIEW 01",
                    ],
                  }),
                  _jsxs("div", {
                    className: "cam-right",
                    children: [snapshot.camera.fps.toFixed(1), " FPS"],
                  }),
                  mode === "live" &&
                    camConnected &&
                    snapshot.detection &&
                    _jsx("div", {
                      className: "camera-overlay",
                      "data-testid": "overlay-detection",
                      children: _jsx("div", {
                        className: "det-box",
                        style: {
                          left: `${Math.max(0, snapshot.detection.bbox.x) * 100}%`,
                          top: `${Math.max(0, snapshot.detection.bbox.y) * 100}%`,
                          width: `${Math.min(1, snapshot.detection.bbox.width) * 100}%`,
                          height: `${Math.min(1, snapshot.detection.bbox.height) * 100}%`,
                        },
                        children: _jsxs("span", {
                          className: "det-label",
                          children: [
                            snapshot.detection.className,
                            " \u00B7 ",
                            (snapshot.detection.confidence * 100).toFixed(1),
                            "%",
                          ],
                        }),
                      }),
                    }),
                ],
              }),
              _jsxs("div", {
                className: "cam-foot",
                children: [
                  _jsx("span", {
                    "data-testid": "text-camera-timestamp",
                    children:
                      mode === "demo"
                        ? "DEMO · NO CAMERA TIMESTAMP"
                        : snapshot.camera.timestamp || "Timestamp unavailable",
                  }),
                  _jsxs("span", {
                    className: "cam-process",
                    "data-testid": "status-camera-process",
                    children: ["PROCESS \u00B7 ", cycleLabel],
                  }),
                  _jsx("span", {
                    children:
                      mode === "demo" && snapshot.detection
                        ? `SAMPLE · ${snapshot.detection.className} ${(snapshot.detection.confidence * 100).toFixed(1)}%`
                        : snapshot.detection
                          ? `${snapshot.detection.className} ${(snapshot.detection.confidence * 100).toFixed(1)}%`
                          : "No detection",
                  }),
                ],
              }),
            ],
          }),
        ],
      });
}
