import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity, Camera, Check, Gauge, Settings2, Wifi } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { clockTime, fmtTime, statusClass } from "../dashboard-utils";

export function ComponentsSection(props) {
  const { mode, config, draft, settingsOpen, snapshot, backend, cameraError, streamReady, error, now, camUrl, camConnected, avgComponent, data, chartData, states, cycleLabel, stageIndex, saveSettings, modeChange, setDraft, setSettingsOpen, setStreamReady, setCameraError } = props;
  return _jsxs("section", {
        className: "grid components",
        children: [
          _jsxs("article", {
            className: "panel table-panel",
            "data-testid": "card-recent-components",
            children: [
              _jsxs("div", {
                className: "panel-head",
                children: [
                  _jsx("h2", { children: "Recent component cycles" }),
                  _jsxs("span", {
                    children: [
                      "LAST ",
                      snapshot.components.length,
                      " COMPLETED",
                    ],
                  }),
                ],
              }),
              _jsxs("table", {
                className: "table",
                children: [
                  _jsx("thead", {
                    children: _jsxs("tr", {
                      children: [
                        _jsx("th", { children: "Component ID" }),
                        _jsx("th", { children: "Cycle duration" }),
                        _jsx("th", { children: "vs avg reference" }),
                      ],
                    }),
                  }),
                  _jsxs("tbody", {
                    children: [
                      snapshot.components.slice(0, 6).map((part, i) =>
                        _jsxs(
                          "tr",
                          {
                            className: i === 0 ? "current-row" : "",
                            "data-testid": `row-component-${part.id}`,
                            children: [
                              _jsx("td", { children: part.id }),
                              _jsxs("td", {
                                children: [
                                  part.cycleSeconds.toFixed(1),
                                  " sec",
                                ],
                              }),
                              _jsxs("td", {
                                style: {
                                  color:
                                    part.cycleSeconds <= avgComponent
                                      ? "#a9d84f"
                                      : "#e2bd58",
                                },
                                children: [
                                  part.cycleSeconds - avgComponent > 0
                                    ? "+"
                                    : "",
                                  (part.cycleSeconds - avgComponent).toFixed(1),
                                  " sec",
                                ],
                              }),
                            ],
                          },
                          part.id
                        )
                      ),
                      snapshot.components.length === 0 &&
                        _jsx("tr", {
                          children: _jsx("td", {
                            colSpan: 3,
                            children:
                              "No completed component cycles available.",
                          }),
                        }),
                    ],
                  }),
                ],
              }),
              _jsxs("div", {
                className: "avg-line",
                children: [
                  "Reference average ",
                  _jsxs("strong", {
                    "data-testid": "text-reference-average",
                    children: [avgComponent.toFixed(1), " sec"],
                  }),
                  _jsx("span", {
                    className: "backend-note",
                    children: " \u00B7 completed sample",
                  }),
                ],
              }),
            ],
          }),
          _jsxs("article", {
            className: "panel",
            "data-testid": "card-activity-totals",
            children: [
              _jsxs("div", {
                className: "panel-head",
                children: [
                  _jsx("h2", { children: "Process time summary" }),
                  _jsx("span", { children: "SECONDS PER CYCLE / CUMULATIVE" }),
                ],
              }),
              _jsx("div", {
                className: "analytics-content",
                children: ["polishing", "transition", "idle"].map((key, i) =>
                  _jsxs(
                    "div",
                    {
                      className: "metric-pair",
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 0",
                      },
                      "data-testid": `row-process-${key}`,
                      children: [
                        _jsxs("div", {
                          children: [
                            _jsx("label", {
                              children: [
                                "Polishing / buffing",
                                "Part transition",
                                "Idle time",
                              ][i],
                            }),
                            _jsxs("span", {
                              style: { color: "#74818a", fontSize: 9 },
                              children: [
                                "Avg ",
                                snapshot.activityAverageSeconds[key].toFixed(1),
                                " sec / cycle",
                              ],
                            }),
                          ],
                        }),
                        _jsx("strong", {
                          children: fmtTime(snapshot.activityTotalSeconds[key]),
                        }),
                      ],
                    },
                    key
                  )
                ),
              }),
            ],
          }),
        ],
      });
}

export function SettingsSection(props) {
  const { mode, config, draft, settingsOpen, snapshot, backend, cameraError, streamReady, error, now, camUrl, camConnected, avgComponent, data, chartData, states, cycleLabel, stageIndex, saveSettings, modeChange, setDraft, setSettingsOpen, setStreamReady, setCameraError } = props;
  return settingsOpen &&
        _jsx("div", {
          className: "settings-backdrop",
          role: "presentation",
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          },
          children: _jsxs("section", {
            className: "settings-modal",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "settings-heading",
            "data-testid": "dialog-connection-settings",
            children: [
              _jsxs("div", {
                className: "settings-title",
                children: [
                  _jsxs("div", {
                    children: [
                      _jsx("div", {
                        className: "section-label",
                        children: "Service configuration",
                      }),
                      _jsx("h2", {
                        id: "settings-heading",
                        children: "Connection settings",
                      }),
                    ],
                  }),
                  _jsx("button", {
                    className: "icon-button",
                    "aria-label": "Close settings",
                    "data-testid": "button-close-settings",
                    onClick: () => setSettingsOpen(false),
                    children: "\u00D7",
                  }),
                ],
              }),
              _jsx("p", {
                className: "form-help",
                children:
                  "Values are saved in this browser. Live mode reads the configured FastAPI service and listens for WebSocket events. Model inference remains on the backend.",
              }),
              _jsxs("div", {
                className: "form-row",
                children: [
                  _jsx("label", {
                    htmlFor: "rest-url",
                    children: "REST base URL",
                  }),
                  _jsx("input", {
                    id: "rest-url",
                    "data-testid": "input-rest-url",
                    placeholder: "http://localhost:8000",
                    value: draft.rest,
                    onChange: (e) =>
                      setDraft({ ...draft, rest: e.target.value }),
                  }),
                ],
              }),
              _jsxs("div", {
                className: "form-row",
                children: [
                  _jsx("label", {
                    htmlFor: "ws-url",
                    children: "WebSocket URL",
                  }),
                  _jsx("input", {
                    id: "ws-url",
                    "data-testid": "input-websocket-url",
                    placeholder: "ws://localhost:8000/ws",
                    value: draft.ws,
                    onChange: (e) => setDraft({ ...draft, ws: e.target.value }),
                  }),
                ],
              }),
              _jsxs("div", {
                className: "form-row",
                children: [
                  _jsx("label", {
                    htmlFor: "stream-url",
                    children: "Browser-compatible camera stream URL",
                  }),
                  _jsx("input", {
                    id: "stream-url",
                    "data-testid": "input-camera-url",
                    placeholder: "http://localhost:8000/camera/stream.mjpg",
                    value: draft.stream,
                    onChange: (e) =>
                      setDraft({ ...draft, stream: e.target.value }),
                  }),
                ],
              }),
              _jsxs("div", {
                className: "form-row",
                children: [
                  _jsx("label", {
                    htmlFor: "stream-type",
                    children: "Stream format",
                  }),
                  _jsxs("select", {
                    id: "stream-type",
                    "data-testid": "select-stream-type",
                    value: draft.streamType,
                    onChange: (e) =>
                      setDraft({ ...draft, streamType: e.target.value }),
                    children: [
                      _jsx("option", {
                        value: "mjpeg",
                        children: "MJPEG image stream",
                      }),
                      _jsx("option", {
                        value: "video",
                        children: "Browser-playable video",
                      }),
                    ],
                  }),
                  _jsx("span", {
                    className: "form-help",
                    children:
                      "RTSP is not browser-compatible. Use an MJPEG URL or browser-playable video stream.",
                  }),
                ],
              }),
              _jsxs("div", {
                className: "modal-actions",
                children: [
                  _jsx("button", {
                    className: "action-btn",
                    "data-testid": "button-cancel-settings",
                    onClick: () => setSettingsOpen(false),
                    children: "Cancel",
                  }),
                  _jsxs("button", {
                    className: "action-btn primary",
                    "data-testid": "button-save-settings",
                    onClick: saveSettings,
                    children: [
                      _jsx(Check, {
                        size: 13,
                        style: { verticalAlign: "middle", marginRight: 5 },
                      }),
                      "Save settings",
                    ],
                  }),
                ],
              }),
            ],
          }),
        });
}
