import { useState, useEffect, useRef } from "react";
import { calcSectionPercentage } from "./progressLogic";
import "./index.css";
import "./App.css";

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
  isNewSection,
}) {
  const [displayPct, setDisplayPct] = useState(sectionPct);
  const [transitioning, setTransitioning] = useState(false);
  const prevPct = useRef(sectionPct);
  const prevStep = useRef(currentStep);

  useEffect(() => {
    // Detect new section: step changed and new pct is 0 (same signal backend uses)
    if (currentStep !== prevStep.current && sectionPct === 0) {
      setTransitioning(true);
      setDisplayPct(100); // animate old bar to 100%
      const timer = setTimeout(() => {
        setTransitioning(false);
        setDisplayPct(0); // reset to fresh bar
        prevStep.current = currentStep;
        prevPct.current = 0;
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDisplayPct(sectionPct);
      prevPct.current = sectionPct;
      prevStep.current = currentStep;
    }
  }, [sectionPct, currentStep]);

  return (
    <div className="progress-strip">
      <div className="strip-inner">
        {/* Left: circular progress + label */}
        <div className="strip-left">
          <CircularProgress pct={displayPct} />
          <span className="section-label">
            Section {currentStep}/{totalSteps}: <strong>{currentLabel}</strong>
          </span>
        </div>

        {/* Right: next section label */}
        {nextLabel && (
          <span className="next-label">
            Next: <strong>{nextLabel}</strong>
          </span>
        )}

        {/* Help icon */}
        <button className="help-btn" aria-label="Help">
          ?
        </button>
      </div>

      {/* Linear bar below */}
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
  return (
    <div className="config-panel">
      <h2 className="config-title">Demo Configuration</h2>
      <div className="config-grid">
        <label className="cfg-label">
          Max Percentage
          <div className="cfg-input-row">
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={config.maxPercentage}
              onChange={(e) =>
                onChange("maxPercentage", Number(e.target.value))
              }
            />
            <span className="cfg-val">{config.maxPercentage}%</span>
          </div>
        </label>

        <label className="cfg-label">
          Total Sections
          <div className="cfg-input-row">
            <input
              type="range"
              min="2"
              max="6"
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
          Expected Questions (this section)
          <div className="cfg-input-row">
            <input
              type="range"
              min="2"
              max="61"
              step="1"
              value={config.expectedQuestions}
              onChange={(e) =>
                onChange("expectedQuestions", Number(e.target.value))
              }
            />
            <span className="cfg-val">{config.expectedQuestions}</span>
          </div>
        </label>
      </div>
    </div>
  );
}

// ─── Phase badge ──────────────────────────────────────────────────────────────
function PhaseBadge({ answered, expected }) {
  const isOvertime = answered > expected;
  return (
    <span className={`phase-badge ${isOvertime ? "overtime" : "normal"}`}>
      {isOvertime
        ? `Phase 2 — Overtime (step +${answered - expected})`
        : "Phase 1 — Normal"}
    </span>
  );
}

const SECTION_NAMES = [
  "Onboarding",
  "Demographics",
  "Contact Details",
  "Situational Lifestyle",
  "Low Mood & Anxiety",
  "Phobia",
];

export default function App() {
  const [config, setConfig] = useState({
    maxPercentage: 90,
    totalSections: 6,
    expectedQuestions: 12,
  });

  const [sim, setSim] = useState({
    currentSection: 0, // 0-based
    answeredInSection: 0,
  });

  const [history, setHistory] = useState([]);

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
          config.expectedQuestions,
          config.maxPercentage,
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
      // Undo across section boundary
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
    config.expectedQuestions,
    config.maxPercentage,
  );
  const currentStep = sim.currentSection + 1;
  const totalSteps = config.totalSections;
  const currentLabel =
    SECTION_NAMES[sim.currentSection] || `Section ${currentStep}`;
  const nextLabel =
    sim.currentSection < config.totalSections - 1
      ? SECTION_NAMES[sim.currentSection + 1] || `Section ${currentStep + 1}`
      : null;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="brand-dot" />
            Progress Bar
          </div>
        </div>
      </header>

      {/* Progress bar (pinned below header — mirrors product) */}
      <div className="bar-wrapper">
        <ProgressStrip
          sectionPct={sectionPct}
          currentStep={currentStep}
          totalSteps={totalSteps}
          currentLabel={currentLabel}
          nextLabel={nextLabel}
          isNewSection={sim.answeredInSection === 0}
        />
      </div>

      <main className="main">
        {/* Config */}
        <ConfigPanel config={config} onChange={handleConfigChange} />

        {/* Simulator */}
        <div className="simulator">
          <h2 className="sim-title">Simulate User Journey</h2>

          {/* Live stat row */}
          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-val">{sim.answeredInSection}</span>
              <span className="stat-lbl">Answered in section</span>
            </div>
            <div className="stat-card">
              <span className="stat-val">{config.expectedQuestions}</span>
              <span className="stat-lbl">Expected questions</span>
            </div>
            <div className="stat-card accent">
              <span className="stat-val">{sectionPct}%</span>
              <span className="stat-lbl">Section percentage</span>
            </div>
            <div className="stat-card">
              <span className="stat-val">
                {currentStep}/{totalSteps}
              </span>
              <span className="stat-lbl">Section</span>
            </div>
          </div>

          <PhaseBadge
            answered={sim.answeredInSection}
            expected={config.expectedQuestions}
          />

          {/* Formula display */}
          <div className="formula-box">
            {sim.answeredInSection <= config.expectedQuestions ? (
              <span>
                Phase 1: ({sim.answeredInSection} / {config.expectedQuestions})
                × {config.maxPercentage} = <strong>{sectionPct}%</strong>
              </span>
            ) : (
              <span>
                Phase 2: {config.maxPercentage} + ({99 - config.maxPercentage} ×
                ({sim.answeredInSection - config.expectedQuestions} / (
                {sim.answeredInSection - config.expectedQuestions} + 2))) ={" "}
                <strong>{sectionPct}%</strong>
              </span>
            )}
          </div>

          {/* Action buttons */}
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

        {/* History log */}
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
                      ⟶ New section:{" "}
                      <strong>
                        {SECTION_NAMES[h.section] || `Section ${h.section + 1}`}
                      </strong>
                      &nbsp;— bar resets to 0%
                    </span>
                  ) : (
                    <>
                      <span className="history-section">
                        {SECTION_NAMES[h.section]}
                      </span>
                      <span className="history-q">Q{h.answered}</span>
                      <span
                        className={`history-pct ${h.answered > config.expectedQuestions ? "overtime" : ""}`}
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

      <footer className="app-footer">
        Bar never reaches 100% through answering — only on section boundary hit.
        &nbsp;Phase 2 decay is asymptotic toward 99%.
      </footer>
    </div>
  );
}
