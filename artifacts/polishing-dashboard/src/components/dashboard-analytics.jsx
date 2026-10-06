import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity, Camera, Check, Gauge, Settings2, Wifi } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { clockTime, fmtTime, statusClass } from "../dashboard-utils";

export function AnalyticsSection(props) {
  const { mode, config, draft, settingsOpen, snapshot, backend, cameraError, streamReady, error, now, camUrl, camConnected, avgComponent, data, chartData, states, cycleLabel, stageIndex, saveSettings, modeChange, setDraft, setSettingsOpen, setStreamReady, setCameraError } = props;
  return _jsxs("section", {
        className: "grid analytics-grid",
        "aria-label": "Production analytics",
        children: [
          _jsxs("article", {
            className: "panel analytics",
            "data-testid": "card-cycle-trend",
            children: [
              _jsxs("div", {
                className: "panel-head",
                children: [
                  _jsx("h2", { children: "Production rate" }),
                  _jsx("span", { children: "COMPONENTS / HOUR" }),
                ],
              }),
              _jsxs("div", {
                className: "analytics-content",
                children: [
                  _jsxs("div", {
                    className: "legend-row",
                    children: [
                      _jsxs("span", {
                        children: [
                          _jsx("i", {
                            className: "legend-dot",
                            style: { background: "#a9d84f" },
                          }),
                          "Current pace",
                        ],
                      }),
                      _jsx("span", { children: "Shift trend \u00B7 today" }),
                    ],
                  }),
                  _jsx("div", {
                    className: "chart-wrap",
                    children: _jsx(ResponsiveContainer, {
                      width: "100%",
                      height: "100%",
                      children: _jsxs(AreaChart, {
                        data: chartData,
                        margin: { top: 6, right: 4, left: -24, bottom: 0 },
                        children: [
                          _jsx("defs", {
                            children: _jsxs("linearGradient", {
                              id: "rateFill",
                              x1: "0",
                              y1: "0",
                              x2: "0",
                              y2: "1",
                              children: [
                                _jsx("stop", {
                                  offset: "0%",
                                  stopColor: "#a9d84f",
                                  stopOpacity: 0.22,
                                }),
                                _jsx("stop", {
                                  offset: "100%",
                                  stopColor: "#a9d84f",
                                  stopOpacity: 0,
                                }),
                              ],
                            }),
                          }),
                          _jsx(CartesianGrid, {
                            stroke: "#29333c",
                            strokeDasharray: "3 4",
                            vertical: false,
                          }),
                          _jsx(XAxis, {
                            dataKey: "t",
                            tick: { fill: "#73808a", fontSize: 9 },
                            axisLine: false,
                            tickLine: false,
                          }),
                          _jsx(YAxis, {
                            domain: [0, 60],
                            tick: { fill: "#73808a", fontSize: 9 },
                            axisLine: false,
                            tickLine: false,
                          }),
                          _jsx(ChartTooltip, {
                            contentStyle: {
                              background: "#202931",
                              border: "1px solid #46525b",
                              borderRadius: 3,
                              fontSize: 10,
                            },
                            labelStyle: { color: "#c9d1d5" },
                          }),
                          _jsx(Area, {
                            type: "monotone",
                            dataKey: "output",
                            stroke: "#b3df64",
                            strokeWidth: 2,
                            fill: "url(#rateFill)",
                            dot: false,
                            activeDot: { r: 3, fill: "#c7eb82" },
                          }),
                        ],
                      }),
                    }),
                  }),
                ],
              }),
            ],
          }),
          _jsxs("article", {
            className: "panel analytics",
            "data-testid": "card-activity-duration",
            children: [
              _jsxs("div", {
                className: "panel-head",
                children: [
                  _jsx("h2", { children: "Activity duration" }),
                  _jsx("span", { children: "AVERAGE / TOTAL" }),
                ],
              }),
              _jsxs("div", {
                className: "analytics-content",
                children: [
                  _jsxs("div", {
                    className: "legend-row",
                    children: [
                      _jsxs("span", {
                        children: [
                          _jsx("i", {
                            className: "legend-dot",
                            style: { background: "#61b9df" },
                          }),
                          "Avg. seconds per cycle",
                        ],
                      }),
                      _jsxs("span", {
                        children: [
                          _jsx("i", {
                            className: "legend-dot",
                            style: { background: "#485661" },
                          }),
                          "Total minutes",
                        ],
                      }),
                    ],
                  }),
                  data.map((d, i) =>
                    _jsxs(
                      "div",
                      {
                        className: "bar-row",
                        "data-testid": `metric-activity-${d.name.toLowerCase()}`,
                        children: [
                          _jsx("span", { children: d.name }),
                          _jsx("div", {
                            className: "bar-bg",
                            children: _jsx("div", {
                              className: "bar-fill",
                              style: {
                                width: `${Math.min((d.avg / 60) * 100, 100)}%`,
                                background: ["#61b9df", "#e0bb5e", "#697985"][
                                  i
                                ],
                              },
                            }),
                          }),
                          _jsxs("span", {
                            className: "bar-pct",
                            children: [d.avg.toFixed(1), "s"],
                          }),
                        ],
                      },
                      d.name
                    )
                  ),
                  _jsxs("div", {
                    style: {
                      borderTop: "1px solid #2b353e",
                      marginTop: 11,
                      paddingTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#7f8b94",
                      fontSize: 9,
                    },
                    children: [
                      "TOTAL TIME ",
                      _jsx("span", {
                        style: {
                          color: "#ccd4d8",
                          fontFamily: "var(--app-font-mono)",
                        },
                        children: fmtTime(
                          snapshot.activityTotalSeconds.polishing +
                            snapshot.activityTotalSeconds.transition +
                            snapshot.activityTotalSeconds.idle
                        ),
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          _jsxs("article", {
            className: "panel analytics",
            "data-testid": "card-utilization",
            children: [
              _jsxs("div", {
                className: "panel-head",
                children: [
                  _jsx("h2", { children: "Utilization & efficiency" }),
                  _jsx("span", { children: "SHIFT TO DATE" }),
                ],
              }),
              _jsxs("div", {
                className: "analytics-content",
                children: [
                  _jsx("div", {
                    style: {
                      color: "#808d97",
                      fontSize: 9,
                      letterSpacing: ".08em",
                      marginBottom: 7,
                    },
                    children: "MACHINE UTILIZATION",
                  }),
                  _jsxs("div", {
                    className: "bar-row",
                    children: [
                      _jsx("span", { children: "Active" }),
                      _jsx("div", {
                        className: "bar-bg",
                        children: _jsx("div", {
                          className: "bar-fill",
                          style: {
                            width: `${snapshot.machineUtilization.activePercent}%`,
                          },
                        }),
                      }),
                      _jsxs("span", {
                        className: "bar-pct",
                        children: [
                          snapshot.machineUtilization.activePercent.toFixed(1),
                          "%",
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "bar-row",
                    children: [
                      _jsx("span", { children: "Idle" }),
                      _jsx("div", {
                        className: "bar-bg",
                        children: _jsx("div", {
                          className: "bar-fill idle",
                          style: {
                            width: `${snapshot.machineUtilization.idlePercent}%`,
                          },
                        }),
                      }),
                      _jsxs("span", {
                        className: "bar-pct",
                        children: [
                          snapshot.machineUtilization.idlePercent.toFixed(1),
                          "%",
                        ],
                      }),
                    ],
                  }),
                  _jsx("div", {
                    style: {
                      color: "#808d97",
                      fontSize: 9,
                      letterSpacing: ".08em",
                      margin: "14px 0 7px",
                    },
                    children: "OPERATOR EFFICIENCY TIME",
                  }),
                  _jsxs("div", {
                    className: "metric-pairs",
                    children: [
                      _jsxs("div", {
                        className: "metric-pair",
                        children: [
                          _jsx("label", { children: "Active" }),
                          _jsx("strong", {
                            "data-testid": "text-efficiency-active",
                            children: fmtTime(
                              snapshot.operatorEfficiency.activeSeconds
                            ),
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "metric-pair",
                        children: [
                          _jsx("label", { children: "Idle" }),
                          _jsx("strong", {
                            "data-testid": "text-efficiency-idle",
                            children: fmtTime(
                              snapshot.operatorEfficiency.idleSeconds
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
        ],
      });
}
