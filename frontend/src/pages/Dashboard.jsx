import { useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  ChevronDown,
  CirclePause,
  CirclePlay,
  Cpu,
  Gauge,
  LogOut,
  BrainCircuit,
  Search,
  Target,
  Clock3,
  ActivitySquare,
  Database,
  Radio,
  RefreshCw,
  RotateCcw,
  Settings2,
  Shield,
  SkipForward,
  Waves,
} from "lucide-react";

import "../dashboard.css";
import "../live_scan.css";
import "../rf_environment.css";
import "../knowledge_map.css";
import "../performance.css";
import { useAuth } from "../context/AuthContext";
import simulationService from "../services/simulationService";

const SCHEDULERS = [
  "Sequential",
  "Random",
  "Round Robin",
  "Greedy",
  "Knowledge-Aware",
];

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Activity,
  },
  {
    id: "live-scan",
    label: "Live Scan",
    icon: Radio,
  },
  {
    id: "rf-environment",
    label: "RF Environment",
    icon: Waves,
  },
  {
    id: "knowledge-map",
    label: "Knowledge Map",
    icon: Cpu,
  },
  {
    id: "performance",
    label: "Performance",
    icon: Gauge,
  },
];

const EMPTY_METRICS = {
  pd: 0,
  pfa: 0,
  eventRate: 0,
  hits: 0,
  misses: 0,
  falseAlarms: 0,
  interceptedEvents: 0,
  totalEvents: 0,
};

const EMITTER_TYPES = [
  {
    key: "continuous",
    label: "Continuous",
    shortLabel: "CONT",
    symbol: "C",
    color: "#38bdf8",
  },
  {
    key: "periodic",
    label: "Periodic",
    shortLabel: "PER",
    symbol: "P",
    color: "#34d399",
  },
  {
    key: "intermittent",
    label: "Intermittent",
    shortLabel: "INT",
    symbol: "I",
    color: "#f59e0b",
  },
  {
    key: "frequency_agile",
    label: "Frequency Agile",
    shortLabel: "AGILE",
    symbol: "A",
    color: "#c084fc",
  },
];

const TYPE_MAP = Object.fromEntries(
  EMITTER_TYPES.map((item) => [item.key, item])
);

const BAND_COUNT = 20;

function normalizeMetrics(backendMetrics = {}) {
  return {
    pd: (backendMetrics.pd ?? 0) * 100,
    pfa: (backendMetrics.pfa ?? 0) * 100,
    eventRate:
      (backendMetrics.event_detection_rate ?? 0) * 100,
    hits: backendMetrics.hits ?? 0,
    misses: backendMetrics.misses ?? 0,
    falseAlarms: backendMetrics.false_alarms ?? 0,
    interceptedEvents:
      backendMetrics.intercepted_events ?? 0,
    totalEvents: backendMetrics.total_events ?? 0,
  };
}

function getEmitterKey(emitterType) {
  const normalized = String(
    emitterType || ""
  )
    .toLowerCase()
    .trim();

  if (normalized === "frequency-agile") {
    return "frequency_agile";
  }

  if (
    normalized === "frequency agile" ||
    normalized === "frequency_agile"
  ) {
    return "frequency_agile";
  }

  if (TYPE_MAP[normalized]) {
    return normalized;
  }

  return "unknown";
}

function getEmitterMeta(emitterType) {
  return (
    TYPE_MAP[getEmitterKey(emitterType)] || {
      key: "unknown",
      label: "Unknown",
      shortLabel: "UNKNOWN",
      symbol: "?",
      color: "#94a3b8",
    }
  );
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined) {
    return "--";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "--";
  }

  return numeric.toFixed(digits);
}

export default function Dashboard() {
  const { user, logout } = useAuth();

  const [activePage, setActivePage] = useState("dashboard");

  const [isRunning, setIsRunning] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [simulationTime, setSimulationTime] = useState(0);
  const [totalTimeSlots, setTotalTimeSlots] = useState(1000);

  const [currentBand, setCurrentBand] = useState(null);
  const [previousBand, setPreviousBand] = useState(null);
  const currentBandRef = useRef(null);

  const [scanResult, setScanResult] = useState("READY");

  const [scheduler, setScheduler] = useState(
    "Knowledge-Aware"
  );

  const [speed, setSpeed] = useState(1);

  const [scenarioSeed, setScenarioSeed] = useState(10001);
  const [emitterCount, setEmitterCount] = useState(8);

  const [metrics, setMetrics] = useState(
    EMPTY_METRICS
  );

  const [simulationData, setSimulationData] =
    useState(null);

  const [scanHistory, setScanHistory] =
    useState([]);

  const [systemMessage, setSystemMessage] = useState(
    "Simulation ready. Start a scenario to begin scanning."
  );

  const recordScan = (state) => {
    const scan = state?.latest_scan;

    if (!scan) {
      return;
    }

    const entry = {
      time_slot:
        Number(scan?.time_slot ?? 0),
      band:
        Number(scan?.band ?? 0),
      result:
        String(scan?.result ?? "UNKNOWN"),
      detected:
        Boolean(scan?.detected),
      false_alarm:
        Boolean(scan?.false_alarm),
      scan_duration:
        Number(scan?.scan_duration ?? 0),
    };

    setScanHistory((previous) => {
      const last = previous[previous.length - 1];

      if (
        last &&
        last.time_slot === entry.time_slot &&
        last.band === entry.band
      ) {
        return [
          ...previous.slice(0, -1),
          entry,
        ];
      }

      return [...previous, entry].slice(-100);
    });
  };

  const syncState = (state) => {
    if (!state) {
      return;
    }

    setSimulationData(state);

    setSimulationTime(
      state?.receiver?.current_time ??
        state?.spectrum?.time_slot ??
        0
    );

    setTotalTimeSlots(
      state?.scenario?.num_time_slots ??
        totalTimeSlots
    );

    setScenarioSeed(
      state?.scenario?.seed ?? scenarioSeed
    );

    setEmitterCount(
      state?.scenario?.num_emitters ??
        emitterCount
    );

    setScheduler(
      state?.scheduler?.name ?? scheduler
    );

    const nextBand =
      state?.latest_scan?.band ??
      state?.receiver?.current_band ??
      null;

    setCurrentBand(nextBand);
    currentBandRef.current = nextBand;

    setScanResult(
      state?.latest_scan?.result ?? "READY"
    );

    setMetrics(
      normalizeMetrics(state?.metrics)
    );
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialState = async () => {
      try {
        const state =
          await simulationService.getState();

        if (cancelled || !state) {
          return;
        }

        syncState(state);

        if (state?.status?.initialized) {
          setInitialized(true);
        }
      } catch (error) {
        console.info(
          "No initial simulation state available yet.",
          error
        );
      }
    };

    loadInitialState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;

    const runStep = async () => {
      try {
        const state =
          await simulationService.step();

        if (cancelled || !state) {
          return;
        }

        const nextBand =
          state?.latest_scan?.band ??
          state?.receiver?.current_band ??
          null;

        setPreviousBand(
          currentBandRef.current
        );

        currentBandRef.current = nextBand;

        setCurrentBand(nextBand);

        setSimulationData(state);
        recordScan(state);

        const nextTime =
          state?.receiver?.current_time ??
          state?.spectrum?.time_slot ??
          0;

        setSimulationTime(nextTime);

        setTotalTimeSlots(
          state?.scenario?.num_time_slots ??
            totalTimeSlots
        );

        setScenarioSeed(
          state?.scenario?.seed ??
            scenarioSeed
        );

        setEmitterCount(
          state?.scenario?.num_emitters ??
            emitterCount
        );

        setScheduler(
          state?.scheduler?.name ?? scheduler
        );

        const latestResult =
          state?.latest_scan?.result ??
          "SCANNING";

        setScanResult(latestResult);

        setMetrics(
          normalizeMetrics(state?.metrics)
        );

        if (
          nextTime >=
          (state?.scenario?.num_time_slots ??
            totalTimeSlots)
        ) {
          setIsRunning(false);
          setScanResult("COMPLETED");
          setSystemMessage(
            "Simulation completed."
          );
          return;
        }

        setSystemMessage(
          `Band ${String(nextBand).padStart(
            2,
            "0"
          )} scanned — ${latestResult}.`
        );

        if (!cancelled) {
          timeoutId = window.setTimeout(
            runStep,
            Math.max(150, 1000 / speed)
          );
        }
      } catch (error) {
        console.error(
          "Simulation step failed:",
          error
        );

        if (!cancelled) {
          setIsRunning(false);
          setScanResult("ERROR");
          setSystemMessage(
            "Simulation API error. Check the FastAPI server."
          );
        }
      }
    };

    runStep();

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isRunning, speed]);

  const handleStart = async () => {
    try {
      if (!initialized) {
        const state =
          await simulationService.start();

        syncState(state);
        setInitialized(true);
      }

      setIsRunning(true);
      setScanResult("SCANNING");

      setSystemMessage(
        `Running ${scheduler} scheduler on scenario ${scenarioSeed}.`
      );
    } catch (error) {
      console.error(
        "Failed to start simulation:",
        error
      );

      setIsRunning(false);
      setScanResult("ERROR");
      setSystemMessage(
        "Unable to start simulation. Check the FastAPI server."
      );
    }
  };

  const handlePause = async () => {
    try {
      const state =
        await simulationService.pause();

      if (state) {
        syncState(state);
      }
    } catch (error) {
      console.error(
        "Pause request failed:",
        error
      );
    }

    setIsRunning(false);
    setScanResult("PAUSED");

    setSystemMessage(
      "Simulation paused. Resume or step through the scan."
    );
  };

  const handleStep = async () => {
    try {
      if (!initialized) {
        const initialState =
          await simulationService.start();

        syncState(initialState);
        setInitialized(true);
      }

      const state =
        await simulationService.step();

      if (!state) {
        return;
      }

      const nextBand =
        state?.latest_scan?.band ??
        state?.receiver?.current_band ??
        null;

      setPreviousBand(
        currentBandRef.current
      );

      currentBandRef.current = nextBand;

      setCurrentBand(nextBand);

      setSimulationData(state);
      recordScan(state);

      setSimulationTime(
        state?.receiver?.current_time ??
          state?.spectrum?.time_slot ??
          0
      );

      setTotalTimeSlots(
        state?.scenario?.num_time_slots ??
          totalTimeSlots
      );

      setScenarioSeed(
        state?.scenario?.seed ?? scenarioSeed
      );

      setEmitterCount(
        state?.scenario?.num_emitters ??
          emitterCount
      );

      setScheduler(
        state?.scheduler?.name ?? scheduler
      );

      const result =
        state?.latest_scan?.result ??
        "OBSERVING";

      setScanResult(result);

      setMetrics(
        normalizeMetrics(state?.metrics)
      );

      setSystemMessage(
        `Step executed. Band ${String(
          nextBand
        ).padStart(2, "0")} → ${result}.`
      );
    } catch (error) {
      console.error(
        "Simulation step failed:",
        error
      );

      setScanResult("ERROR");
      setSystemMessage(
        "Step failed. Check the FastAPI server."
      );
    }
  };

  const handleReset = async () => {
    setIsRunning(false);
    setInitialized(false);

    try {
      const state =
        await simulationService.reset();

      if (state) {
        syncState(state);
      } else {
        const refreshed =
          await simulationService.getState();

        syncState(refreshed);
      }
    } catch (error) {
      console.error(
        "Reset request failed:",
        error
      );
    }

    currentBandRef.current = null;

    setSimulationTime(0);
    setPreviousBand(null);
    setCurrentBand(null);
    setScanResult("READY");
    setMetrics(EMPTY_METRICS);
    setSimulationData(null);
    setScanHistory([]);

    setSystemMessage(
      "Simulation reset. Ready for a new run."
    );
  };

  const handleRandomizeScenario = async () => {
    setIsRunning(false);

    const localSeed =
      Math.floor(Math.random() * 90000) +
      10000;

    try {
      await simulationService.randomizeScenario();

      const state =
        await simulationService.getState();

      if (state) {
        syncState(state);
        setInitialized(
          Boolean(state?.status?.initialized)
        );

        setSystemMessage(
          `New simulation scenario prepared: ${
            state?.scenario?.seed ?? localSeed
          }.`
        );
      }
    } catch (error) {
      console.error(
        "Scenario randomization failed:",
        error
      );

      setScenarioSeed(localSeed);
      setSimulationTime(0);
      setPreviousBand(null);
      setCurrentBand(null);
      currentBandRef.current = null;
      setScanResult("READY");
      setMetrics(EMPTY_METRICS);
      setSimulationData(null);
      setScanHistory([]);
      setInitialized(false);

      setSystemMessage(
        `New simulation scenario prepared: ${localSeed}.`
      );
    }
  };

  const handleSchedulerChange = async (event) => {
    const nextScheduler =
      event.target.value;

    setIsRunning(false);
    setScheduler(nextScheduler);
    setScanResult("READY");

    try {
      const state =
        await simulationService.setScheduler(
          nextScheduler
        );

      if (state) {
        syncState(state);
      } else {
        const refreshed =
          await simulationService.getState();

        if (refreshed) {
          syncState(refreshed);
        }
      }

      setSystemMessage(
        `${nextScheduler} scheduler selected.`
      );
    } catch (error) {
      console.error(
        "Scheduler update failed:",
        error
      );

      setSystemMessage(
        `Unable to change scheduler to ${nextScheduler}.`
      );
    }
  };

  const formatBand = (band) => {
    if (
      band === null ||
      band === undefined
    ) {
      return "--";
    }

    return String(band).padStart(2, "0");
  };

  const systemProgress =
    totalTimeSlots > 0
      ? Math.min(
          100,
          (simulationTime /
            totalTimeSlots) *
            100
        )
      : 0;

  const spectrumBands = useMemo(() => {
    const bands =
      simulationData?.spectrum?.bands;

    if (Array.isArray(bands)) {
      return bands;
    }

    return Array.from(
      { length: BAND_COUNT },
      (_, band) => ({
        band,
        active: false,
        emitters: [],
      })
    );
  }, [simulationData]);

  const spectrumHistory = useMemo(() => {
    const history =
      simulationData?.spectrum?.history;

    return Array.isArray(history)
      ? history.slice(-60)
      : [];
  }, [simulationData]);

  const knowledgeRows = useMemo(() => {
    const map =
      simulationData?.knowledge_map;

    if (!Array.isArray(map)) {
      return [];
    }

    return [...map]
      .sort((a, b) => {
        const scoreA =
          Number(
            a?.periodic_due_score ?? 0
          ) +
          Number(
            a?.activity_probability ?? 0
          ) *
            0.5;

        const scoreB =
          Number(
            b?.periodic_due_score ?? 0
          ) +
          Number(
            b?.activity_probability ?? 0
          ) *
            0.5;

        return scoreB - scoreA;
      })
      .slice(0, 8);
  }, [simulationData]);

  const activeTypeKeys = useMemo(() => {
    const keys = new Set();

    spectrumBands.forEach((band) => {
      (band?.emitters || []).forEach(
        (emitter) => {
          const key = getEmitterKey(
            emitter?.type
          );

          if (key !== "unknown") {
            keys.add(key);
          }
        }
      );
    });

    return keys;
  }, [spectrumBands]);

  const activeBandData =
    spectrumBands.find(
      (item) =>
        Number(item?.band) ===
        Number(currentBand)
    );

  const activeEmitterTypes = [
    ...new Set(
      (activeBandData?.emitters || []).map(
        (emitter) =>
          getEmitterMeta(
            emitter?.type
          ).label
      )
    ),
  ];

  const currentEmitter =
    activeBandData?.emitters?.[0];

  const currentEmitterMeta =
    getEmitterMeta(
      currentEmitter?.type
    );

  const spectrumBandsForPage = spectrumBands;

  return (
    <div className="spectra-dashboard">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Radio size={20} />
          </div>

          <div>
            <div className="sidebar-brand-name">
              SPECTRA SHAKTI
            </div>

            <div className="sidebar-brand-subtitle">
              SMART SCAN SYSTEM
            </div>
          </div>
        </div>

        <div className="sidebar-section-label">
          CONTROL CENTER
        </div>

        <nav className="dashboard-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`dashboard-nav-item ${
                  isActive ? "active" : ""
                }`}
                onClick={() =>
                  setActivePage(item.id)
                }
              >
                <Icon size={17} />
                <span>{item.label}</span>

                {isActive && (
                  <span className="nav-active-marker" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-system-card">
          <div className="sidebar-system-header">
            <span className="system-dot" />
            SYSTEM ONLINE
          </div>

          <div className="sidebar-system-row">
            <span>Environment</span>
            <strong>SIMULATION</strong>
          </div>

          <div className="sidebar-system-row">
            <span>RF Bands</span>
            <strong>
              {simulationData?.scenario
                ?.num_bands ?? BAND_COUNT}
            </strong>
          </div>

          <div className="sidebar-system-row">
            <span>Emitters</span>
            <strong>{emitterCount}</strong>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={logout}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <div className="topbar-kicker">
              ELECTRONIC WARFARE / SMART SCAN
            </div>

            <h1>
              {activePage === "dashboard"
                ? "Operational Dashboard"
                : NAV_ITEMS.find(
                    (item) =>
                      item.id ===
                      activePage
                  )?.label}
            </h1>
          </div>

          <div className="topbar-right">
            <div className="topbar-user">
              <div className="user-avatar">
                {user?.name
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </div>

              <div>
                <strong>
                  {user?.name || "Operator"}
                </strong>

                <span>
                  {user?.role ||
                    "EW Analyst / Operator"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {activePage === "live-scan" ? (
            <LiveScanPage
              simulationData={simulationData}
              scanHistory={scanHistory}
              simulationTime={simulationTime}
              currentBand={currentBand}
              previousBand={previousBand}
              scheduler={scheduler}
              isRunning={isRunning}
              metrics={metrics}
              systemMessage={systemMessage}
              formatBand={formatBand}
              totalTimeSlots={totalTimeSlots}
            />
          ) : activePage === "rf-environment" ? (
            <RfEnvironmentPage
              simulationData={simulationData}
              spectrumBands={spectrumBandsForPage}
              simulationTime={simulationTime}
              currentBand={currentBand}
              emitterCount={emitterCount}
              scenarioSeed={scenarioSeed}
              formatBand={formatBand}
            />
          ) : activePage === "knowledge-map" ? (
            <KnowledgeMapPage
              simulationData={simulationData}
              simulationTime={simulationTime}
              currentBand={currentBand}
              scheduler={scheduler}
              formatBand={formatBand}
            />
          ) : activePage === "performance" ? (
            <PerformancePage
              simulationData={simulationData}
              simulationTime={simulationTime}
              totalTimeSlots={totalTimeSlots}
              currentBand={currentBand}
              scheduler={scheduler}
              metrics={metrics}
              scanHistory={scanHistory}
              systemProgress={systemProgress}
            />
          ) : (
            <>
          <section className="status-strip">
            <div className="status-strip-item">
              <span className="strip-label">
                SYSTEM
              </span>

              <strong className="online-text">
                <span className="system-dot" />
                ONLINE
              </strong>
            </div>

            <div className="status-divider" />

            <div className="status-strip-item">
              <span className="strip-label">
                SCAN ENGINE
              </span>

              <strong>{scheduler}</strong>
            </div>

            <div className="status-divider" />

            <div className="status-strip-item">
              <span className="strip-label">
                SIMULATION
              </span>

              <strong>
                {String(
                  simulationTime
                ).padStart(4, "0")}
                /{totalTimeSlots}
              </strong>
            </div>

            <div className="status-divider" />

            <div className="status-strip-item">
              <span className="strip-label">
                OPERATOR
              </span>

              <strong>
                {user?.name || "Unknown"}
              </strong>
            </div>
          </section>

          <section className="control-panel">
            <div className="control-panel-left">
              <div className="control-group">
                <span className="control-label">
                  SCHEDULER
                </span>

                <div className="select-wrapper">
                  <select
                    value={scheduler}
                    onChange={
                      handleSchedulerChange
                    }
                  >
                    {SCHEDULERS.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={14}
                  />
                </div>
              </div>

              <div className="control-group">
                <span className="control-label">
                  SPEED
                </span>

                <div className="speed-controls">
                  {[1, 2, 5, 10].map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        className={
                          speed === value
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setSpeed(value)
                        }
                      >
                        {value}x
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="control-group scenario-control">
                <span className="control-label">
                  SCENARIO
                </span>

                <strong>
                  #{scenarioSeed}
                </strong>

                <button
                  type="button"
                  className="icon-control"
                  onClick={
                    handleRandomizeScenario
                  }
                  title="Randomize scenario"
                >
                  <RefreshCw
                    size={14}
                  />
                </button>
              </div>
            </div>

            <div className="control-panel-right">
              <button
                type="button"
                className="control-button primary"
                onClick={handleStart}
                disabled={isRunning}
              >
                <CirclePlay size={16} />
                Start
              </button>

              <button
                type="button"
                className="control-button"
                onClick={handlePause}
                disabled={!isRunning}
              >
                <CirclePause size={16} />
                Pause
              </button>

              <button
                type="button"
                className="control-button"
                onClick={handleStep}
                disabled={
                  isRunning ||
                  simulationTime >=
                    totalTimeSlots
                }
              >
                <SkipForward size={16} />
                Step
              </button>

              <button
                type="button"
                className="control-button"
                onClick={handleReset}
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </div>
          </section>

          <section className="metric-grid">
            <MetricCard
              label="PROBABILITY OF DETECTION"
              value={`${metrics.pd.toFixed(
                1
              )}%`}
              icon={<Shield size={18} />}
            />

            <MetricCard
              label="FALSE ALARM RATE"
              value={`${metrics.pfa.toFixed(
                1
              )}%`}
              icon={<Activity size={18} />}
            />

            <MetricCard
              label="EVENT DETECTION RATE"
              value={`${metrics.eventRate.toFixed(
                1
              )}%`}
              icon={<Radio size={18} />}
            />

            <MetricCard
              label="INTERCEPTED EVENTS"
              value={`${metrics.interceptedEvents}/${metrics.totalEvents}`}
              icon={<Gauge size={18} />}
            />
          </section>

          <section className="dashboard-grid">
            <div className="panel spectrum-panel">
              <PanelHeader
                title="LIVE RF SPECTRUM"
                subtitle="Real-time activity from the RF simulation"
              />

              <div className="spectrum-meta">
                <div>
                  <span>TIME</span>
                  <strong>
                    T+
                    {String(
                      simulationTime
                    ).padStart(4, "0")}
                  </strong>
                </div>

                <div>
                  <span>ACTIVE SCAN</span>
                  <strong>
                    BAND{" "}
                    {formatBand(
                      currentBand
                    )}
                  </strong>
                </div>

                <div>
                  <span>STATUS</span>
                  <strong className="scan-status">
                    {scanResult}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  margin: "0 0 12px",
                }}
              >
                {EMITTER_TYPES.map(
                  (type) => (
                    <div
                      key={type.key}
                      title={type.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing:
                          "0.08em",
                        textTransform:
                          "uppercase",
                        color: "#cbd5e1",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius:
                            "50%",
                          background:
                            type.color,
                          boxShadow: `0 0 8px ${type.color}`,
                        }}
                      />
                      {type.label}
                    </div>
                  )
                )}
              </div>

              <div className="spectrum-view">
                <div className="spectrum-y-axis">
                  {Array.from(
                    { length: BAND_COUNT },
                    (_, index) =>
                      BAND_COUNT -
                      1 -
                      index
                  ).map((band) => (
                    <span key={band}>
                      {band}
                    </span>
                  ))}
                </div>

                <div className="spectrum-grid">
                  {Array.from(
                    {
                      length: BAND_COUNT,
                    },
                    (_, rowIndex) => {
                      const bandIndex =
                        BAND_COUNT -
                        1 -
                        rowIndex;

                      const bandData =
                        spectrumBands.find(
                          (item) =>
                            Number(
                              item?.band
                            ) ===
                            bandIndex
                        );

                      const isCurrent =
                        bandIndex ===
                        Number(
                          currentBand
                        );

                      const isActive =
                        Boolean(
                          bandData?.active
                        );

                      const emitters =
                        Array.isArray(
                          bandData?.emitters
                        )
                          ? bandData.emitters
                          : [];

                      const primaryType =
                        getEmitterMeta(
                          emitters?.[0]
                            ?.type
                        );

                      const bandHistory =
                        spectrumHistory.map(
                          (point) => {
                            const active =
                              Boolean(
                                point
                                  ?.bands?.[
                                  bandIndex
                                ]
                              );

                            const historicalTypes =
                              Array.isArray(
                                point?.types?.[
                                  bandIndex
                                ]
                              )
                                ? point.types[
                                    bandIndex
                                  ]
                                : [];

                            const historicalType =
                              historicalTypes.length >
                              0
                                ? historicalTypes[0]
                                : null;

                            const historicalMeta =
                              historicalType
                                ? getEmitterMeta(
                                    historicalType
                                  )
                                : primaryType;

                            return {
                              active,
                              type:
                                historicalType,
                              meta:
                                historicalMeta,
                            };
                          }
                        );

                      return (
                        <div
                          key={bandIndex}
                          className={`spectrum-row ${
                            isCurrent
                              ? "current"
                              : ""
                          }`}
                          title={
                            emitters.length
                              ? emitters
                                  .map(
                                    (emitter) =>
                                      `${
                                        emitter?.id ??
                                        emitter?.emitter_id ??
                                        "Emitter"
                                      } — ${
                                        getEmitterMeta(
                                          emitter?.type
                                        ).label
                                      }`
                                  )
                                  .join("\n")
                              : `Band ${bandIndex} — no active emitter`
                          }
                        >
                          <div
                            className="spectrum-signal"
                            style={{
                              width: "100%",
                              display:
                                "grid",
                              gridTemplateColumns:
                                bandHistory.length >
                                0
                                  ? `repeat(${bandHistory.length}, minmax(2px, 1fr))`
                                  : "1fr",
                              gap: "2px",
                              alignItems:
                                "stretch",
                              background:
                                "transparent",
                              opacity: isActive
                                ? 1
                                : 0.82,
                            }}
                          >
                            {bandHistory.length >
                            0 ? (
                              bandHistory.map(
                                (
                                  point,
                                  index
                                ) => (
                                  <span
                                    key={`${bandIndex}-${index}`}
                                    className={`spectrum-cell ${
                                      point.active
                                        ? "occupied"
                                        : ""
                                    }`}
                                    title={
                                      point.active
                                        ? `${point.meta.label}${
                                            point.type
                                              ? ` — ${point.type}`
                                              : ""
                                          }`
                                        : "No RF activity"
                                    }
                                    style={{
                                      display:
                                        "block",
                                      minHeight:
                                        "6px",
                                      borderRadius:
                                        "2px",
                                      background:
                                        point.active
                                          ? point.meta.color
                                          : "rgba(100,116,139,0.16)",
                                      opacity:
                                        point.active
                                          ? 0.95
                                          : 0.5,
                                      boxShadow:
                                        point.active
                                          ? `0 0 5px ${point.meta.color}`
                                          : "none",
                                      transition:
                                        "background 120ms ease, box-shadow 120ms ease",
                                    }}
                                  />
                                )
                              )
                            ) : (
                              <span
                                style={{
                                  display:
                                    "block",
                                  height:
                                    "7px",
                                  borderRadius:
                                    "999px",
                                  background:
                                    isActive
                                      ? primaryType.color
                                      : "rgba(100,116,139,0.16)",
                                  boxShadow:
                                    isActive
                                      ? `0 0 8px ${primaryType.color}`
                                      : "none",
                                }}
                              />
                            )}
                          </div>

                          {isActive && (
                            <div
                              style={{
                                position:
                                  "absolute",
                                right:
                                  "10px",
                                top:
                                  "50%",
                                transform:
                                  "translateY(-50%)",
                                display:
                                  "inline-flex",
                                alignItems:
                                  "center",
                                gap: "5px",
                                fontSize:
                                  "9px",
                                fontWeight:
                                  800,
                                letterSpacing:
                                  "0.05em",
                                color:
                                  primaryType.color,
                                pointerEvents:
                                  "none",
                              }}
                            >
                              <span>
                                {
                                  primaryType.shortLabel
                                }
                              </span>

                              <span>
                                {emitters.length}
                              </span>
                            </div>
                          )}

                          {isCurrent && (
                            <div className="receiver-marker">
                              <span />
                              RECEIVER
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}

                  <div className="spectrum-time-axis">
                    <span>
                      {Math.max(
                        0,
                        simulationTime -
                          spectrumHistory.length +
                          1
                      )}
                    </span>

                    <span>
                      HISTORY
                    </span>

                    <span>
                      {simulationTime}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  marginTop: "12px",
                  paddingTop:
                    "10px",
                  borderTop:
                    "1px solid rgba(148,163,184,0.12)",
                  fontSize: "10px",
                  color: "#94a3b8",
                }}
              >
                <span>
                  Live trace = recent RF occupancy
                </span>

                <span>
                  {activeTypeKeys.size >
                  0
                    ? `${activeTypeKeys.size} emitter type(s) active`
                    : "No active emitters at current slot"}
                </span>
              </div>
            </div>

            <div className="panel scan-panel">
              <PanelHeader
                title="SCAN DECISION"
                subtitle="Current receiver state"
              />

              <div className="decision-block">
                <div className="decision-label">
                  CURRENT BAND
                </div>

                <div className="large-band">
                  {formatBand(
                    currentBand
                  )}
                </div>

                <div className="band-caption">
                  Frequency band selected by
                  the scheduler
                </div>
              </div>

              <div className="decision-comparison">
                <div>
                  <span>PREVIOUS</span>
                  <strong>
                    B-
                    {formatBand(
                      previousBand
                    )}
                  </strong>
                </div>

                <div className="decision-arrow">
                  →
                </div>

                <div>
                  <span>CURRENT</span>
                  <strong>
                    B-
                    {formatBand(
                      currentBand
                    )}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  marginTop:
                    "16px",
                  padding:
                    "10px 12px",
                  borderRadius:
                    "10px",
                  border:
                    "1px solid rgba(148,163,184,0.16)",
                  background:
                    "rgba(148,163,184,0.05)",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "10px",
                    letterSpacing:
                      "0.08em",
                    textTransform:
                      "uppercase",
                    color:
                      "#94a3b8",
                    marginBottom:
                      "6px",
                  }}
                >
                  CURRENT RF CONTENT
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius:
                        "50%",
                      background:
                        currentEmitterMeta.color,
                      boxShadow: `0 0 8px ${currentEmitterMeta.color}`,
                    }}
                  />

                  <strong
                    style={{
                      color:
                        currentEmitterMeta.color,
                      fontSize:
                        "12px",
                    }}
                  >
                    {activeEmitterTypes
                        .length >
                      0
                      ? activeEmitterTypes.join(
                          " / "
                        )
                      : "NO ACTIVE EMITTER"}
                  </strong>
                </div>
              </div>

              <div className="decision-status">
                <span
                  className={
                    scanResult ===
                    "SCANNING"
                      ? "pulse-dot"
                      : "status-dot"
                  }
                />

                <div>
                  <strong>
                    {scanResult}
                  </strong>

                  <span>
                    {systemMessage}
                  </span>
                </div>
              </div>

              <div className="progress-wrapper">
                <div className="progress-header">
                  <span>
                    SIMULATION PROGRESS
                  </span>

                  <strong>
                    {systemProgress.toFixed(
                      1
                    )}
                    %
                  </strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${systemProgress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="lower-grid">
            <div className="panel">
              <PanelHeader
                title="RF KNOWLEDGE MAP"
                subtitle="Live scheduler observations"
              />

              <div className="knowledge-table">
                <div className="knowledge-header">
                  <span>Band</span>
                  <span>Activity</span>
                  <span>
                    Uncertainty
                  </span>
                  <span>Last Hit</span>
                  <span>Score</span>
                </div>

                {knowledgeRows.length >
                0 ? (
                  knowledgeRows.map(
                    (row) => (
                      <div
                        key={
                          row.band
                        }
                        className="knowledge-row"
                      >
                        <strong>
                          {String(
                            row.band
                          ).padStart(
                            2,
                            "0"
                          )}
                        </strong>

                        <span>
                          {(
                            Number(
                              row.activity_probability ??
                                0
                            ) * 100
                          ).toFixed(
                            1
                          )}
                          %
                        </span>

                        <span>
                          {formatNumber(
                            row.uncertainty,
                            2
                          )}
                        </span>

                        <span>
                          {row.time_since_hit !==
                          undefined
                            ? `${formatNumber(
                                row.time_since_hit
                              )} slots`
                            : "--"}
                        </span>

                        <div className="score-cell">
                          <div className="mini-bar">
                            <div
                              style={{
                                width: `${Math.min(
                                  100,
                                  Number(
                                    row.periodic_due_score ??
                                      0
                                  ) * 100
                                )}%`,
                              }}
                            />
                          </div>

                          <span>
                            {formatNumber(
                              row.periodic_due_score,
                              2
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div
                    style={{
                      padding:
                        "20px 10px",
                      textAlign:
                        "center",
                      fontSize:
                        "12px",
                      color:
                        "#94a3b8",
                    }}
                  >
                    No scheduler observations yet.
                    Start or step the simulation.
                  </div>
                )}
              </div>
            </div>

            <div className="panel receiver-panel">
              <PanelHeader
                title="VIRTUAL RECEIVER"
                subtitle="Live receiver system state"
              />

              <div className="receiver-state-grid">
                <ReceiverState
                  label="Dwell Time"
                  value={formatNumber(
                    simulationData
                      ?.receiver
                      ?.dwell_time ??
                      1
                  )}
                  unit="slot"
                />

                <ReceiverState
                  label="Retune Time"
                  value={formatNumber(
                    simulationData
                      ?.receiver
                      ?.retune_time ??
                      1
                  )}
                  unit="slot"
                />

                <ReceiverState
                  label="Sensitivity"
                  value={formatNumber(
                    simulationData
                      ?.receiver
                      ?.sensitivity ??
                      0.8,
                    2
                  )}
                  unit=""
                />

                <ReceiverState
                  label="Detection P"
                  value={formatNumber(
                    simulationData
                      ?.receiver
                      ?.detection_probability ??
                      0.9,
                    2
                  )}
                  unit=""
                />
              </div>

              <div className="receiver-footer">
                <div className="receiver-indicator">
                  <span
                    className={
                      isRunning
                        ? "pulse-dot"
                        : "system-dot"
                    }
                  />

                  <span>
                    {isRunning
                      ? "RECEIVER ACTIVE"
                      : "RECEIVER STANDBY"}
                  </span>
                </div>

                <button
                  type="button"
                  className="settings-button"
                  onClick={() =>
                    setSystemMessage(
                      "Receiver configuration is controlled by the FastAPI simulation."
                    )
                  }
                >
                  <Settings2 size={15} />
                  Settings
                </button>
              </div>
            </div>
          </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}



function PerformancePage({
  simulationData,
  simulationTime,
  totalTimeSlots,
  currentBand,
  scheduler,
  metrics,
  scanHistory,
  systemProgress,
}) {
  const rawMetrics = simulationData?.metrics || {};

  const totalScans = Number(rawMetrics.total_scans ?? metrics?.hits ?? 0);
  const hits = Number(rawMetrics.hits ?? metrics?.hits ?? 0);
  const misses = Number(rawMetrics.misses ?? metrics?.misses ?? 0);
  const falseAlarms = Number(
    rawMetrics.false_alarms ?? metrics?.falseAlarms ?? 0
  );
  const totalEvents = Number(
    rawMetrics.total_events ?? metrics?.totalEvents ?? 0
  );
  const interceptedEvents = Number(
    rawMetrics.intercepted_events ?? metrics?.interceptedEvents ?? 0
  );
  const averageInterceptTime = Number(
    rawMetrics.average_intercept_time ?? 0
  );
  const simulationRuntime = Number(
    rawMetrics.simulation_time ?? simulationTime ?? 0
  );

  const pd = Number(rawMetrics.pd ?? 0) * 100;
  const pfa = Number(rawMetrics.pfa ?? 0) * 100;
  const eventRate = Number(rawMetrics.event_detection_rate ?? 0) * 100;

  const observedBands = new Set(
    (scanHistory || []).map((item) => Number(item?.band ?? -1)).filter((x) => x >= 0)
  ).size;

  const scansPerSlot = simulationTime > 0 ? totalScans / simulationTime : 0;
  const hitShare = totalScans > 0 ? (hits / totalScans) * 100 : 0;
  const missShare = totalScans > 0 ? (misses / totalScans) * 100 : 0;
  const falseAlarmShare = totalScans > 0 ? (falseAlarms / totalScans) * 100 : 0;

  const recent = (scanHistory || []).slice(-36);
  const recentHits = recent.filter((item) => item?.result === "HIT").length;
  const recentMisses = recent.filter((item) => item?.result === "MISS").length;
  const recentFalse = recent.filter(
    (item) => item?.result === "FALSE_ALARM" || item?.false_alarm
  ).length;

  const outcomeMax = Math.max(hits, misses, falseAlarms, 1);
  const metricBars = [
    { label: "Probability of Detection", value: pd, suffix: "%", className: "pd" },
    { label: "Probability of False Alarm", value: pfa, suffix: "%", className: "pfa" },
    { label: "Event Detection Rate", value: eventRate, suffix: "%", className: "event" },
  ];

  return (
    <div className="performance-page">
      <section className="performance-hero">
        <div>
          <div className="performance-eyebrow">MISSION PERFORMANCE / TELEMETRY</div>
          <h2>Scan Performance</h2>
          <p>
            Live evaluation of the active scan run using receiver observations and
            event-level interception metrics. Values update as the simulator advances.
          </p>
        </div>
        <div className="performance-hero-meta">
          <div className="performance-live-pill">
            <span className="pulse-dot" />
            RUN T+{String(simulationTime).padStart(4, "0")}
          </div>
          <div className="performance-scheduler-pill">
            <Gauge size={14} />
            {scheduler}
          </div>
        </div>
      </section>

      <section className="performance-kpi-grid">
        <div className="performance-kpi-card">
          <div className="performance-kpi-icon"><Target size={18} /></div>
          <span>DETECTION</span>
          <strong>{pd.toFixed(1)}%</strong>
          <small>probability of detection</small>
        </div>
        <div className="performance-kpi-card">
          <div className="performance-kpi-icon"><Shield size={18} /></div>
          <span>FALSE ALARM</span>
          <strong>{pfa.toFixed(1)}%</strong>
          <small>probability of false alarm</small>
        </div>
        <div className="performance-kpi-card">
          <div className="performance-kpi-icon"><Activity size={18} /></div>
          <span>EVENT RATE</span>
          <strong>{eventRate.toFixed(1)}%</strong>
          <small>events detected/intercepted</small>
        </div>
        <div className="performance-kpi-card">
          <div className="performance-kpi-icon"><Search size={18} /></div>
          <span>SCANS</span>
          <strong>{totalScans}</strong>
          <small>{scansPerSlot.toFixed(2)} scans per simulated slot</small>
        </div>
        <div className="performance-kpi-card">
          <div className="performance-kpi-icon"><Clock3 size={18} /></div>
          <span>AVG INTERCEPT</span>
          <strong>{averageInterceptTime > 0 ? averageInterceptTime.toFixed(2) : "--"}</strong>
          <small>simulated slots to intercept</small>
        </div>
        <div className="performance-kpi-card">
          <div className="performance-kpi-icon"><Radio size={18} /></div>
          <span>EVENTS</span>
          <strong>{interceptedEvents}/{totalEvents}</strong>
          <small>intercepted events</small>
        </div>
      </section>

      <section className="performance-grid performance-grid-top">
        <div className="performance-panel">
          <div className="performance-panel-header">
            <div>
              <span className="performance-panel-kicker">CORE DETECTION METRICS</span>
              <h3>Current run quality</h3>
            </div>
            <span className="performance-panel-tag">LIVE</span>
          </div>
          <div className="performance-metric-list">
            {metricBars.map((metric) => (
              <div className="performance-metric-row" key={metric.label}>
                <div className="performance-metric-title">
                  <span>{metric.label}</span>
                  <strong>{metric.value.toFixed(1)}{metric.suffix}</strong>
                </div>
                <div className={`performance-meter ${metric.className}`}>
                  <i style={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="performance-note">
            <Gauge size={15} />
            <span>These are cumulative metrics from the current simulation run.</span>
          </div>
        </div>

        <div className="performance-panel">
          <div className="performance-panel-header">
            <div>
              <span className="performance-panel-kicker">SCAN OUTCOMES</span>
              <h3>Observation distribution</h3>
            </div>
          </div>

          <div className="performance-outcomes">
            <div className="outcome-row">
              <div className="outcome-label"><span className="outcome-dot hit" />Hits</div>
              <strong>{hits}</strong>
              <div className="outcome-track"><i className="hit" style={{ width: `${(hits / outcomeMax) * 100}%` }} /></div>
              <span>{hitShare.toFixed(1)}%</span>
            </div>
            <div className="outcome-row">
              <div className="outcome-label"><span className="outcome-dot miss" />Misses</div>
              <strong>{misses}</strong>
              <div className="outcome-track"><i className="miss" style={{ width: `${(misses / outcomeMax) * 100}%` }} /></div>
              <span>{missShare.toFixed(1)}%</span>
            </div>
            <div className="outcome-row">
              <div className="outcome-label"><span className="outcome-dot false" />False alarms</div>
              <strong>{falseAlarms}</strong>
              <div className="outcome-track"><i className="false" style={{ width: `${(falseAlarms / outcomeMax) * 100}%` }} /></div>
              <span>{falseAlarmShare.toFixed(1)}%</span>
            </div>
          </div>

          <div className="performance-outcome-total">
            <span>Total observations</span>
            <strong>{totalScans}</strong>
          </div>
        </div>
      </section>

      <section className="performance-grid performance-grid-mid">
        <div className="performance-panel performance-timeline-panel">
          <div className="performance-panel-header">
            <div>
              <span className="performance-panel-kicker">RECENT TELEMETRY</span>
              <h3>Last {recent.length} scan outcomes</h3>
            </div>
            <span className="performance-panel-subtag">{recent.length ? `T+${recent[0]?.time_slot ?? 0} → T+${recent[recent.length - 1]?.time_slot ?? 0}` : "NO DATA"}</span>
          </div>

          {recent.length === 0 ? (
            <div className="performance-empty">
              <Activity size={25} />
              <strong>No scan telemetry yet</strong>
              <span>Start or step the simulation to populate live performance data.</span>
            </div>
          ) : (
            <>
              <div className="performance-strip">
                {recent.map((item, index) => {
                  const result = String(item?.result || "MISS");
                  const cls = result === "HIT" ? "hit" : (result === "FALSE_ALARM" || item?.false_alarm ? "false" : "miss");
                  return (
                    <div
                      key={`${item?.time_slot}-${item?.band}-${index}`}
                      className={`performance-strip-cell ${cls}`}
                      title={`T+${item?.time_slot ?? 0} • Band ${String(item?.band ?? 0).padStart(2, "0")} • ${result}`}
                    />
                  );
                })}
              </div>
              <div className="performance-strip-legend">
                <span><i className="hit" /> HIT {recentHits}</span>
                <span><i className="miss" /> MISS {recentMisses}</span>
                <span><i className="false" /> FALSE ALARM {recentFalse}</span>
              </div>
            </>
          )}
        </div>

        <div className="performance-panel">
          <div className="performance-panel-header">
            <div>
              <span className="performance-panel-kicker">COVERAGE</span>
              <h3>Band exploration</h3>
            </div>
          </div>
          <div className="coverage-gauge">
            <div className="coverage-ring" style={{ "--coverage": `${Math.min(100, (observedBands / 20) * 100)}%` }}>
              <div>
                <strong>{observedBands}/20</strong>
                <span>bands observed</span>
              </div>
            </div>
          </div>
          <div className="coverage-meta">
            <div><span>Current band</span><strong>{currentBand == null ? "--" : `B${String(currentBand).padStart(2, "0")}`}</strong></div>
            <div><span>Simulation</span><strong>{simulationRuntime.toFixed(0)} slots</strong></div>
          </div>
        </div>
      </section>

      <section className="performance-grid performance-grid-bottom">
        <div className="performance-panel">
          <div className="performance-panel-header">
            <div>
              <span className="performance-panel-kicker">RUN PROGRESS</span>
              <h3>Scenario execution</h3>
            </div>
          </div>
          <div className="performance-progress-wrap">
            <div className="performance-progress-head">
              <span>Simulation progress</span>
              <strong>{systemProgress.toFixed(1)}%</strong>
            </div>
            <div className="performance-progress"><i style={{ width: `${systemProgress}%` }} /></div>
            <div className="performance-progress-foot">
              <span>T+{String(simulationTime).padStart(4, "0")}</span>
              <span>T+{String(totalTimeSlots).padStart(4, "0")}</span>
            </div>
          </div>
        </div>

        <div className="performance-panel performance-assessment-panel">
          <div className="performance-panel-header">
            <div>
              <span className="performance-panel-kicker">RUN CONTEXT</span>
              <h3>Active configuration</h3>
            </div>
          </div>
          <div className="performance-context-grid">
            <div><span>Scheduler</span><strong>{scheduler}</strong></div>
            <div><span>Receiver</span><strong>Virtual Receiver</strong></div>
            <div><span>RF bands</span><strong>20</strong></div>
            <div><span>Event tracking</span><strong>Emitter events</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function KnowledgeMapPage({
  simulationData,
  simulationTime,
  currentBand,
  scheduler,
  formatBand,
}) {
  const knowledgeMap = Array.isArray(
    simulationData?.knowledge_map
  )
    ? simulationData.knowledge_map
    : [];

  const sortedBands = [...knowledgeMap].sort(
    (a, b) => Number(a?.band ?? 0) - Number(b?.band ?? 0)
  );

  const totalScans = sortedBands.reduce(
    (sum, row) => sum + Number(row?.scans ?? 0),
    0
  );
  const totalHits = sortedBands.reduce(
    (sum, row) => sum + Number(row?.hits ?? 0),
    0
  );
  const totalMisses = sortedBands.reduce(
    (sum, row) => sum + Number(row?.misses ?? 0),
    0
  );
  const totalFalseAlarms = sortedBands.reduce(
    (sum, row) => sum + Number(row?.false_alarms ?? 0),
    0
  );

  const knownBands = sortedBands.filter(
    (row) => Number(row?.scans ?? 0) > 0
  );

  const avgActivity = knownBands.length
    ? knownBands.reduce(
        (sum, row) =>
          sum + Number(row?.activity_probability ?? 0),
        0
      ) / knownBands.length
    : 0;

  const topActivity = [...sortedBands]
    .sort(
      (a, b) =>
        Number(b?.activity_probability ?? 0) -
        Number(a?.activity_probability ?? 0)
    )
    .slice(0, 5);

  const topDue = [...sortedBands]
    .sort(
      (a, b) =>
        Number(b?.periodic_due_score ?? 0) -
        Number(a?.periodic_due_score ?? 0)
    )
    .slice(0, 5);

  const maxScans = Math.max(
    1,
    ...sortedBands.map((row) => Number(row?.scans ?? 0))
  );

  const getActivityClass = (value) => {
    const score = Number(value ?? 0);
    if (score >= 0.75) return "high";
    if (score >= 0.45) return "medium";
    return "low";
  };

  const getUncertaintyLabel = (value) => {
    const score = Number(value ?? 0);
    if (score >= 0.75) return "High";
    if (score >= 0.4) return "Medium";
    return "Low";
  };

  const getHeatStyle = (activity, uncertainty) => {
    const a = Math.max(0, Math.min(1, Number(activity ?? 0)));
    const u = Math.max(0, Math.min(1, Number(uncertainty ?? 1)));
    const intensity = Math.max(0.14, Math.min(0.9, 0.16 + a * 0.62 + (1 - u) * 0.18));
    return { opacity: intensity };
  };

  const renderEmpty = () => (
    <div className="knowledge-empty">
      <BrainCircuit size={28} strokeWidth={1.8} />
      <strong>No knowledge collected yet</strong>
      <span>Start or step the simulation to populate the scheduler knowledge map.</span>
    </div>
  );

  return (
    <div className="knowledge-page">
      <section className="knowledge-hero">
        <div>
          <div className="knowledge-eyebrow">
            ADAPTIVE SCAN INTELLIGENCE
          </div>
          <h2>RF Knowledge Map</h2>
          <p>
            This page exposes what the smart scheduler has learned from receiver
            observations: activity likelihood, uncertainty, scan freshness and
            periodic timing cues.
          </p>
        </div>

        <div className="knowledge-hero-meta">
          <div className="knowledge-live-pill">
            <span className="pulse-dot" />
            LIVE T+{String(simulationTime).padStart(4, "0")}
          </div>
          <div className="knowledge-scheduler-pill">
            <BrainCircuit size={15} />
            {scheduler}
          </div>
        </div>
      </section>

      <section className="knowledge-stat-grid">
        <div className="knowledge-stat-card">
          <div className="knowledge-stat-icon"><Search size={18} /></div>
          <span>TOTAL SCANS</span>
          <strong>{totalScans}</strong>
          <small>observations stored</small>
        </div>
        <div className="knowledge-stat-card">
          <div className="knowledge-stat-icon"><Target size={18} /></div>
          <span>HIT RATE</span>
          <strong>
            {totalScans > 0 ? ((totalHits / totalScans) * 100).toFixed(1) : "0.0"}%
          </strong>
          <small>{totalHits} hits / {totalMisses} misses</small>
        </div>
        <div className="knowledge-stat-card">
          <div className="knowledge-stat-icon"><ActivitySquare size={18} /></div>
          <span>KNOWN BANDS</span>
          <strong>{knownBands.length}/{sortedBands.length || 20}</strong>
          <small>bands with scan history</small>
        </div>
        <div className="knowledge-stat-card">
          <div className="knowledge-stat-icon"><Clock3 size={18} /></div>
          <span>AVG ACTIVITY</span>
          <strong>{(avgActivity * 100).toFixed(1)}%</strong>
          <small>among observed bands</small>
        </div>
        <div className="knowledge-stat-card">
          <div className="knowledge-stat-icon"><Database size={18} /></div>
          <span>FALSE ALARMS</span>
          <strong>{totalFalseAlarms}</strong>
          <small>receiver observations</small>
        </div>
      </section>

      {sortedBands.length === 0 ? renderEmpty() : (
        <>
          <section className="knowledge-primary-grid">
            <div className="knowledge-panel knowledge-heatmap-panel">
              <div className="knowledge-panel-header">
                <div>
                  <span className="knowledge-panel-kicker">ACTIVITY FIELD</span>
                  <h3>Band activity & uncertainty</h3>
                </div>
                <div className="knowledge-legend">
                  <span><i className="legend-low" /> Low activity</span>
                  <span><i className="legend-high" /> High activity</span>
                  <span><i className="legend-outline" /> Current band</span>
                </div>
              </div>

              <div className="knowledge-heatmap">
                {sortedBands.map((row) => {
                  const band = Number(row?.band ?? 0);
                  const activity = Number(row?.activity_probability ?? 0);
                  const uncertainty = Number(row?.uncertainty ?? 1);
                  const scans = Number(row?.scans ?? 0);
                  const isCurrent = band === Number(currentBand);

                  return (
                    <div
                      key={band}
                      className={`knowledge-cell ${getActivityClass(activity)} ${isCurrent ? "current" : ""}`}
                      style={getHeatStyle(activity, uncertainty)}
                      title={`Band ${formatBand(band)} • Activity ${(activity * 100).toFixed(1)}% • Uncertainty ${uncertainty.toFixed(2)} • Scans ${scans}`}
                    >
                      <span>{formatBand(band)}</span>
                      <small>{(activity * 100).toFixed(0)}%</small>
                    </div>
                  );
                })}
              </div>

              <div className="knowledge-heatmap-footer">
                <span>Higher intensity = stronger estimated activity.</span>
                <span>Uncertainty falls as a band is observed more often.</span>
              </div>
            </div>

            <div className="knowledge-panel knowledge-focus-panel">
              <div className="knowledge-panel-header">
                <div>
                  <span className="knowledge-panel-kicker">SCHEDULER FOCUS</span>
                  <h3>What the map knows now</h3>
                </div>
              </div>

              <div className="knowledge-focus-stack">
                {topActivity.map((row, index) => {
                  const activity = Number(row?.activity_probability ?? 0);
                  const uncertainty = Number(row?.uncertainty ?? 1);
                  const due = Number(row?.periodic_due_score ?? 0);
                  return (
                    <div className="focus-row" key={`activity-${row?.band}-${index}`}>
                      <div className="focus-rank">{index + 1}</div>
                      <div className="focus-main">
                        <strong>Band {formatBand(row?.band)}</strong>
                        <span>
                          Activity {(activity * 100).toFixed(1)}% · {getUncertaintyLabel(uncertainty)} uncertainty
                        </span>
                      </div>
                      <div className="focus-value">
                        <b>{(activity * 100).toFixed(0)}%</b>
                        <div className="focus-track"><i style={{ width: `${activity * 100}%` }} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="knowledge-focus-note">
                <BrainCircuit size={16} />
                <span>
                  Higher activity is useful for prioritization, while high uncertainty
                  identifies bands that still need exploration.
                </span>
              </div>
            </div>
          </section>

          <section className="knowledge-secondary-grid">
            <div className="knowledge-panel">
              <div className="knowledge-panel-header">
                <div>
                  <span className="knowledge-panel-kicker">BAND INTELLIGENCE</span>
                  <h3>Detailed knowledge table</h3>
                </div>
                <span className="knowledge-count">{sortedBands.length} bands</span>
              </div>

              <div className="knowledge-table-wide">
                <div className="knowledge-wide-header">
                  <span>Band</span>
                  <span>Scans</span>
                  <span>Hits</span>
                  <span>Activity</span>
                  <span>Uncertainty</span>
                  <span>Last Scan</span>
                  <span>Last Hit</span>
                  <span>Period</span>
                  <span>Due</span>
                </div>

                {sortedBands.map((row) => {
                  const band = Number(row?.band ?? 0);
                  const activity = Number(row?.activity_probability ?? 0);
                  const uncertainty = Number(row?.uncertainty ?? 1);
                  const due = Number(row?.periodic_due_score ?? 0);
                  const period = Number(row?.estimated_period ?? 0);
                  const isCurrent = band === Number(currentBand);
                  return (
                    <div className={`knowledge-wide-row ${isCurrent ? "current-row" : ""}`} key={band}>
                      <strong>{formatBand(band)}</strong>
                      <span>{Number(row?.scans ?? 0)}</span>
                      <span>{Number(row?.hits ?? 0)}</span>
                      <span className="activity-cell">
                        <i><em style={{ width: `${Math.min(100, activity * 100)}%` }} /></i>
                        { (activity * 100).toFixed(1) }%
                      </span>
                      <span>{uncertainty.toFixed(2)}</span>
                      <span>{Number(row?.time_since_scan ?? 0)} slots</span>
                      <span>{Number(row?.time_since_hit ?? 0)} slots</span>
                      <span>{period > 0 ? `${period.toFixed(1)} s` : "--"}</span>
                      <span className="due-cell">
                        <i><em style={{ width: `${Math.min(100, due * 100)}%` }} /></i>
                        {due.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="knowledge-panel knowledge-due-panel">
              <div className="knowledge-panel-header">
                <div>
                  <span className="knowledge-panel-kicker">PERIODICITY</span>
                  <h3>Bands becoming due</h3>
                </div>
              </div>

              <div className="due-list">
                {topDue.map((row, index) => {
                  const due = Number(row?.periodic_due_score ?? 0);
                  const confidence = Number(row?.periodicity_confidence ?? 0);
                  const period = Number(row?.estimated_period ?? 0);
                  return (
                    <div className="due-item" key={`due-${row?.band}-${index}`}>
                      <div className="due-index">{index + 1}</div>
                      <div className="due-band">B{formatBand(row?.band)}</div>
                      <div className="due-main">
                        <div className="due-bar"><i style={{ width: `${Math.min(100, due * 100)}%` }} /></div>
                        <span>
                          Due score {due.toFixed(2)} · confidence {confidence.toFixed(2)}
                        </span>
                      </div>
                      <strong>{period > 0 ? `${period.toFixed(0)}s` : "--"}</strong>
                    </div>
                  );
                })}
              </div>

              <div className="knowledge-period-note">
                <Clock3 size={17} />
                <span>Periodic timing signals are shown only when the backend has enough hit history to estimate them.</span>
              </div>
            </div>
          </section>

          <section className="knowledge-bottom-grid">
            <div className="knowledge-panel knowledge-formula-panel">
              <div className="knowledge-panel-header">
                <div>
                  <span className="knowledge-panel-kicker">INTERPRETATION</span>
                  <h3>How to read the map</h3>
                </div>
              </div>
              <div className="knowledge-formula-grid">
                <div>
                  <b>Activity probability</b>
                  <span>Estimated from observed hits and scans. It represents learned activity likelihood, not hidden ground truth.</span>
                </div>
                <div>
                  <b>Uncertainty</b>
                  <span>High values indicate bands that have received fewer observations and therefore require exploration.</span>
                </div>
                <div>
                  <b>Time since hit</b>
                  <span>Recency context used to judge whether previous activity may need another scan.</span>
                </div>
                <div>
                  <b>Periodic due score</b>
                  <span>Raises priority when observed hit timing suggests a recurring interval is approaching.</span>
                </div>
              </div>
            </div>

            <div className="knowledge-panel knowledge-current-panel">
              <div className="knowledge-current-icon"><BrainCircuit size={24} /></div>
              <span>CURRENT RECEIVER BAND</span>
              <strong>BAND {formatBand(currentBand)}</strong>
              <small>
                The highlighted cell tracks the band most recently selected by the simulation scheduler.
              </small>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function RfEnvironmentPage({
  simulationData,
  spectrumBands,
  simulationTime,
  currentBand,
  emitterCount,
  scenarioSeed,
  formatBand,
}) {
  const activeBands = spectrumBands.filter(
    (band) => Boolean(band?.active)
  );

  const activeEmitters = [];

  activeBands.forEach((band) => {
    (band?.emitters || []).forEach(
      (emitter) => {
        activeEmitters.push({
          id:
            emitter?.id ??
            emitter?.emitter_id ??
            "Emitter",
          type: getEmitterMeta(
            emitter?.type
          ),
          band: Number(band.band),
        });
      }
    );
  });

  const uniqueActiveEmitters =
    Array.from(
      new Map(
        activeEmitters.map((item) => [
          `${item.id}-${item.band}`,
          item,
        ])
      ).values()
    );

  const occupancy =
    spectrumBands.length > 0
      ? (
          (activeBands.length /
            spectrumBands.length) *
          100
        ).toFixed(1)
      : "0.0";

  const typeCounts = {
    continuous: 0,
    periodic: 0,
    intermittent: 0,
    frequency_agile: 0,
  };

  activeEmitters.forEach((emitter) => {
    if (typeCounts[emitter.type.key] !== undefined) {
      typeCounts[emitter.type.key] += 1;
    }
  });

  const receiverBand =
    Number.isFinite(Number(currentBand))
      ? Number(currentBand)
      : null;

  return (
    <div className="rf-environment-page">
      <section className="rf-env-hero">
        <div>
          <div className="rf-env-eyebrow">
            SIMULATED RF ENVIRONMENT
          </div>

          <h2>
            Emitter Environment
          </h2>

          <p>
            Monitor the simulated RF scene,
            active frequency bands and emitter
            behavior as the receiver moves
            through the spectrum.
          </p>
        </div>

        <div className="rf-env-live-status">
          <span className="pulse-dot" />
          LIVE T+
          {String(simulationTime).padStart(
            4,
            "0"
          )}
        </div>
      </section>

      <section className="rf-env-summary-grid">
        <div className="rf-env-summary-card">
          <span>SCENARIO</span>
          <strong>#{scenarioSeed}</strong>
          <small>
            {simulationData?.scenario
              ?.num_time_slots ?? 1000}{" "}
            time slots
          </small>
        </div>

        <div className="rf-env-summary-card">
          <span>EMITTERS</span>
          <strong>{emitterCount}</strong>
          <small>
            simulated emitters
          </small>
        </div>

        <div className="rf-env-summary-card">
          <span>RF BANDS</span>
          <strong>
            {spectrumBands.length}
          </strong>
          <small>
            receiver scan bands
          </small>
        </div>

        <div className="rf-env-summary-card">
          <span>LIVE OCCUPANCY</span>
          <strong>{occupancy}%</strong>
          <small>
            active bands at current slot
          </small>
        </div>
      </section>

      <section className="rf-env-grid">
        <div className="panel rf-env-spectrum-card">
          <PanelHeader
            title="CURRENT BAND OCCUPANCY"
            subtitle="Live state reported by the RF simulator"
          />

          <div className="rf-env-band-grid">
            {spectrumBands.map((band) => {
              const emitters =
                Array.isArray(
                  band?.emitters
                )
                  ? band.emitters
                  : [];

              const primary =
                getEmitterMeta(
                  emitters?.[0]?.type
                );

              const isReceiverBand =
                receiverBand ===
                Number(band.band);

              return (
                <div
                  key={band.band}
                  className={`rf-env-band-card ${
                    band.active
                      ? "active"
                      : ""
                  } ${
                    isReceiverBand
                      ? "receiver-band"
                      : ""
                  }`}
                >
                  <div className="rf-env-band-top">
                    <strong>
                      B-
                      {formatBand(
                        band.band
                      )}
                    </strong>

                    <span
                      className="rf-env-state-dot"
                      style={{
                        background:
                          band.active
                            ? primary.color
                            : undefined,
                        boxShadow:
                          band.active
                            ? `0 0 8px ${primary.color}`
                            : undefined,
                      }}
                    />
                  </div>

                  <div className="rf-env-band-state">
                    {band.active
                      ? primary.shortLabel
                      : "IDLE"}
                  </div>

                  {emitters.length >
                    0 && (
                    <div
                      className="rf-env-band-emitters"
                      style={{
                        color:
                          primary.color,
                      }}
                    >
                      {emitters
                        .map(
                          (
                            emitter
                          ) =>
                            emitter?.id ??
                            emitter?.emitter_id ??
                            "Emitter"
                        )
                        .join(", ")}
                    </div>
                  )}

                  {isReceiverBand && (
                    <div className="rf-env-receiver-tag">
                      RECEIVER
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel rf-env-types-card">
          <PanelHeader
            title="EMITTER TYPES"
            subtitle="Currently observable emitter activity"
          />

          <div className="rf-env-type-list">
            {EMITTER_TYPES.map(
              (type) => (
                <div
                  className="rf-env-type-row"
                  key={type.key}
                >
                  <div
                    className="rf-env-type-icon"
                    style={{
                      borderColor:
                        type.color,
                      color:
                        type.color,
                    }}
                  >
                    {type.symbol}
                  </div>

                  <div className="rf-env-type-copy">
                    <strong>
                      {type.label}
                    </strong>
                    <span>
                      {type.key ===
                      "frequency_agile"
                        ? "Dynamic band movement"
                        : type.key ===
                            "periodic"
                          ? "Repeating activity"
                          : type.key ===
                              "intermittent"
                            ? "Irregular activity"
                            : "Persistent activity"}
                    </span>
                  </div>

                  <strong
                    className="rf-env-type-count"
                    style={{
                      color:
                        type.color,
                    }}
                  >
                    {typeCounts[
                      type.key
                    ]}
                  </strong>
                </div>
              )
            )}
          </div>

          <div className="rf-env-note">
            Counts represent emitters
            currently observable in the
            simulator state. Full emitter
            inventory metadata can be exposed
            by the backend in the next
            integration step.
          </div>
        </div>
      </section>

      <section className="panel rf-env-emitter-card">
        <PanelHeader
          title="ACTIVE EMITTERS"
          subtitle="Emitter-to-band mapping at the current simulation timestep"
        />

        {uniqueActiveEmitters.length >
        0 ? (
          <div className="rf-env-emitter-table">
            <div className="rf-env-table-header">
              <span>EMITTER</span>
              <span>TYPE</span>
              <span>CURRENT BAND</span>
              <span>STATE</span>
            </div>

            {uniqueActiveEmitters.map(
              (emitter, index) => (
                <div
                  className="rf-env-table-row"
                  key={`${emitter.id}-${emitter.band}-${index}`}
                >
                  <strong>
                    {emitter.id}
                  </strong>

                  <span
                    className="rf-env-type-pill"
                    style={{
                      color:
                        emitter.type.color,
                      borderColor:
                        emitter.type.color,
                    }}
                  >
                    <span
                      className="rf-env-pill-dot"
                      style={{
                        background:
                          emitter.type.color,
                        boxShadow: `0 0 7px ${emitter.type.color}`,
                      }}
                    />
                    {
                      emitter.type.label
                    }
                  </span>

                  <strong>
                    B-
                    {formatBand(
                      emitter.band
                    )}
                  </strong>

                  <span className="rf-env-state-active">
                    TRANSMITTING
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="rf-env-empty">
            No emitter is transmitting at
            the current timestep.
          </div>
        )}
      </section>
    </div>
  );
}


function LiveScanPage({
  simulationData,
  scanHistory,
  simulationTime,
  currentBand,
  previousBand,
  scheduler,
  isRunning,
  metrics,
  systemMessage,
  formatBand,
  totalTimeSlots,
}) {
  const latestScan =
    simulationData?.latest_scan;

  const receiver =
    simulationData?.receiver || {};

  const lastScans = [...scanHistory]
    .slice(-12)
    .reverse();

  const detectionPercent =
    Number(metrics?.pd ?? 0);

  const progress =
    totalTimeSlots > 0
      ? Math.min(
          100,
          (simulationTime /
            totalTimeSlots) *
            100
        )
      : 0;

  const resultClass =
    latestScan?.result === "HIT"
      ? "live-scan-result-hit"
      : latestScan?.result ===
          "FALSE_ALARM"
        ? "live-scan-result-false"
        : "live-scan-result-miss";

  return (
    <div className="live-scan-page">
      <section className="live-scan-hero">
        <div>
          <div className="live-scan-eyebrow">
            RECEIVER OPERATIONS
          </div>

          <h2>
            Live Scan Monitor
          </h2>

          <p>
            Real-time scan decisions,
            receiver observations and
            recent HIT/MISS activity from
            the simulation engine.
          </p>
        </div>

        <div className="live-scan-status">
          <span
            className={
              isRunning
                ? "pulse-dot"
                : "system-dot"
            }
          />
          {isRunning
            ? "RECEIVER ACTIVE"
            : "RECEIVER STANDBY"}
        </div>
      </section>

      <section className="live-scan-stat-grid">
        <div className="live-scan-stat-card">
          <span>CURRENT BAND</span>
          <strong>
            B-{formatBand(currentBand)}
          </strong>
          <small>
            Scheduler selection
          </small>
        </div>

        <div className="live-scan-stat-card">
          <span>SCAN RESULT</span>
          <strong
            className={resultClass}
          >
            {latestScan?.result ??
              "READY"}
          </strong>
          <small>
            Latest receiver observation
          </small>
        </div>

        <div className="live-scan-stat-card">
          <span>DETECTION PROBABILITY</span>
          <strong>
            {detectionPercent.toFixed(
              1
            )}
            %
          </strong>
          <small>
            Observed scenario metric
          </small>
        </div>

        <div className="live-scan-stat-card">
          <span>SIMULATION TIME</span>
          <strong>
            T+
            {String(
              simulationTime
            ).padStart(4, "0")}
          </strong>
          <small>
            {progress.toFixed(1)}% complete
          </small>
        </div>
      </section>

      <section className="live-scan-grid">
        <div className="panel live-scan-current-panel">
          <PanelHeader
            title="CURRENT SCAN"
            subtitle="Latest receiver observation"
          />

          <div className="live-scan-current">
            <div className="live-scan-band">
              <span>SCANNING BAND</span>

              <strong>
                {formatBand(
                  latestScan?.band ??
                    currentBand
                )}
              </strong>

              <small>
                Frequency band selected by{" "}
                {scheduler}
              </small>
            </div>

            <div className="live-scan-flow">
              <div>
                <span>PREVIOUS</span>
                <strong>
                  B-
                  {formatBand(
                    previousBand
                  )}
                </strong>
              </div>

              <div className="live-scan-flow-arrow">
                →
              </div>

              <div>
                <span>CURRENT</span>
                <strong>
                  B-
                  {formatBand(
                    currentBand
                  )}
                </strong>
              </div>
            </div>

            <div className="live-scan-observation">
              <div
                className={`live-scan-observation-icon ${resultClass}`}
              >
                {latestScan?.result ===
                "HIT"
                  ? "H"
                  : latestScan?.result ===
                      "FALSE_ALARM"
                    ? "F"
                    : "M"}
              </div>

              <div>
                <strong>
                  {latestScan?.result ??
                    "READY"}
                </strong>

                <span>
                  {latestScan
                    ? `Band ${formatBand(
                        latestScan.band
                      )} scanned at T+${
                        latestScan.time_slot
                      }.`
                    : systemMessage}
                </span>
              </div>
            </div>

            <div className="live-scan-progress">
              <div>
                <span>
                  SIMULATION PROGRESS
                </span>
                <strong>
                  {progress.toFixed(1)}%
                </strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel live-scan-receiver-panel">
          <PanelHeader
            title="RECEIVER STATE"
            subtitle="Virtual receiver telemetry"
          />

          <div className="live-scan-receiver-list">
            <LiveScanRow
              label="Current time"
              value={
                receiver.current_time ??
                simulationTime
              }
              unit="slot"
            />

            <LiveScanRow
              label="Current band"
              value={formatBand(
                receiver.current_band ??
                  currentBand
              )}
              unit=""
            />

            <LiveScanRow
              label="Dwell time"
              value={
                receiver.dwell_time ?? 1
              }
              unit="slot"
            />

            <LiveScanRow
              label="Retune time"
              value={
                receiver.retune_time ?? 1
              }
              unit="slot"
            />

            <LiveScanRow
              label="Sensitivity"
              value={Number(
                receiver.sensitivity ??
                  0.8
              ).toFixed(2)}
              unit=""
            />

            <LiveScanRow
              label="Detection P"
              value={Number(
                receiver.detection_probability ??
                  0.9
              ).toFixed(2)}
              unit=""
            />
          </div>

          <div className="live-scan-message">
            <span
              className={
                isRunning
                  ? "pulse-dot"
                  : "system-dot"
              }
            />

            <span>
              {systemMessage}
            </span>
          </div>
        </div>
      </section>

      <section className="panel live-scan-timeline-panel">
        <PanelHeader
          title="SCAN TIMELINE"
          subtitle="Most recent receiver decisions"
        />

        <div className="live-scan-timeline">
          {lastScans.length > 0 ? (
            lastScans.map(
              (scan, index) => {
                const result =
                  String(
                    scan.result ||
                      "UNKNOWN"
                  );

                const resultClassName =
                  result === "HIT"
                    ? "hit"
                    : result ===
                        "FALSE_ALARM"
                      ? "false"
                      : "miss";

                return (
                  <div
                    className="live-scan-timeline-row"
                    key={`${scan.time_slot}-${scan.band}-${index}`}
                  >
                    <span className="live-scan-time">
                      T+
                      {String(
                        scan.time_slot
                      ).padStart(4, "0")}
                    </span>

                    <span className="live-scan-band-id">
                      B-
                      {formatBand(
                        scan.band
                      )}
                    </span>

                    <span
                      className={`live-scan-result ${resultClassName}`}
                    >
                      {result}
                    </span>

                    <span className="live-scan-scan-type">
                      {scan.detected
                        ? "Signal detected"
                        : scan.false_alarm
                          ? "False alarm"
                          : "No detection"}
                    </span>

                    <span className="live-scan-duration">
                      {scan.scan_duration ??
                        0} slot
                      {scan.scan_duration ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                );
              }
            )
          ) : (
            <div className="live-scan-empty">
              No scans recorded yet. Press
              Step or Start to begin the
              receiver simulation.
            </div>
          )}
        </div>
      </section>

      <section className="live-scan-bottom-grid">
        <div className="panel">
          <PanelHeader
            title="SCAN STATISTICS"
            subtitle="Current scenario totals"
          />

          <div className="live-scan-stat-list">
            <LiveScanMetric
              label="Total scans"
              value={metrics?.hits + metrics?.misses}
            />
            <LiveScanMetric
              label="Hits"
              value={metrics?.hits}
            />
            <LiveScanMetric
              label="Misses"
              value={metrics?.misses}
            />
            <LiveScanMetric
              label="False alarms"
              value={metrics?.falseAlarms}
            />
          </div>
        </div>

        <div className="panel">
          <PanelHeader
            title="SCHEDULER DECISION"
            subtitle="Current scan-selection context"
          />

          <div className="live-scan-decision-card">
            <span>CURRENT SCHEDULER</span>
            <strong>{scheduler}</strong>

            <div className="live-scan-decision-band">
              <div>
                <small>PREVIOUS</small>
                <b>
                  B-
                  {formatBand(
                    previousBand
                  )}
                </b>
              </div>

              <span>→</span>

              <div>
                <small>NEXT / CURRENT</small>
                <b>
                  B-
                  {formatBand(
                    currentBand
                  )}
                </b>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LiveScanRow({
  label,
  value,
  unit,
}) {
  return (
    <div className="live-scan-receiver-row">
      <span>{label}</span>

      <strong>
        {value}
        {unit && (
          <small>{unit}</small>
        )}
      </strong>
    </div>
  );
}

function LiveScanMetric({
  label,
  value,
}) {
  return (
    <div className="live-scan-metric">
      <span>{label}</span>
      <strong>
        {value ?? 0}
      </strong>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        {icon}
      </div>

      <div className="metric-content">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
}) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <span className="panel-indicator" />
    </div>
  );
}

function ReceiverState({
  label,
  value,
  unit,
}) {
  return (
    <div className="receiver-state">
      <span>{label}</span>

      <strong>
        {value}

        {unit && (
          <small>{unit}</small>
        )}
      </strong>
    </div>
  );
}
