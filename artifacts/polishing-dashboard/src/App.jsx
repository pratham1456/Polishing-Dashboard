import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Camera, Check, Gauge, Settings2, Wifi } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis, } from 'recharts';
const configKey = 'polishing-control-config-v1';
const defaultConfig = { rest: '', ws: '', stream: '', streamType: 'mjpeg' };
const initial = {
    producedCount: 1284, componentsPerHour: 47.2, averageCycleSeconds: 76.4, totalPolishingSeconds: 48762,
    operator: { presenceSeconds: 22518, activeSeconds: 18432, idleSeconds: 4086, utilizationPercent: 81.9, efficiencyPercent: 93.4 },
    currentCycle: { componentId: 'OT-261006-0842', state: 'Polishing', elapsedSeconds: 38 },
    activityAverageSeconds: { polishing: 52.8, transition: 9.7, idle: 13.9 },
    activityTotalSeconds: { polishing: 48762, transition: 8965, idle: 12840 },
    machineUtilization: { activePercent: 84.1, idlePercent: 15.9 },
    operatorEfficiency: { activeSeconds: 18432, idleSeconds: 4086 },
    components: [
        { id: 'OT-261006-0841', cycleSeconds: 73.2 }, { id: 'OT-261006-0840', cycleSeconds: 81.6 },
        { id: 'OT-261006-0839', cycleSeconds: 75.4 }, { id: 'OT-261006-0838', cycleSeconds: 78.1 },
        { id: 'OT-261006-0837', cycleSeconds: 72.8 }, { id: 'OT-261006-0836', cycleSeconds: 79.5 },
    ],
    camera: { connected: false, fps: 0, timestamp: new Date().toISOString() }, yoloRunning: false,
    detection: { className: 'Output Tray', confidence: 0.986, bbox: { x: .31, y: .22, width: .38, height: .51 } },
};
const flow = ['Part Picked', 'Polishing', 'Placement Pending', 'Output Tray Placed', 'Placement Confirmed', 'Cycle Completed'];
const statusClass = (on) => on === true ? 'ok' : on === false ? 'bad' : 'warn';
const fmtTime = (seconds) => `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds % 3600 / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const clockTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
function mergeSnapshot(base, patch) {
    return {
        ...base, ...patch,
        operator: { ...base.operator, ...patch.operator },
        currentCycle: { ...base.currentCycle, ...patch.currentCycle },
        activityAverageSeconds: { ...base.activityAverageSeconds, ...patch.activityAverageSeconds },
        activityTotalSeconds: { ...base.activityTotalSeconds, ...patch.activityTotalSeconds },
        machineUtilization: { ...base.machineUtilization, ...patch.machineUtilization },
        operatorEfficiency: { ...base.operatorEfficiency, ...patch.operatorEfficiency },
        camera: { ...base.camera, ...patch.camera },
        components: patch.components ?? base.components,
        detection: patch.detection === undefined ? base.detection : patch.detection,
    };
}
function App() {
    const [mode, setMode] = useState('demo');
    const [config, setConfig] = useState(() => {
        try {
            return { ...defaultConfig, ...JSON.parse(localStorage.getItem(configKey) || '{}') };
        }
        catch {
            return defaultConfig;
        }
    });
    const [draft, setDraft] = useState(config);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [snapshot, setSnapshot] = useState(initial);
    const [backend, setBackend] = useState('disconnected');
    const [cameraError, setCameraError] = useState(false);
    const [streamReady, setStreamReady] = useState(false);
    const [error, setError] = useState('');
    const [now, setNow] = useState(new Date());
    const stepCount = useRef(0);
    const updateFromEvent = useCallback((message) => {
        if (!message.data)
            return;
        if (message.type === 'snapshot') {
            setSnapshot(prev => mergeSnapshot(prev, message.data));
            return;
        }
        setSnapshot(prev => {
            let next = mergeSnapshot(prev, message.data);
            const eventState = {
                part_detected: 'Waiting for Part', part_picked: 'Part Picked', polishing_started: 'Polishing',
                polishing_completed: 'Placement Pending', part_placed: 'Output Tray Placed',
                placement_confirmed: 'Placement Confirmed', cycle_completed: 'Cycle Completed',
            };
            const state = eventState[message.type || ''];
            if (state && !message.data?.currentCycle?.state) {
                next = { ...next, currentCycle: { ...next.currentCycle, state } };
            }
            if (message.type === 'cycle_completed' && typeof message.data?.producedCount !== 'number') {
                next = { ...next, producedCount: prev.producedCount + 1 };
            }
            return next;
        });
    }, []);
    useEffect(() => {
        if (mode !== 'demo')
            return;
        setBackend('disconnected');
        setSnapshot(initial);
        setError('');
        stepCount.current = 0;
        const timer = window.setInterval(() => {
            setNow(new Date());
            stepCount.current += 1;
            setSnapshot(prev => {
                const elapsed = prev.currentCycle.elapsedSeconds + 1;
                let next = {
                    ...prev,
                    currentCycle: { ...prev.currentCycle, elapsedSeconds: elapsed },
                    operator: { ...prev.operator, presenceSeconds: prev.operator.presenceSeconds + 1, activeSeconds: prev.operator.activeSeconds + 1 },
                    operatorEfficiency: { ...prev.operatorEfficiency, activeSeconds: prev.operatorEfficiency.activeSeconds + 1 },
                    camera: { ...prev.camera, timestamp: new Date().toISOString() },
                };
                if (stepCount.current % 5 === 0)
                    next = { ...next, componentsPerHour: Math.round((47.2 + Math.sin(stepCount.current / 17) * 1.2) * 10) / 10 };
                if (stepCount.current % 12 === 0) {
                    if (prev.currentCycle.state === 'Cycle Completed') {
                        next = {
                            ...next,
                            currentCycle: {
                                componentId: `OT-261006-${String(843 + Math.floor(stepCount.current / 12)).padStart(4, '0')}`,
                                state: 'Part Picked',
                                elapsedSeconds: 0,
                            },
                        };
                    }
                    else {
                        const i = flow.indexOf(prev.currentCycle.state);
                        const nextState = flow[Math.min(i + 1, flow.length - 1)];
                        next = {
                            ...next,
                            currentCycle: { ...prev.currentCycle, state: nextState, elapsedSeconds: nextState === 'Cycle Completed' ? 0 : elapsed },
                        };
                        if (nextState === 'Cycle Completed')
                            next.producedCount += 1;
                    }
                }
                return next;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [mode]);
    useEffect(() => {
        if (mode !== 'live')
            return;
        let socket = null;
        let reconnectTimer = 0;
        let cancelled = false;
        const connect = async () => {
            setBackend('connecting');
            setError('');
            if (!config.rest.trim() || !config.ws.trim()) {
                setBackend('disconnected');
                setError('Configure REST and WebSocket URLs to connect to the FastAPI service.');
            }
            else {
                try {
                    const response = await fetch(`${config.rest.replace(/\/+$/, '')}/status`);
                    if (!response.ok)
                        throw new Error(`Status endpoint returned ${response.status}`);
                    const result = await response.json();
                    if (!cancelled) {
                        setSnapshot(prev => mergeSnapshot(prev, result));
                        setBackend('connected');
                    }
                }
                catch (e) {
                    if (!cancelled) {
                        setBackend('disconnected');
                        setError(`REST bootstrap failed: ${e instanceof Error ? e.message : 'Unable to reach status endpoint'}`);
                    }
                }
            }
            if (cancelled || !config.ws.trim())
                return;
            try {
                socket = new WebSocket(config.ws);
                socket.onopen = () => { if (!cancelled) {
                    setBackend('connected');
                    setError('');
                } };
                socket.onmessage = ev => {
                    try {
                        updateFromEvent(JSON.parse(String(ev.data)));
                    }
                    catch {
                        setError('Received an unreadable WebSocket event.');
                    }
                };
                socket.onerror = () => { if (!cancelled)
                    setBackend('disconnected'); };
                socket.onclose = () => {
                    if (!cancelled) {
                        setBackend('disconnected');
                        reconnectTimer = window.setTimeout(connect, 2500);
                    }
                };
            }
            catch {
                if (!cancelled) {
                    setBackend('disconnected');
                    reconnectTimer = window.setTimeout(connect, 2500);
                }
            }
        };
        void connect();
        return () => { cancelled = true; window.clearTimeout(reconnectTimer); socket?.close(); };
    }, [mode, config.rest, config.ws, updateFromEvent]);
    useEffect(() => {
        if (mode !== 'live')
            return;
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
        if (next === 'live') {
            setDraft(config);
            setSnapshot(prev => ({ ...prev, camera: { ...prev.camera, connected: false } }));
        }
    };
    const camUrl = mode === 'live' ? (config.stream || snapshot.camera.streamUrl || '') : '';
    const camConnected = mode === 'demo' ? false : Boolean(snapshot.camera.connected && camUrl && streamReady && !cameraError);
    const avgComponent = useMemo(() => snapshot.components.length ? snapshot.components.reduce((s, c) => s + c.cycleSeconds, 0) / snapshot.components.length : 0, [snapshot.components]);
    const data = useMemo(() => [
        { name: 'Polish', avg: snapshot.activityAverageSeconds.polishing, total: snapshot.activityTotalSeconds.polishing / 60 },
        { name: 'Transition', avg: snapshot.activityAverageSeconds.transition, total: snapshot.activityTotalSeconds.transition / 60 },
        { name: 'Idle', avg: snapshot.activityAverageSeconds.idle, total: snapshot.activityTotalSeconds.idle / 60 },
    ], [snapshot]);
    const chartData = useMemo(() => [
        { t: '08:00', output: 35 }, { t: '09:00', output: 42 }, { t: '10:00', output: 39 }, { t: '11:00', output: 48 },
        { t: '12:00', output: 45 }, { t: '13:00', output: 51 }, { t: '14:00', output: snapshot.componentsPerHour }, { t: 'Now', output: snapshot.componentsPerHour },
    ], [snapshot.componentsPerHour]);
    const states = ['Part Picked', 'Polishing', 'Part Placed in Output Tray', 'Placement Confirmed', 'Cycle Completed'];
    const cycleLabel = snapshot.currentCycle.state;
    const stageIndex = snapshot.currentCycle.state === 'Waiting for Part' ? -1 :
        snapshot.currentCycle.state === 'Placement Confirmed' ? 3 :
            snapshot.currentCycle.state === 'Output Tray Placed' || snapshot.currentCycle.state === 'Placement Pending' ? 2 :
                snapshot.currentCycle.state === 'Cycle Completed' ? 4 : states.indexOf(snapshot.currentCycle.state);
    return (_jsxs("main", { className: "dashboard", "data-testid": "dashboard-workstation", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "brand", children: [_jsx("div", { className: "brand-mark", children: _jsx(Activity, { size: 20, strokeWidth: 2.5 }) }), _jsxs("div", { children: [_jsx("div", { className: "brand-name", children: "SURFACE / FINISH" }), _jsx("div", { className: "brand-sub", children: "Production control \u00B7 cell 04" })] })] }), _jsxs("div", { className: "top-meta", children: [_jsxs("span", { className: `mode-pill ${mode}`, "data-testid": "status-mode", children: [_jsx("i", { className: "live-dot", style: { background: mode === 'demo' ? '#e7c35b' : '#7bbdf1' } }), mode === 'demo' ? 'DEMO DATA' : 'LIVE SERVICE'] }), _jsxs("time", { className: "clock", "data-testid": "text-clock", children: [now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), " \u00A0 ", clockTime()] }), _jsxs("div", { className: "head-actions", children: [_jsxs("select", { className: "select-mode", "aria-label": "Data mode", "data-testid": "select-data-mode", value: mode, onChange: e => modeChange(e.target.value), children: [_jsx("option", { value: "demo", children: "Demo" }), _jsx("option", { value: "live", children: "Live FastAPI" })] }), _jsx("button", { className: "icon-button", title: "Connection settings", "aria-label": "Open connection settings", "data-testid": "button-settings", onClick: () => { setDraft(config); setSettingsOpen(true); }, children: _jsx(Settings2, { size: 16 }) })] })] })] }), _jsxs("div", { className: "machine-line", children: [_jsxs("div", { children: [_jsx("div", { className: "section-label", children: "Active workstation" }), _jsxs("div", { className: "machine-title", children: [_jsx("h1", { children: "Part Polishing / Buffing" }), _jsx("span", { children: "STATION \u00B7 POL-04" })] })] }), _jsxs("div", { className: "connectivity", "aria-label": "Connection states", children: [_jsxs("div", { className: `conn ${statusClass(mode === 'demo' ? null : camConnected)}`, "data-testid": "status-camera", children: [_jsx("i", { className: "led" }), _jsx(Camera, { size: 12 }), _jsx("b", { children: "CAMERA" }), _jsx("span", { children: mode === 'demo' ? 'Demo' : camConnected ? 'Connected' : snapshot.camera.connected ? 'Stream offline' : 'Disconnected' })] }), _jsxs("div", { className: `conn ${statusClass(mode === 'demo' ? null : backend === 'connected')}`, "data-testid": "status-backend", children: [_jsx("i", { className: "led" }), _jsx(Wifi, { size: 12 }), _jsx("b", { children: "BACKEND" }), _jsx("span", { children: mode === 'demo' ? 'Demo' : backend === 'connected' ? 'Connected' : backend === 'connecting' ? 'Connecting' : 'Disconnected' })] }), _jsxs("div", { className: `conn ${statusClass(mode === 'demo' ? null : snapshot.yoloRunning)}`, "data-testid": "status-yolo", children: [_jsx("i", { className: "led" }), _jsx(Gauge, { size: 12 }), _jsx("b", { children: "YOLO MODEL" }), _jsx("span", { children: mode === 'demo' ? 'Demo' : snapshot.yoloRunning ? 'Running' : 'Stopped' })] })] })] }), mode === 'demo' && _jsx("div", { className: "error-banner", style: { background: '#29271d', borderColor: '#5e5432', color: '#e0ca7e' }, "data-testid": "notice-demo", children: "DEMO MODE \u2014 simulated workstation data. Camera, backend and model are not connected." }), error && _jsx("div", { className: "error-banner", role: "alert", "data-testid": "notice-live-error", children: error }), _jsxs("section", { className: "grid kpi-grid", "aria-label": "Production KPIs", children: [_jsxs("article", { className: "panel kpi primary", "data-testid": "kpi-produced", children: [_jsxs("div", { className: "kpi-title", children: [_jsx("span", { children: "Total produced" }), _jsx("span", { children: "OUTPUT TRAY" })] }), _jsxs("div", { className: "kpi-value", children: [snapshot.producedCount.toLocaleString(), _jsx("small", { children: "parts" })] }), _jsx("div", { className: "kpi-foot", children: "Component type \u00B7 Output Tray" })] }), _jsxs("article", { className: "panel kpi", "data-testid": "kpi-rate", children: [_jsxs("div", { className: "kpi-title", children: [_jsx("span", { children: "Throughput" }), _jsx("span", { children: "LIVE RATE" })] }), _jsxs("div", { className: "kpi-value", children: [snapshot.componentsPerHour.toFixed(1), _jsx("small", { children: "parts / hr" })] }), _jsx("div", { className: "kpi-foot", children: "Current production pace" })] }), _jsxs("article", { className: "panel kpi", "data-testid": "kpi-cycle", children: [_jsxs("div", { className: "kpi-title", children: [_jsx("span", { children: "Average cycle" }), _jsx("span", { children: "PER COMPONENT" })] }), _jsxs("div", { className: "kpi-value", children: [snapshot.averageCycleSeconds.toFixed(1), _jsx("small", { children: "sec" })] }), _jsx("div", { className: "kpi-foot", children: "Target reference \u00B7 75.0 sec" })] }), _jsxs("article", { className: "panel kpi", "data-testid": "kpi-polishing", children: [_jsxs("div", { className: "kpi-title", children: [_jsx("span", { children: "Total polishing time" }), _jsx("span", { children: "CUMULATIVE" })] }), _jsxs("div", { className: "kpi-value", children: [fmtTime(snapshot.totalPolishingSeconds), _jsx("small", { children: "hh:mm:ss" })] }), _jsx("div", { className: "kpi-foot", children: "Active buffing duration" })] })] }), _jsxs("section", { className: "grid main-grid", children: [_jsxs("article", { className: "panel cycle-panel", "data-testid": "card-current-cycle", children: [_jsxs("div", { className: "panel-head", children: [_jsx("h2", { children: "Current cycle" }), _jsx("span", { children: "SEQUENCE STATUS" })] }), _jsxs("div", { className: "cycle-status", children: [_jsxs("div", { children: [_jsx("div", { className: "cycle-state", "data-testid": "text-cycle-state", children: cycleLabel }), _jsx("div", { className: "cycle-id", "data-testid": "text-component-id", children: snapshot.currentCycle.componentId || 'Awaiting component' })] }), _jsxs("div", { className: "cycle-clock", "data-testid": "text-cycle-elapsed", children: [fmtTime(snapshot.currentCycle.elapsedSeconds), _jsx("small", { children: " elapsed" })] })] }), _jsx("div", { className: "progress-track", "data-testid": "cycle-progression", children: states.map((s, i) => _jsx("div", { className: `step ${i < stageIndex ? 'done' : i === stageIndex ? 'active' : ''}`, "data-testid": `step-cycle-${i}`, children: s }, s)) }), _jsxs("div", { className: "cycle-foot", children: [_jsx("span", { children: "Cycle state" }), _jsx("strong", { children: cycleLabel })] }), _jsxs("div", { className: "cycle-foot", style: { marginTop: 5 }, children: [_jsx("span", { children: "Elapsed cycle time" }), _jsxs("strong", { children: [snapshot.currentCycle.elapsedSeconds.toFixed(0), " sec"] })] })] }), _jsxs("article", { className: "panel", "data-testid": "card-operator", children: [_jsxs("div", { className: "panel-head", children: [_jsx("h2", { children: "Operator status" }), _jsx("span", { children: "SHIFT TO DATE" })] }), _jsxs("div", { className: "analytics-content", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }, children: [_jsxs("div", { children: [_jsx("div", { style: { color: '#87939c', fontSize: 9, letterSpacing: '.08em' }, children: "OPERATOR PRESENCE" }), _jsxs("div", { className: "kpi-value", style: { fontSize: 30, marginTop: 5 }, "data-testid": "text-presence", children: [fmtTime(snapshot.operator.presenceSeconds), _jsx("small", { children: "h:m:s" })] })] }), _jsxs("div", { style: { textAlign: 'right' }, children: [_jsx("div", { style: { color: '#87939c', fontSize: 9 }, children: "UTILIZATION" }), _jsxs("div", { className: "kpi-value", style: { fontSize: 32, marginTop: 5, color: '#b8df67' }, "data-testid": "text-operator-utilization", children: [snapshot.operator.utilizationPercent.toFixed(1), _jsx("small", { children: "%" })] })] })] }), _jsxs("div", { className: "metric-pairs", children: [_jsxs("div", { className: "metric-pair", children: [_jsx("label", { children: "Active time" }), _jsx("strong", { "data-testid": "text-operator-active", children: fmtTime(snapshot.operator.activeSeconds) })] }), _jsxs("div", { className: "metric-pair", children: [_jsx("label", { children: "Idle time" }), _jsx("strong", { "data-testid": "text-operator-idle", children: fmtTime(snapshot.operator.idleSeconds) })] }), _jsxs("div", { className: "metric-pair", children: [_jsx("label", { children: "Efficiency" }), _jsxs("strong", { "data-testid": "text-operator-efficiency", children: [snapshot.operator.efficiencyPercent.toFixed(1), _jsx("em", { children: "%" })] })] }), _jsxs("div", { className: "metric-pair", children: [_jsx("label", { children: "Presence" }), _jsx("strong", { children: fmtTime(snapshot.operator.presenceSeconds) })] })] })] })] }), _jsxs("article", { className: "panel cam-panel", "data-testid": "card-camera", children: [_jsxs("div", { className: "panel-head", children: [_jsx("h2", { children: "Inspection camera" }), _jsx("span", { children: mode === 'demo' ? 'NO FEED' : camConnected ? 'STREAM ACTIVE' : 'NO SIGNAL' })] }), _jsxs("div", { className: "camera-frame", children: [mode === 'live' && camUrl && !cameraError && config.streamType === 'mjpeg' && _jsx("img", { src: camUrl, alt: "Live workstation camera stream", onLoad: () => { setStreamReady(true); setCameraError(false); }, onError: () => { setCameraError(true); setStreamReady(false); } }), mode === 'live' && camUrl && !cameraError && config.streamType === 'video' && _jsx("video", { src: camUrl, autoPlay: true, muted: true, playsInline: true, onCanPlay: () => { setStreamReady(true); setCameraError(false); }, onError: () => { setCameraError(true); setStreamReady(false); } }), (mode === 'demo' || !camUrl || cameraError || !streamReady) && _jsxs("div", { className: "camera-placeholder", children: [_jsx(Camera, { size: 24, strokeWidth: 1.3 }), _jsx("strong", { children: mode === 'demo' ? 'DEMO — CAMERA NOT CONNECTED' : cameraError ? 'STREAM OFFLINE' : 'WAITING FOR CAMERA STREAM' }), _jsx("span", { children: mode === 'demo' ? 'No simulated camera feed' : camUrl ? 'Verify browser-compatible stream URL' : 'Set a browser-playable stream in settings' })] }), _jsxs("div", { className: "cam-corner", children: [_jsx("span", { className: `cam-live ${mode === 'live' && camConnected ? 'is-live' : ''}`, children: mode === 'live' && camConnected ? 'LIVE' : 'OFFLINE' }), " POL-04 \u00B7 VIEW 01"] }), _jsxs("div", { className: "cam-right", children: [snapshot.camera.fps.toFixed(1), " FPS"] }), mode === 'live' && camConnected && snapshot.detection && _jsx("div", { className: "camera-overlay", "data-testid": "overlay-detection", children: _jsx("div", { className: "det-box", style: { left: `${Math.max(0, snapshot.detection.bbox.x) * 100}%`, top: `${Math.max(0, snapshot.detection.bbox.y) * 100}%`, width: `${Math.min(1, snapshot.detection.bbox.width) * 100}%`, height: `${Math.min(1, snapshot.detection.bbox.height) * 100}%` }, children: _jsxs("span", { className: "det-label", children: [snapshot.detection.className, " \u00B7 ", (snapshot.detection.confidence * 100).toFixed(1), "%"] }) }) })] }), _jsxs("div", { className: "cam-foot", children: [_jsx("span", { "data-testid": "text-camera-timestamp", children: mode === 'demo' ? 'DEMO · NO CAMERA TIMESTAMP' : snapshot.camera.timestamp || 'Timestamp unavailable' }), _jsxs("span", { className: "cam-process", "data-testid": "status-camera-process", children: ["PROCESS \u00B7 ", cycleLabel] }), _jsx("span", { children: mode === 'demo' && snapshot.detection ? `SAMPLE · ${snapshot.detection.className} ${(snapshot.detection.confidence * 100).toFixed(1)}%` : snapshot.detection ? `${snapshot.detection.className} ${(snapshot.detection.confidence * 100).toFixed(1)}%` : 'No detection' })] })] })] }), _jsxs("section", { className: "grid analytics-grid", "aria-label": "Production analytics", children: [_jsxs("article", { className: "panel analytics", "data-testid": "card-cycle-trend", children: [_jsxs("div", { className: "panel-head", children: [_jsx("h2", { children: "Production rate" }), _jsx("span", { children: "COMPONENTS / HOUR" })] }), _jsxs("div", { className: "analytics-content", children: [_jsxs("div", { className: "legend-row", children: [_jsxs("span", { children: [_jsx("i", { className: "legend-dot", style: { background: '#a9d84f' } }), "Current pace"] }), _jsx("span", { children: "Shift trend \u00B7 today" })] }), _jsx("div", { className: "chart-wrap", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: chartData, margin: { top: 6, right: 4, left: -24, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "rateFill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#a9d84f", stopOpacity: .22 }), _jsx("stop", { offset: "100%", stopColor: "#a9d84f", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { stroke: "#29333c", strokeDasharray: "3 4", vertical: false }), _jsx(XAxis, { dataKey: "t", tick: { fill: '#73808a', fontSize: 9 }, axisLine: false, tickLine: false }), _jsx(YAxis, { domain: [0, 60], tick: { fill: '#73808a', fontSize: 9 }, axisLine: false, tickLine: false }), _jsx(ChartTooltip, { contentStyle: { background: '#202931', border: '1px solid #46525b', borderRadius: 3, fontSize: 10 }, labelStyle: { color: '#c9d1d5' } }), _jsx(Area, { type: "monotone", dataKey: "output", stroke: "#b3df64", strokeWidth: 2, fill: "url(#rateFill)", dot: false, activeDot: { r: 3, fill: '#c7eb82' } })] }) }) })] })] }), _jsxs("article", { className: "panel analytics", "data-testid": "card-activity-duration", children: [_jsxs("div", { className: "panel-head", children: [_jsx("h2", { children: "Activity duration" }), _jsx("span", { children: "AVERAGE / TOTAL" })] }), _jsxs("div", { className: "analytics-content", children: [_jsxs("div", { className: "legend-row", children: [_jsxs("span", { children: [_jsx("i", { className: "legend-dot", style: { background: '#61b9df' } }), "Avg. seconds per cycle"] }), _jsxs("span", { children: [_jsx("i", { className: "legend-dot", style: { background: '#485661' } }), "Total minutes"] })] }), data.map((d, i) => _jsxs("div", { className: "bar-row", "data-testid": `metric-activity-${d.name.toLowerCase()}`, children: [_jsx("span", { children: d.name }), _jsx("div", { className: "bar-bg", children: _jsx("div", { className: "bar-fill", style: { width: `${Math.min(d.avg / 60 * 100, 100)}%`, background: ['#61b9df', '#e0bb5e', '#697985'][i] } }) }), _jsxs("span", { className: "bar-pct", children: [d.avg.toFixed(1), "s"] })] }, d.name)), _jsxs("div", { style: { borderTop: '1px solid #2b353e', marginTop: 11, paddingTop: 8, display: 'flex', justifyContent: 'space-between', color: '#7f8b94', fontSize: 9 }, children: ["TOTAL TIME ", _jsx("span", { style: { color: '#ccd4d8', fontFamily: 'var(--app-font-mono)' }, children: fmtTime(snapshot.activityTotalSeconds.polishing + snapshot.activityTotalSeconds.transition + snapshot.activityTotalSeconds.idle) })] })] })] }), _jsxs("article", { className: "panel analytics", "data-testid": "card-utilization", children: [_jsxs("div", { className: "panel-head", children: [_jsx("h2", { children: "Utilization & efficiency" }), _jsx("span", { children: "SHIFT TO DATE" })] }), _jsxs("div", { className: "analytics-content", children: [_jsx("div", { style: { color: '#808d97', fontSize: 9, letterSpacing: '.08em', marginBottom: 7 }, children: "MACHINE UTILIZATION" }), _jsxs("div", { className: "bar-row", children: [_jsx("span", { children: "Active" }), _jsx("div", { className: "bar-bg", children: _jsx("div", { className: "bar-fill", style: { width: `${snapshot.machineUtilization.activePercent}%` } }) }), _jsxs("span", { className: "bar-pct", children: [snapshot.machineUtilization.activePercent.toFixed(1), "%"] })] }), _jsxs("div", { className: "bar-row", children: [_jsx("span", { children: "Idle" }), _jsx("div", { className: "bar-bg", children: _jsx("div", { className: "bar-fill idle", style: { width: `${snapshot.machineUtilization.idlePercent}%` } }) }), _jsxs("span", { className: "bar-pct", children: [snapshot.machineUtilization.idlePercent.toFixed(1), "%"] })] }), _jsx("div", { style: { color: '#808d97', fontSize: 9, letterSpacing: '.08em', margin: '14px 0 7px' }, children: "OPERATOR EFFICIENCY TIME" }), _jsxs("div", { className: "metric-pairs", children: [_jsxs("div", { className: "metric-pair", children: [_jsx("label", { children: "Active" }), _jsx("strong", { "data-testid": "text-efficiency-active", children: fmtTime(snapshot.operatorEfficiency.activeSeconds) })] }), _jsxs("div", { className: "metric-pair", children: [_jsx("label", { children: "Idle" }), _jsx("strong", { "data-testid": "text-efficiency-idle", children: fmtTime(snapshot.operatorEfficiency.idleSeconds) })] })] })] })] })] }), _jsxs("section", { className: "grid components", children: [_jsxs("article", { className: "panel table-panel", "data-testid": "card-recent-components", children: [_jsxs("div", { className: "panel-head", children: [_jsx("h2", { children: "Recent component cycles" }), _jsxs("span", { children: ["LAST ", snapshot.components.length, " COMPLETED"] })] }), _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Component ID" }), _jsx("th", { children: "Cycle duration" }), _jsx("th", { children: "vs avg reference" })] }) }), _jsxs("tbody", { children: [snapshot.components.slice(0, 6).map((part, i) => _jsxs("tr", { className: i === 0 ? 'current-row' : '', "data-testid": `row-component-${part.id}`, children: [_jsx("td", { children: part.id }), _jsxs("td", { children: [part.cycleSeconds.toFixed(1), " sec"] }), _jsxs("td", { style: { color: part.cycleSeconds <= avgComponent ? '#a9d84f' : '#e2bd58' }, children: [part.cycleSeconds - avgComponent > 0 ? '+' : '', (part.cycleSeconds - avgComponent).toFixed(1), " sec"] })] }, part.id)), snapshot.components.length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: 3, children: "No completed component cycles available." }) })] })] }), _jsxs("div", { className: "avg-line", children: ["Reference average ", _jsxs("strong", { "data-testid": "text-reference-average", children: [avgComponent.toFixed(1), " sec"] }), _jsx("span", { className: "backend-note", children: " \u00B7 completed sample" })] })] }), _jsxs("article", { className: "panel", "data-testid": "card-activity-totals", children: [_jsxs("div", { className: "panel-head", children: [_jsx("h2", { children: "Process time summary" }), _jsx("span", { children: "SECONDS PER CYCLE / CUMULATIVE" })] }), _jsx("div", { className: "analytics-content", children: ['polishing', 'transition', 'idle'].map((key, i) => _jsxs("div", { className: "metric-pair", style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0' }, "data-testid": `row-process-${key}`, children: [_jsxs("div", { children: [_jsx("label", { children: ['Polishing / buffing', 'Part transition', 'Idle time'][i] }), _jsxs("span", { style: { color: '#74818a', fontSize: 9 }, children: ["Avg ", snapshot.activityAverageSeconds[key].toFixed(1), " sec / cycle"] })] }), _jsx("strong", { children: fmtTime(snapshot.activityTotalSeconds[key]) })] }, key)) })] })] }), settingsOpen && _jsx("div", { className: "settings-backdrop", role: "presentation", onMouseDown: e => { if (e.target === e.currentTarget)
                    setSettingsOpen(false); }, children: _jsxs("section", { className: "settings-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "settings-heading", "data-testid": "dialog-connection-settings", children: [_jsxs("div", { className: "settings-title", children: [_jsxs("div", { children: [_jsx("div", { className: "section-label", children: "Service configuration" }), _jsx("h2", { id: "settings-heading", children: "Connection settings" })] }), _jsx("button", { className: "icon-button", "aria-label": "Close settings", "data-testid": "button-close-settings", onClick: () => setSettingsOpen(false), children: "\u00D7" })] }), _jsx("p", { className: "form-help", children: "Values are saved in this browser. Live mode reads the configured FastAPI service and listens for WebSocket events. Model inference remains on the backend." }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: "rest-url", children: "REST base URL" }), _jsx("input", { id: "rest-url", "data-testid": "input-rest-url", placeholder: "http://localhost:8000", value: draft.rest, onChange: e => setDraft({ ...draft, rest: e.target.value }) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: "ws-url", children: "WebSocket URL" }), _jsx("input", { id: "ws-url", "data-testid": "input-websocket-url", placeholder: "ws://localhost:8000/ws", value: draft.ws, onChange: e => setDraft({ ...draft, ws: e.target.value }) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: "stream-url", children: "Browser-compatible camera stream URL" }), _jsx("input", { id: "stream-url", "data-testid": "input-camera-url", placeholder: "http://localhost:8000/camera/stream.mjpg", value: draft.stream, onChange: e => setDraft({ ...draft, stream: e.target.value }) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: "stream-type", children: "Stream format" }), _jsxs("select", { id: "stream-type", "data-testid": "select-stream-type", value: draft.streamType, onChange: e => setDraft({ ...draft, streamType: e.target.value }), children: [_jsx("option", { value: "mjpeg", children: "MJPEG image stream" }), _jsx("option", { value: "video", children: "Browser-playable video" })] }), _jsx("span", { className: "form-help", children: "RTSP is not browser-compatible. Use an MJPEG URL or browser-playable video stream." })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "action-btn", "data-testid": "button-cancel-settings", onClick: () => setSettingsOpen(false), children: "Cancel" }), _jsxs("button", { className: "action-btn primary", "data-testid": "button-save-settings", onClick: saveSettings, children: [_jsx(Check, { size: 13, style: { verticalAlign: 'middle', marginRight: 5 } }), "Save settings"] })] })] }) })] }));
}
export default App;
