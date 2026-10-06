import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Camera, Check, Gauge, Settings2, Wifi } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip,
  XAxis, YAxis,
} from 'recharts';

type CycleState = 'Waiting for Part' | 'Part Picked' | 'Polishing' | 'Placement Pending' | 'Output Tray Placed' | 'Placement Confirmed' | 'Cycle Completed';
type Snapshot = {
  producedCount: number; componentsPerHour: number; averageCycleSeconds: number; totalPolishingSeconds: number;
  operator: { presenceSeconds: number; activeSeconds: number; idleSeconds: number; utilizationPercent: number; efficiencyPercent: number };
  currentCycle: { componentId: string | null; state: CycleState; elapsedSeconds: number };
  activityAverageSeconds: { polishing: number; transition: number; idle: number };
  activityTotalSeconds: { polishing: number; transition: number; idle: number };
  machineUtilization: { activePercent: number; idlePercent: number };
  operatorEfficiency: { activeSeconds: number; idleSeconds: number };
  components: Array<{ id: string; cycleSeconds: number }>;
  camera: { connected: boolean; fps: number; timestamp: string; streamUrl?: string };
  yoloRunning: boolean;
  detection?: { className: string; confidence: number; bbox: { x: number; y: number; width: number; height: number } };
};
type Config = { rest: string; ws: string; stream: string; streamType: 'mjpeg' | 'video' };
const configKey = 'polishing-control-config-v1';
const defaultConfig: Config = { rest: '', ws: '', stream: '', streamType: 'mjpeg' };
const initial: Snapshot = {
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
const flow: CycleState[] = ['Part Picked', 'Polishing', 'Placement Pending', 'Output Tray Placed', 'Placement Confirmed', 'Cycle Completed'];
const statusClass = (on: boolean | null) => on === true ? 'ok' : on === false ? 'bad' : 'warn';
const fmtTime = (seconds: number) => `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds % 3600 / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const clockTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

function mergeSnapshot(base: Snapshot, patch: Partial<Snapshot>): Snapshot {
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
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [config, setConfig] = useState<Config>(() => {
    try { return { ...defaultConfig, ...JSON.parse(localStorage.getItem(configKey) || '{}') }; } catch { return defaultConfig; }
  });
  const [draft, setDraft] = useState(config);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);
  const [backend, setBackend] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [cameraError, setCameraError] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const stepCount = useRef(0);

  const updateFromEvent = useCallback((message: { type?: string; data?: Partial<Snapshot> }) => {
    if (!message.data) return;
    if (message.type === 'snapshot') {
      setSnapshot(prev => mergeSnapshot(prev, message.data as Partial<Snapshot>));
      return;
    }
    setSnapshot(prev => {
      let next = mergeSnapshot(prev, message.data as Partial<Snapshot>);
      const eventState: Partial<Record<string, CycleState>> = {
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
    if (mode !== 'demo') return;
    setBackend('disconnected');
    setSnapshot(initial);
    setError('');
    stepCount.current = 0;
    const timer = window.setInterval(() => {
      setNow(new Date());
      stepCount.current += 1;
      setSnapshot(prev => {
        const elapsed = prev.currentCycle.elapsedSeconds + 1;
        let next: Snapshot = {
          ...prev,
          currentCycle: { ...prev.currentCycle, elapsedSeconds: elapsed },
          operator: { ...prev.operator, presenceSeconds: prev.operator.presenceSeconds + 1, activeSeconds: prev.operator.activeSeconds + 1 },
          operatorEfficiency: { ...prev.operatorEfficiency, activeSeconds: prev.operatorEfficiency.activeSeconds + 1 },
          camera: { ...prev.camera, timestamp: new Date().toISOString() },
        };
        if (stepCount.current % 5 === 0) next = { ...next, componentsPerHour: Math.round((47.2 + Math.sin(stepCount.current / 17) * 1.2) * 10) / 10 };
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
          } else {
            const i = flow.indexOf(prev.currentCycle.state);
            const nextState = flow[Math.min(i + 1, flow.length - 1)];
            next = {
              ...next,
              currentCycle: { ...prev.currentCycle, state: nextState, elapsedSeconds: nextState === 'Cycle Completed' ? 0 : elapsed },
            };
            if (nextState === 'Cycle Completed') next.producedCount += 1;
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'live') return;
    let socket: WebSocket | null = null;
    let reconnectTimer = 0;
    let cancelled = false;
    const connect = async () => {
      setBackend('connecting');
      setError('');
      if (!config.rest.trim() || !config.ws.trim()) {
        setBackend('disconnected');
        setError('Configure REST and WebSocket URLs to connect to the FastAPI service.');
      } else {
        try {
          const response = await fetch(`${config.rest.replace(/\/+$/, '')}/status`);
          if (!response.ok) throw new Error(`Status endpoint returned ${response.status}`);
          const result = await response.json() as Snapshot;
          if (!cancelled) { setSnapshot(prev => mergeSnapshot(prev, result)); setBackend('connected'); }
        } catch (e) {
          if (!cancelled) { setBackend('disconnected'); setError(`REST bootstrap failed: ${e instanceof Error ? e.message : 'Unable to reach status endpoint'}`); }
        }
      }
      if (cancelled || !config.ws.trim()) return;
      try {
        socket = new WebSocket(config.ws);
        socket.onopen = () => { if (!cancelled) { setBackend('connected'); setError(''); } };
        socket.onmessage = ev => {
          try { updateFromEvent(JSON.parse(String(ev.data))); } catch { setError('Received an unreadable WebSocket event.'); }
        };
        socket.onerror = () => { if (!cancelled) setBackend('disconnected'); };
        socket.onclose = () => {
          if (!cancelled) {
            setBackend('disconnected');
            reconnectTimer = window.setTimeout(connect, 2500);
          }
        };
      } catch {
        if (!cancelled) { setBackend('disconnected'); reconnectTimer = window.setTimeout(connect, 2500); }
      }
    };
    void connect();
    return () => { cancelled = true; window.clearTimeout(reconnectTimer); socket?.close(); };
  }, [mode, config.rest, config.ws, updateFromEvent]);

  useEffect(() => {
    if (mode !== 'live') return;
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
  const modeChange = (next: 'demo' | 'live') => {
    setMode(next);
    if (next === 'live') { setDraft(config); setSnapshot(prev => ({ ...prev, camera: { ...prev.camera, connected: false } })); }
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

  return (
    <main className="dashboard" data-testid="dashboard-workstation">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Activity size={20} strokeWidth={2.5} /></div>
          <div><div className="brand-name">SURFACE / FINISH</div><div className="brand-sub">Production control · cell 04</div></div>
        </div>
        <div className="top-meta">
          <span className={`mode-pill ${mode}`} data-testid="status-mode"><i className="live-dot" style={{ background: mode === 'demo' ? '#e7c35b' : '#7bbdf1' }} />{mode === 'demo' ? 'DEMO DATA' : 'LIVE SERVICE'}</span>
          <time className="clock" data-testid="text-clock">{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} &nbsp; {clockTime()}</time>
          <div className="head-actions">
            <select className="select-mode" aria-label="Data mode" data-testid="select-data-mode" value={mode} onChange={e => modeChange(e.target.value as 'demo' | 'live')}>
              <option value="demo">Demo</option><option value="live">Live FastAPI</option>
            </select>
            <button className="icon-button" title="Connection settings" aria-label="Open connection settings" data-testid="button-settings" onClick={() => { setDraft(config); setSettingsOpen(true); }}><Settings2 size={16} /></button>
          </div>
        </div>
      </header>

      <div className="machine-line">
        <div>
          <div className="section-label">Active workstation</div>
          <div className="machine-title"><h1>Part Polishing / Buffing</h1><span>STATION · POL-04</span></div>
        </div>
        <div className="connectivity" aria-label="Connection states">
          <div className={`conn ${statusClass(mode === 'demo' ? null : camConnected)}`} data-testid="status-camera"><i className="led" /><Camera size={12} /><b>CAMERA</b><span>{mode === 'demo' ? 'Demo' : camConnected ? 'Connected' : snapshot.camera.connected ? 'Stream offline' : 'Disconnected'}</span></div>
          <div className={`conn ${statusClass(mode === 'demo' ? null : backend === 'connected')}`} data-testid="status-backend"><i className="led" /><Wifi size={12} /><b>BACKEND</b><span>{mode === 'demo' ? 'Demo' : backend === 'connected' ? 'Connected' : backend === 'connecting' ? 'Connecting' : 'Disconnected'}</span></div>
          <div className={`conn ${statusClass(mode === 'demo' ? null : snapshot.yoloRunning)}`} data-testid="status-yolo"><i className="led" /><Gauge size={12} /><b>YOLO MODEL</b><span>{mode === 'demo' ? 'Demo' : snapshot.yoloRunning ? 'Running' : 'Stopped'}</span></div>
        </div>
      </div>
      {mode === 'demo' && <div className="error-banner" style={{ background: '#29271d', borderColor: '#5e5432', color: '#e0ca7e' }} data-testid="notice-demo">DEMO MODE — simulated workstation data. Camera, backend and model are not connected.</div>}
      {error && <div className="error-banner" role="alert" data-testid="notice-live-error">{error}</div>}

      <section className="grid kpi-grid" aria-label="Production KPIs">
        <article className="panel kpi primary" data-testid="kpi-produced"><div className="kpi-title"><span>Total produced</span><span>OUTPUT TRAY</span></div><div className="kpi-value">{snapshot.producedCount.toLocaleString()}<small>parts</small></div><div className="kpi-foot">Component type · Output Tray</div></article>
        <article className="panel kpi" data-testid="kpi-rate"><div className="kpi-title"><span>Throughput</span><span>LIVE RATE</span></div><div className="kpi-value">{snapshot.componentsPerHour.toFixed(1)}<small>parts / hr</small></div><div className="kpi-foot">Current production pace</div></article>
        <article className="panel kpi" data-testid="kpi-cycle"><div className="kpi-title"><span>Average cycle</span><span>PER COMPONENT</span></div><div className="kpi-value">{snapshot.averageCycleSeconds.toFixed(1)}<small>sec</small></div><div className="kpi-foot">Target reference · 75.0 sec</div></article>
        <article className="panel kpi" data-testid="kpi-polishing"><div className="kpi-title"><span>Total polishing time</span><span>CUMULATIVE</span></div><div className="kpi-value">{fmtTime(snapshot.totalPolishingSeconds)}<small>hh:mm:ss</small></div><div className="kpi-foot">Active buffing duration</div></article>
      </section>

      <section className="grid main-grid">
        <article className="panel cycle-panel" data-testid="card-current-cycle">
          <div className="panel-head"><h2>Current cycle</h2><span>SEQUENCE STATUS</span></div>
          <div className="cycle-status">
            <div><div className="cycle-state" data-testid="text-cycle-state">{cycleLabel}</div><div className="cycle-id" data-testid="text-component-id">{snapshot.currentCycle.componentId || 'Awaiting component'}</div></div>
            <div className="cycle-clock" data-testid="text-cycle-elapsed">{fmtTime(snapshot.currentCycle.elapsedSeconds)}<small> elapsed</small></div>
          </div>
          <div className="progress-track" data-testid="cycle-progression">{states.map((s, i) => <div key={s} className={`step ${i < stageIndex ? 'done' : i === stageIndex ? 'active' : ''}`} data-testid={`step-cycle-${i}`}>{s}</div>)}</div>
          <div className="cycle-foot"><span>Cycle state</span><strong>{cycleLabel}</strong></div>
          <div className="cycle-foot" style={{ marginTop: 5 }}><span>Elapsed cycle time</span><strong>{snapshot.currentCycle.elapsedSeconds.toFixed(0)} sec</strong></div>
        </article>

        <article className="panel" data-testid="card-operator">
          <div className="panel-head"><h2>Operator status</h2><span>SHIFT TO DATE</span></div>
          <div className="analytics-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
              <div><div style={{ color: '#87939c', fontSize: 9, letterSpacing: '.08em' }}>OPERATOR PRESENCE</div><div className="kpi-value" style={{ fontSize: 30, marginTop: 5 }} data-testid="text-presence">{fmtTime(snapshot.operator.presenceSeconds)}<small>h:m:s</small></div></div>
              <div style={{ textAlign: 'right' }}><div style={{ color: '#87939c', fontSize: 9 }}>UTILIZATION</div><div className="kpi-value" style={{ fontSize: 32, marginTop: 5, color: '#b8df67' }} data-testid="text-operator-utilization">{snapshot.operator.utilizationPercent.toFixed(1)}<small>%</small></div></div>
            </div>
            <div className="metric-pairs">
              <div className="metric-pair"><label>Active time</label><strong data-testid="text-operator-active">{fmtTime(snapshot.operator.activeSeconds)}</strong></div>
              <div className="metric-pair"><label>Idle time</label><strong data-testid="text-operator-idle">{fmtTime(snapshot.operator.idleSeconds)}</strong></div>
              <div className="metric-pair"><label>Efficiency</label><strong data-testid="text-operator-efficiency">{snapshot.operator.efficiencyPercent.toFixed(1)}<em>%</em></strong></div>
              <div className="metric-pair"><label>Presence</label><strong>{fmtTime(snapshot.operator.presenceSeconds)}</strong></div>
            </div>
          </div>
        </article>

        <article className="panel cam-panel" data-testid="card-camera">
          <div className="panel-head"><h2>Inspection camera</h2><span>{mode === 'demo' ? 'NO FEED' : camConnected ? 'STREAM ACTIVE' : 'NO SIGNAL'}</span></div>
          <div className="camera-frame">
            {mode === 'live' && camUrl && !cameraError && config.streamType === 'mjpeg' && <img src={camUrl} alt="Live workstation camera stream" onLoad={() => { setStreamReady(true); setCameraError(false); }} onError={() => { setCameraError(true); setStreamReady(false); }} />}
            {mode === 'live' && camUrl && !cameraError && config.streamType === 'video' && <video src={camUrl} autoPlay muted playsInline onCanPlay={() => { setStreamReady(true); setCameraError(false); }} onError={() => { setCameraError(true); setStreamReady(false); }} />}
            {(mode === 'demo' || !camUrl || cameraError || !streamReady) && <div className="camera-placeholder"><Camera size={24} strokeWidth={1.3} /><strong>{mode === 'demo' ? 'DEMO — CAMERA NOT CONNECTED' : cameraError ? 'STREAM OFFLINE' : 'WAITING FOR CAMERA STREAM'}</strong><span>{mode === 'demo' ? 'No simulated camera feed' : camUrl ? 'Verify browser-compatible stream URL' : 'Set a browser-playable stream in settings'}</span></div>}
            <div className="cam-corner"><span className={`cam-live ${mode === 'live' && camConnected ? 'is-live' : ''}`}>{mode === 'live' && camConnected ? 'LIVE' : 'OFFLINE'}</span> POL-04 · VIEW 01</div>
            <div className="cam-right">{snapshot.camera.fps.toFixed(1)} FPS</div>
            {mode === 'live' && camConnected && snapshot.detection && <div className="camera-overlay" data-testid="overlay-detection"><div className="det-box" style={{ left: `${Math.max(0, snapshot.detection.bbox.x) * 100}%`, top: `${Math.max(0, snapshot.detection.bbox.y) * 100}%`, width: `${Math.min(1, snapshot.detection.bbox.width) * 100}%`, height: `${Math.min(1, snapshot.detection.bbox.height) * 100}%` }}><span className="det-label">{snapshot.detection.className} · {(snapshot.detection.confidence * 100).toFixed(1)}%</span></div></div>}
          </div>
          <div className="cam-foot"><span data-testid="text-camera-timestamp">{mode === 'demo' ? 'DEMO · NO CAMERA TIMESTAMP' : snapshot.camera.timestamp || 'Timestamp unavailable'}</span><span className="cam-process" data-testid="status-camera-process">PROCESS · {cycleLabel}</span><span>{mode === 'demo' && snapshot.detection ? `SAMPLE · ${snapshot.detection.className} ${(snapshot.detection.confidence * 100).toFixed(1)}%` : snapshot.detection ? `${snapshot.detection.className} ${(snapshot.detection.confidence * 100).toFixed(1)}%` : 'No detection'}</span></div>
        </article>
      </section>

      <section className="grid analytics-grid" aria-label="Production analytics">
        <article className="panel analytics" data-testid="card-cycle-trend">
          <div className="panel-head"><h2>Production rate</h2><span>COMPONENTS / HOUR</span></div>
          <div className="analytics-content">
            <div className="legend-row"><span><i className="legend-dot" style={{ background: '#a9d84f' }} />Current pace</span><span>Shift trend · today</span></div>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}><defs><linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a9d84f" stopOpacity={.22} /><stop offset="100%" stopColor="#a9d84f" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#29333c" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="t" tick={{ fill: '#73808a', fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 60]} tick={{ fill: '#73808a', fontSize: 9 }} axisLine={false} tickLine={false} /><ChartTooltip contentStyle={{ background: '#202931', border: '1px solid #46525b', borderRadius: 3, fontSize: 10 }} labelStyle={{ color: '#c9d1d5' }} /><Area type="monotone" dataKey="output" stroke="#b3df64" strokeWidth={2} fill="url(#rateFill)" dot={false} activeDot={{ r: 3, fill: '#c7eb82' }} /></AreaChart></ResponsiveContainer></div>
          </div>
        </article>
        <article className="panel analytics" data-testid="card-activity-duration">
          <div className="panel-head"><h2>Activity duration</h2><span>AVERAGE / TOTAL</span></div>
          <div className="analytics-content">
            <div className="legend-row"><span><i className="legend-dot" style={{ background: '#61b9df' }} />Avg. seconds per cycle</span><span><i className="legend-dot" style={{ background: '#485661' }} />Total minutes</span></div>
            {data.map((d, i) => <div className="bar-row" key={d.name} data-testid={`metric-activity-${d.name.toLowerCase()}`}><span>{d.name}</span><div className="bar-bg"><div className="bar-fill" style={{ width: `${Math.min(d.avg / 60 * 100, 100)}%`, background: ['#61b9df', '#e0bb5e', '#697985'][i] }} /></div><span className="bar-pct">{d.avg.toFixed(1)}s</span></div>)}
            <div style={{ borderTop: '1px solid #2b353e', marginTop: 11, paddingTop: 8, display: 'flex', justifyContent: 'space-between', color: '#7f8b94', fontSize: 9 }}>TOTAL TIME <span style={{ color: '#ccd4d8', fontFamily: 'var(--app-font-mono)' }}>{fmtTime(snapshot.activityTotalSeconds.polishing + snapshot.activityTotalSeconds.transition + snapshot.activityTotalSeconds.idle)}</span></div>
          </div>
        </article>
        <article className="panel analytics" data-testid="card-utilization">
          <div className="panel-head"><h2>Utilization & efficiency</h2><span>SHIFT TO DATE</span></div>
          <div className="analytics-content">
            <div style={{ color: '#808d97', fontSize: 9, letterSpacing: '.08em', marginBottom: 7 }}>MACHINE UTILIZATION</div>
            <div className="bar-row"><span>Active</span><div className="bar-bg"><div className="bar-fill" style={{ width: `${snapshot.machineUtilization.activePercent}%` }} /></div><span className="bar-pct">{snapshot.machineUtilization.activePercent.toFixed(1)}%</span></div>
            <div className="bar-row"><span>Idle</span><div className="bar-bg"><div className="bar-fill idle" style={{ width: `${snapshot.machineUtilization.idlePercent}%` }} /></div><span className="bar-pct">{snapshot.machineUtilization.idlePercent.toFixed(1)}%</span></div>
            <div style={{ color: '#808d97', fontSize: 9, letterSpacing: '.08em', margin: '14px 0 7px' }}>OPERATOR EFFICIENCY TIME</div>
            <div className="metric-pairs"><div className="metric-pair"><label>Active</label><strong data-testid="text-efficiency-active">{fmtTime(snapshot.operatorEfficiency.activeSeconds)}</strong></div><div className="metric-pair"><label>Idle</label><strong data-testid="text-efficiency-idle">{fmtTime(snapshot.operatorEfficiency.idleSeconds)}</strong></div></div>
          </div>
        </article>
      </section>

      <section className="grid components">
        <article className="panel table-panel" data-testid="card-recent-components">
          <div className="panel-head"><h2>Recent component cycles</h2><span>LAST {snapshot.components.length} COMPLETED</span></div>
          <table className="table"><thead><tr><th>Component ID</th><th>Cycle duration</th><th>vs avg reference</th></tr></thead><tbody>
            {snapshot.components.slice(0, 6).map((part, i) => <tr key={part.id} className={i === 0 ? 'current-row' : ''} data-testid={`row-component-${part.id}`}><td>{part.id}</td><td>{part.cycleSeconds.toFixed(1)} sec</td><td style={{ color: part.cycleSeconds <= avgComponent ? '#a9d84f' : '#e2bd58' }}>{part.cycleSeconds - avgComponent > 0 ? '+' : ''}{(part.cycleSeconds - avgComponent).toFixed(1)} sec</td></tr>)}
            {snapshot.components.length === 0 && <tr><td colSpan={3}>No completed component cycles available.</td></tr>}
          </tbody></table>
          <div className="avg-line">Reference average <strong data-testid="text-reference-average">{avgComponent.toFixed(1)} sec</strong><span className="backend-note"> · completed sample</span></div>
        </article>
        <article className="panel" data-testid="card-activity-totals">
          <div className="panel-head"><h2>Process time summary</h2><span>SECONDS PER CYCLE / CUMULATIVE</span></div>
          <div className="analytics-content">
            {(['polishing', 'transition', 'idle'] as const).map((key, i) => <div className="metric-pair" key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0' }} data-testid={`row-process-${key}`}><div><label>{['Polishing / buffing', 'Part transition', 'Idle time'][i]}</label><span style={{ color: '#74818a', fontSize: 9 }}>Avg {snapshot.activityAverageSeconds[key].toFixed(1)} sec / cycle</span></div><strong>{fmtTime(snapshot.activityTotalSeconds[key])}</strong></div>)}
          </div>
        </article>
      </section>

      {settingsOpen && <div className="settings-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
        <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-heading" data-testid="dialog-connection-settings">
          <div className="settings-title"><div><div className="section-label">Service configuration</div><h2 id="settings-heading">Connection settings</h2></div><button className="icon-button" aria-label="Close settings" data-testid="button-close-settings" onClick={() => setSettingsOpen(false)}>×</button></div>
          <p className="form-help">Values are saved in this browser. Live mode reads the configured FastAPI service and listens for WebSocket events. Model inference remains on the backend.</p>
          <div className="form-row"><label htmlFor="rest-url">REST base URL</label><input id="rest-url" data-testid="input-rest-url" placeholder="http://localhost:8000" value={draft.rest} onChange={e => setDraft({ ...draft, rest: e.target.value })} /></div>
          <div className="form-row"><label htmlFor="ws-url">WebSocket URL</label><input id="ws-url" data-testid="input-websocket-url" placeholder="ws://localhost:8000/ws" value={draft.ws} onChange={e => setDraft({ ...draft, ws: e.target.value })} /></div>
          <div className="form-row"><label htmlFor="stream-url">Browser-compatible camera stream URL</label><input id="stream-url" data-testid="input-camera-url" placeholder="http://localhost:8000/camera/stream.mjpg" value={draft.stream} onChange={e => setDraft({ ...draft, stream: e.target.value })} /></div>
          <div className="form-row"><label htmlFor="stream-type">Stream format</label><select id="stream-type" data-testid="select-stream-type" value={draft.streamType} onChange={e => setDraft({ ...draft, streamType: e.target.value as Config['streamType'] })}><option value="mjpeg">MJPEG image stream</option><option value="video">Browser-playable video</option></select><span className="form-help">RTSP is not browser-compatible. Use an MJPEG URL or browser-playable video stream.</span></div>
          <div className="modal-actions"><button className="action-btn" data-testid="button-cancel-settings" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="action-btn primary" data-testid="button-save-settings" onClick={saveSettings}><Check size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />Save settings</button></div>
        </section>
      </div>}
    </main>
  );
}

export default App;
