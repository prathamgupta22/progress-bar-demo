import { useState, useEffect, useRef } from "react";
import { calcSectionPercentage, getDampener } from "./progressLogic";
import "./index.css";
import "./App.css";

// ─── Toast (section change notification) ─────────────────────────────────────
function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? "toast-visible" : ""}`}>{message}</div>
  );
}

// ─── Circular progress ring (matches screenshot) ─────────────────────────────
function CircularProgress({ pct }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="circ-svg">
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="var(--track)"
        strokeWidth="4"
      />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="var(--fill)"
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        style={{
          transition: "stroke-dashoffset 0.45s cubic-bezier(.4,0,.2,1)",
        }}
      />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="var(--fill)"
        fontFamily="Inter,system-ui,sans-serif"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── The progress bar strip (matches screenshot layout) ──────────────────────
function ProgressStrip({
  sectionPct,
  currentStep,
  totalSteps,
  currentLabel,
  nextLabel,
  onToast,
}) {
  const [displayPct, setDisplayPct] = useState(sectionPct);
  const [transitioning, setTransitioning] = useState(false);
  const prevStep = useRef(currentStep);

  useEffect(() => {
    // showSectionToast condition: step changed AND new pct is 0 — same signal backend sends
    const sectionChanged = currentStep !== prevStep.current && sectionPct === 0;

    if (sectionChanged) {
      setTransitioning(true);
      setDisplayPct(100); // animate old bar to 100%
      onToast(`Section complete — moving to "${currentLabel}"`);
      const timer = setTimeout(() => {
        setTransitioning(false);
        setDisplayPct(0); // reset to fresh bar
        prevStep.current = currentStep;
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setDisplayPct(sectionPct);
      prevStep.current = currentStep;
    }
  }, [sectionPct, currentStep, currentLabel, onToast]);

  return (
    <div className="progress-strip">
      <div className="strip-inner">
        <div className="strip-left">
          <CircularProgress pct={displayPct} />
          <span className="section-label">
            Section {currentStep}/{totalSteps}: <strong>{currentLabel}</strong>
          </span>
        </div>

        {nextLabel && (
          <span className="next-label">
            Next: <strong>{nextLabel}</strong>
          </span>
        )}

        <button className="help-btn" aria-label="Help">
          ?
        </button>
      </div>

      <div className="bar-track">
        <div
          className="bar-fill"
          style={{
            width: `${displayPct}%`,
            background: transitioning
              ? "var(--fill-end)"
              : "linear-gradient(90deg, var(--fill) 0%, #5B9BD5 100%)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Config panel ─────────────────────────────────────────────────────────────
function ConfigPanel({ config, onChange }) {
  const dampenerNormal = getDampener(
    config.medianClusterQuestions,
    config.medianClusterQuestions,
    config.maxQuestions,
  );
  const dampenerBeyond = getDampener(
    config.medianClusterQuestions,
    config.maxQuestions + 1,
    config.maxQuestions,
  );

  return (
    <div className="config-panel">
      <h2 className="config-title">Demo Configuration</h2>
      <div className="config-grid">
        <label className="cfg-label">
          checkpointPercentage
          <div className="cfg-input-row">
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={config.checkpointPercentage}
              onChange={(e) =>
                onChange("checkpointPercentage", Number(e.target.value))
              }
            />
            <span className="cfg-val">{config.checkpointPercentage}%</span>
          </div>
        </label>

        <label className="cfg-label">
          totalSteps
          <div className="cfg-input-row">
            <input
              type="range"
              min="2"
              max="14"
              step="1"
              value={config.totalSections}
              onChange={(e) =>
                onChange("totalSections", Number(e.target.value))
              }
            />
            <span className="cfg-val">{config.totalSections}</span>
          </div>
        </label>

        <label className="cfg-label">
          medianClusterQuestions
          <div className="cfg-input-row">
            <input
              type="range"
              min="2"
              max="61"
              step="1"
              value={config.medianClusterQuestions}
              onChange={(e) =>
                onChange("medianClusterQuestions", Number(e.target.value))
              }
            />
            <span className="cfg-val">{config.medianClusterQuestions}</span>
          </div>
        </label>

        <label className="cfg-label">
          maxQuestions
          <div className="cfg-input-row">
            <input
              type="range"
              min={config.medianClusterQuestions}
              max="100"
              step="1"
              value={config.maxQuestions}
              onChange={(e) => onChange("maxQuestions", Number(e.target.value))}
            />
            <span className="cfg-val">{config.maxQuestions}</span>
          </div>
        </label>
      </div>

      <div className="dampener-readout">
        <span className="dampener-label">dampener (sqrt-based):</span>
        <span className="dampener-formula">
          max(2, sqrt({config.medianClusterQuestions}))
        </span>
        <span className="dampener-value">= {dampenerNormal.toFixed(2)}</span>
      </div>
      <div className="dampener-readout anomaly">
        <span className="dampener-label">dampener beyond maxQuestions:</span>
        <span className="dampener-formula">
          max(1.5, {dampenerNormal.toFixed(2)} / 2)
        </span>
        <span className="dampener-value">= {dampenerBeyond.toFixed(2)}</span>
        <span className="dampener-note">
          — bar accelerates toward 99%, anomaly signal for logging
        </span>
      </div>
    </div>
  );
}

// ─── Phase badge ──────────────────────────────────────────────────────────────
function PhaseBadge({ answered, medianClusterQuestions, maxQuestions }) {
  const isBeyondMax = answered > maxQuestions;
  const isOvertime = answered > medianClusterQuestions;
  const overtimeSteps = answered - medianClusterQuestions;

  if (isBeyondMax) {
    return (
      <span className="phase-badge anomaly">
        ⚠ Beyond maxQuestions ({maxQuestions}) — anomaly, dampener halved
      </span>
    );
  }
  return (
    <span className={`phase-badge ${isOvertime ? "overtime" : "normal"}`}>
      {isOvertime
        ? `Phase 2 — Overtime (step +${overtimeSteps})`
        : "Phase 1 — Normal"}
    </span>
  );
}

// ─── Section names ────────────────────────────────────────────────────────────
const SECTION_NAMES = [
  "Onboarding",
  "Demographics",
  "Contact Details",
  "Situational Lifestyle",
  "Low Mood & Anxiety",
  "Phobia",
  "WSAS",
  "OCD",
  "PTSD",
  "Health Anxiety",
  "Main Problem",
  "Treatment History",
  "Other Concerns",
  "Submission",
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [config, setConfig] = useState({
    checkpointPercentage: 80,
    totalSections: 14,
    medianClusterQuestions: 31,
    maxQuestions: 61,
  });

  const [sim, setSim] = useState({
    currentSection: 0,
    answeredInSection: 0,
  });

  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState({ message: "", visible: false });

  function fireToast(message) {
    setToast({ message, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1800);
  }

  function handleConfigChange(key, val) {
    setConfig((c) => ({ ...c, [key]: val }));
    setSim({ currentSection: 0, answeredInSection: 0 });
    setHistory([]);
  }

  function answer() {
    const next = sim.answeredInSection + 1;
    setSim((s) => ({ ...s, answeredInSection: next }));
    setHistory((h) => [
      ...h,
      {
        section: sim.currentSection,
        answered: next,
        pct: calcSectionPercentage(
          next,
          config.medianClusterQuestions,
          config.checkpointPercentage,
          config.maxQuestions,
        ),
      },
    ]);
  }

  function nextSection() {
    if (sim.currentSection >= config.totalSections - 1) return;
    const newSection = sim.currentSection + 1;
    setSim({ currentSection: newSection, answeredInSection: 0 });
    setHistory((h) => [
      ...h,
      {
        section: newSection,
        answered: 0,
        pct: 0,
        boundary: true,
      },
    ]);
  }

  function undo() {
    if (sim.answeredInSection === 0) {
      if (sim.currentSection === 0) return;
      const prevSection = sim.currentSection - 1;
      const prevAnswered = history.filter(
        (h) => h.section === prevSection && !h.boundary,
      ).length;
      setSim({ currentSection: prevSection, answeredInSection: prevAnswered });
      setHistory((h) => h.slice(0, -1));
    } else {
      setSim((s) => ({ ...s, answeredInSection: s.answeredInSection - 1 }));
      setHistory((h) => h.slice(0, -1));
    }
  }

  function reset() {
    setSim({ currentSection: 0, answeredInSection: 0 });
    setHistory([]);
  }

  const sectionPct = calcSectionPercentage(
    sim.answeredInSection,
    config.medianClusterQuestions,
    config.checkpointPercentage,
    config.maxQuestions,
  );
  const dampener = getDampener(
    config.medianClusterQuestions,
    sim.answeredInSection,
    config.maxQuestions,
  );
  const currentStep = sim.currentSection + 1;
  const totalSteps = config.totalSections;
  const currentLabel =
    SECTION_NAMES[sim.currentSection] || `Section ${currentStep}`;
  const nextLabel =
    sim.currentSection < config.totalSections - 1
      ? SECTION_NAMES[sim.currentSection + 1] || `Section ${currentStep + 1}`
      : null;

  const isBeyondMax = sim.answeredInSection > config.maxQuestions;
  const isOvertime = sim.answeredInSection > config.medianClusterQuestions;
  const overtimeSteps = sim.answeredInSection - config.medianClusterQuestions;

  return (
    <div className="app">
      <Toast message={toast.message} visible={toast.visible} />
      <div className="bar-wrapper">
        <ProgressStrip
          sectionPct={sectionPct}
          currentStep={currentStep}
          totalSteps={totalSteps}
          currentLabel={currentLabel}
          nextLabel={nextLabel}
          onToast={fireToast}
        />
      </div>

      <main className="main">
        <ConfigPanel config={config} onChange={handleConfigChange} />

        <div className="simulator">
          <h2 className="sim-title">Simulate User Journey</h2>

          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-val">{sim.answeredInSection}</span>
              <span className="stat-lbl">Answered in section</span>
            </div>
            <div className="stat-card">
              <span className="stat-val">{config.medianClusterQuestions}</span>
              <span className="stat-lbl">medianClusterQuestions</span>
            </div>
            <div className="stat-card accent">
              <span className="stat-val">{sectionPct}%</span>
              <span className="stat-lbl">sectionPercentage</span>
            </div>
            <div className={`stat-card ${isBeyondMax ? "warn" : ""}`}>
              <span className="stat-val">
                {isOvertime ? dampener.toFixed(2) : "—"}
              </span>
              <span className="stat-lbl">active dampener</span>
            </div>
          </div>

          <PhaseBadge
            answered={sim.answeredInSection}
            medianClusterQuestions={config.medianClusterQuestions}
            maxQuestions={config.maxQuestions}
          />

          <div className="formula-box">
            {!isOvertime ? (
              <span>
                Phase 1: ({sim.answeredInSection} /{" "}
                {config.medianClusterQuestions}) × {config.checkpointPercentage}{" "}
                = <strong>{sectionPct}%</strong>
              </span>
            ) : (
              <span>
                Phase 2: {config.checkpointPercentage} + (
                {99 - config.checkpointPercentage} × ({overtimeSteps} / (
                {overtimeSteps} + {dampener.toFixed(2)}))) ={" "}
                <strong>{sectionPct}%</strong>
                <br />
                dampener ={" "}
                {isBeyondMax
                  ? `max(1.5, sqrt(${config.medianClusterQuestions}) / 2) — beyond maxQuestions (${config.maxQuestions}), anomaly mode`
                  : `max(2, sqrt(${config.medianClusterQuestions})) = ${dampener.toFixed(2)}`}
              </span>
            )}
          </div>

          <div className="btn-row">
            <button className="btn primary" onClick={answer}>
              ＋ Answer Question
            </button>
            <button
              className="btn secondary"
              onClick={undo}
              disabled={sim.answeredInSection === 0 && sim.currentSection === 0}
            >
              ← Undo
            </button>
            <button
              className="btn success"
              onClick={nextSection}
              disabled={sim.currentSection >= config.totalSections - 1}
            >
              Next Section →
            </button>
            <button className="btn ghost" onClick={reset}>
              Reset
            </button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="history">
            <h3 className="history-title">Answer Log</h3>
            <div className="history-list">
              {[...history].reverse().map((h, i) => (
                <div
                  key={i}
                  className={`history-row ${h.boundary ? "boundary" : ""}`}
                >
                  {h.boundary ? (
                    <span className="history-boundary">
                      showSectionToast: true ⟶{" "}
                      <strong>
                        {SECTION_NAMES[h.section] || `Section ${h.section + 1}`}
                      </strong>
                      &nbsp;— bar resets to 0%
                    </span>
                  ) : (
                    <>
                      <span className="history-section">
                        {SECTION_NAMES[h.section]}{" "}
                        {h.jumped && (
                          <em className="jumped-tag">cluster jump</em>
                        )}
                      </span>
                      <span className="history-q">Q{h.answered}</span>
                      <span
                        className={`history-pct ${h.answered > config.medianClusterQuestions ? "overtime" : ""}`}
                      >
                        {h.pct}%
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
