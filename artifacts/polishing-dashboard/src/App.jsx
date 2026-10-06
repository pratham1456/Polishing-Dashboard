import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HeaderSection,
  MachineSection,
  DemoNotice,
  LiveErrorNotice,
} from "./components/dashboard-header";
import {
  KpiSection,
  CycleCameraSection,
} from "./components/dashboard-production";
import { AnalyticsSection } from "./components/dashboard-analytics";
import {
  ComponentsSection,
  SettingsSection,
} from "./components/dashboard-history";

const configKey = "polishing-control-config-v1";
const defaultConfig = { rest: "", ws: "", stream: "", streamType: "mjpeg" };
const initial = {
  producedCount: 1284,
  componentsPerHour: 47.2,
  averageCycleSeconds: 76.4,
  totalPolishingSeconds: 48762,
  operator: {
    presenceSeconds: 22518,
    activeSeconds: 18432,
    idleSeconds: 4086,
    utilizationPercent: 81.9,
    efficiencyPercent: 93.4,
  },
  currentCycle: {
    componentId: "OT-261006-0842",
    state: "Polishing",
    elapsedSeconds: 38,
  },
  activityAverageSeconds: { polishing: 52.8, transition: 9.7, idle: 13.9 },
  activityTotalSeconds: { polishing: 48762, transition: 8965, idle: 12840 },
  machineUtilization: { activePercent: 84.1, idlePercent: 15.9 },
  operatorEfficiency: { activeSeconds: 18432, idleSeconds: 4086 },
  components: [
    { id: "OT-261006-0841", cycleSeconds: 73.2 },
    { id: "OT-261006-0840", cycleSeconds: 81.6 },
    { id: "OT-261006-0839", cycleSeconds: 75.4 },
    { id: "OT-261006-0838", cycleSeconds: 78.1 },
    { id: "OT-261006-0837", cycleSeconds: 72.8 },
    { id: "OT-261006-0836", cycleSeconds: 79.5 },
  ],
  camera: { connected: false, fps: 0, timestamp: new Date().toISOString() },
  yoloRunning: false,
  detection: {
    className: "Output Tray",
    confidence: 0.986,
    bbox: { x: 0.31, y: 0.22, width: 0.38, height: 0.51 },
  },
};
const flow = [
  "Part Picked",
  "Polishing",
  "Placement Pending",
  "Output Tray Placed",
  "Placement Confirmed",
  "Cycle Completed",
];
function mergeSnapshot(base, patch) {
  return {
    ...base,
    ...patch,
    operator: { ...base.operator, ...patch.operator },
    currentCycle: { ...base.currentCycle, ...patch.currentCycle },
    activityAverageSeconds: {
      ...base.activityAverageSeconds,
      ...patch.activityAverageSeconds,
    },
    activityTotalSeconds: {
      ...base.activityTotalSeconds,
      ...patch.activityTotalSeconds,
    },
    machineUtilization: {
      ...base.machineUtilization,
      ...patch.machineUtilization,
    },
    operatorEfficiency: {
      ...base.operatorEfficiency,
      ...patch.operatorEfficiency,
    },
    camera: { ...base.camera, ...patch.camera },
    components: patch.components ?? base.components,
    detection: patch.detection === undefined ? base.detection : patch.detection,
  };
}
function App() {
  const [mode, setMode] = useState("demo");
  const [config, setConfig] = useState(() => {
    try {
      return {
        ...defaultConfig,
        ...JSON.parse(localStorage.getItem(configKey) || "{}"),
      };
    } catch {
      return defaultConfig;
    }
  });
  const [draft, setDraft] = useState(config);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(initial);
  const [backend, setBackend] = useState("disconnected");
  const [cameraError, setCameraError] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const stepCount = useRef(0);
  const updateFromEvent = useCallback((message) => {
    if (!message.data) return;
    if (message.type === "snapshot") {
      setSnapshot((prev) => mergeSnapshot(prev, message.data));
      return;
    }
    setSnapshot((prev) => {
      let next = mergeSnapshot(prev, message.data);
      const eventState = {
        part_detected: "Waiting for Part",
        part_picked: "Part Picked",
        polishing_started: "Polishing",
        polishing_completed: "Placement Pending",
        part_placed: "Output Tray Placed",
        placement_confirmed: "Placement Confirmed",
        cycle_completed: "Cycle Completed",
      };
      const state = eventState[message.type || ""];
      if (state && !message.data?.currentCycle?.state) {
        next = { ...next, currentCycle: { ...next.currentCycle, state } };
      }
      if (
        message.type === "cycle_completed" &&
        typeof message.data?.producedCount !== "number"
      ) {
        next = { ...next, producedCount: prev.producedCount + 1 };
      }
      return next;
    });
  }, []);
  useEffect(() => {
    if (mode !== "demo") return;
    setBackend("disconnected");
    setSnapshot(initial);
    setError("");
    stepCount.current = 0;
    const timer = window.setInterval(() => {
      setNow(new Date());
      stepCount.current += 1;
      setSnapshot((prev) => {
        const elapsed = prev.currentCycle.elapsedSeconds + 1;
        let next = {
          ...prev,
          currentCycle: { ...prev.currentCycle, elapsedSeconds: elapsed },
          operator: {
            ...prev.operator,
            presenceSeconds: prev.operator.presenceSeconds + 1,
            activeSeconds: prev.operator.activeSeconds + 1,
          },
          operatorEfficiency: {
            ...prev.operatorEfficiency,
            activeSeconds: prev.operatorEfficiency.activeSeconds + 1,
          },
          camera: { ...prev.camera, timestamp: new Date().toISOString() },
        };
        if (stepCount.current % 5 === 0)
          next = {
            ...next,
            componentsPerHour:
              Math.round((47.2 + Math.sin(stepCount.current / 17) * 1.2) * 10) /
              10,
          };
        if (stepCount.current % 12 === 0) {
          if (prev.currentCycle.state === "Cycle Completed") {
            next = {
              ...next,
              currentCycle: {
                componentId: `OT-261006-${String(843 + Math.floor(stepCount.current / 12)).padStart(4, "0")}`,
                state: "Part Picked",
                elapsedSeconds: 0,
              },
            };
          } else {
            const i = flow.indexOf(prev.currentCycle.state);
            const nextState = flow[Math.min(i + 1, flow.length - 1)];
            next = {
              ...next,
              currentCycle: {
                ...prev.currentCycle,
                state: nextState,
                elapsedSeconds: nextState === "Cycle Completed" ? 0 : elapsed,
              },
            };
            if (nextState === "Cycle Completed") next.producedCount += 1;
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);
  useEffect(() => {
    if (mode !== "live") return;
    let socket = null;
    let reconnectTimer = 0;
    let cancelled = false;
    const connect = async () => {
      setBackend("connecting");
      setError("");
      if (!config.rest.trim() || !config.ws.trim()) {
        setBackend("disconnected");
        setError(
          "Configure REST and WebSocket URLs to connect to the FastAPI service."
        );
      } else {
        try {
          const response = await fetch(
            `${config.rest.replace(/\/+$/, "")}/status`
          );
          if (!response.ok)
            throw new Error(`Status endpoint returned ${response.status}`);
          const result = await response.json();
          if (!cancelled) {
            setSnapshot((prev) => mergeSnapshot(prev, result));
            setBackend("connected");
          }
        } catch (e) {
          if (!cancelled) {
            setBackend("disconnected");
            setError(
              `REST bootstrap failed: ${e instanceof Error ? e.message : "Unable to reach status endpoint"}`
            );
          }
        }
      }
      if (cancelled || !config.ws.trim()) return;
      try {
        socket = new WebSocket(config.ws);
        socket.onopen = () => {
          if (!cancelled) {
            setBackend("connected");
            setError("");
          }
        };
        socket.onmessage = (ev) => {
          try {
            updateFromEvent(JSON.parse(String(ev.data)));
          } catch {
            setError("Received an unreadable WebSocket event.");
          }
        };
        socket.onerror = () => {
          if (!cancelled) setBackend("disconnected");
        };
        socket.onclose = () => {
          if (!cancelled) {
            setBackend("disconnected");
            reconnectTimer = window.setTimeout(connect, 2500);
          }
        };
      } catch {
        if (!cancelled) {
          setBackend("disconnected");
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      }
    };
    void connect();
    return () => {
      cancelled = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [mode, config.rest, config.ws, updateFromEvent]);
  useEffect(() => {
    if (mode !== "live") return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [mode]);
  const saveSettings = () => {
    setConfig(draft);
    localStorage.setItem(configKey, JSON.stringify(draft));
    setSettingsOpen(false);
    setStreamReady(false);
    setCameraError(false);
  };
  const modeChange = (next) => {
    setMode(next);
    if (next === "live") {
      setDraft(config);
      setSnapshot((prev) => ({
        ...prev,
        camera: { ...prev.camera, connected: false },
      }));
    }
  };
  const camUrl =
    mode === "live" ? config.stream || snapshot.camera.streamUrl || "" : "";
  const camConnected =
    mode === "demo"
      ? false
      : Boolean(
          snapshot.camera.connected && camUrl && streamReady && !cameraError
        );
  const avgComponent = useMemo(
    () =>
      snapshot.components.length
        ? snapshot.components.reduce((s, c) => s + c.cycleSeconds, 0) /
          snapshot.components.length
        : 0,
    [snapshot.components]
  );
  const data = useMemo(
    () => [
      {
        name: "Polish",
        avg: snapshot.activityAverageSeconds.polishing,
        total: snapshot.activityTotalSeconds.polishing / 60,
      },
      {
        name: "Transition",
        avg: snapshot.activityAverageSeconds.transition,
        total: snapshot.activityTotalSeconds.transition / 60,
      },
      {
        name: "Idle",
        avg: snapshot.activityAverageSeconds.idle,
        total: snapshot.activityTotalSeconds.idle / 60,
      },
    ],
    [snapshot]
  );
  const chartData = useMemo(
    () => [
      { t: "08:00", output: 35 },
      { t: "09:00", output: 42 },
      { t: "10:00", output: 39 },
      { t: "11:00", output: 48 },
      { t: "12:00", output: 45 },
      { t: "13:00", output: 51 },
      { t: "14:00", output: snapshot.componentsPerHour },
      { t: "Now", output: snapshot.componentsPerHour },
    ],
    [snapshot.componentsPerHour]
  );
  const states = [
    "Part Picked",
    "Polishing",
    "Part Placed in Output Tray",
    "Placement Confirmed",
    "Cycle Completed",
  ];
  const cycleLabel = snapshot.currentCycle.state;
  const stageIndex =
    snapshot.currentCycle.state === "Waiting for Part"
      ? -1
      : snapshot.currentCycle.state === "Placement Confirmed"
        ? 3
        : snapshot.currentCycle.state === "Output Tray Placed" ||
            snapshot.currentCycle.state === "Placement Pending"
          ? 2
          : snapshot.currentCycle.state === "Cycle Completed"
            ? 4
            : states.indexOf(snapshot.currentCycle.state);
  const dashboardProps = {
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
  };
  return _jsxs("main", {
    className: "dashboard",
    "data-testid": "dashboard-workstation",
    children: [
      _jsx(HeaderSection, dashboardProps),
      _jsx(MachineSection, dashboardProps),
      _jsx(DemoNotice, dashboardProps),
      _jsx(LiveErrorNotice, dashboardProps),
      _jsx(KpiSection, dashboardProps),
      _jsx(CycleCameraSection, dashboardProps),
      _jsx(AnalyticsSection, dashboardProps),
      _jsx(ComponentsSection, dashboardProps),
      _jsx(SettingsSection, dashboardProps),
    ],
  });
}
export default App;
