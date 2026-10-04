import React, { useState, useEffect } from 'react';
import { CloseIcon, ChevronIcon, CheckIcon, ShieldOpenIcon } from '../../icons';

export interface TourStep {
  title: string;
  badge: string;
  description: string;
  targetTip: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Live Telemetry & Status Strip',
    badge: 'SYSTEM OVERVIEW',
    description:
      'The top status strip displays active WebSocket ingest connection, model inference latency, and running engine version in real time.',
    targetTip: 'Inspect the top bar anytime to check live streaming state and latency.',
  },
  {
    title: 'Deterministic Sigil Fingerprinting',
    badge: 'VISUAL RECOGNITION',
    description:
      'Every IP address generates a unique, deterministic geometric glyph using FNV-1a hashing. Spot recurring attacker signatures across feeds instantly before reading digits.',
    targetTip: 'Look for matching glyphs across alert queues and threat maps.',
  },
  {
    title: 'Two-Stage Hybrid Inference',
    badge: 'DETECTION ENGINE',
    description:
      'SignSight pairs an Isolation Forest anomaly gate with a multi-class LightGBM classifier to isolate unknown zero-day spikes and categorize known attack families.',
    targetTip: 'Review Stage 1 anomaly scores and Stage 2 confidence on any alert.',
  },
  {
    title: 'Geospatial Threat Topology',
    badge: 'INGRESS MAPPING',
    description:
      'Inspect simulated and real telemetry across interactive 2D Mercator and 3D orthographic globe projections with country aggregation.',
    targetTip: 'Filter by country or threat severity in the Threat Map view.',
  },
  {
    title: 'Analyst Feedback & Model Retraining',
    badge: 'SOC TRIAGE',
    description:
      'Commit True Positive and False Positive verdicts. Your decisions automatically populate the curated retraining candidate queue with full audit history.',
    targetTip: 'Use keyboard shortcuts (T / F / E / R) for rapid triage.',
  },
];

export const FirstRunTour: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('signsight_tour_completed');
    if (!hasSeenTour) {
      // Delay slightly for initial app mount
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener('signsight:start-tour', handleStartTour);
    return () => window.removeEventListener('signsight:start-tour', handleStartTour);
  }, []);

  const handleComplete = () => {
    localStorage.setItem('signsight_tour_completed', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        backgroundColor: 'var(--bg-1)',
        border: '1px solid var(--line-strong)',
        borderLeft: '4px solid var(--accent)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
        zIndex: 9000,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
      role="dialog"
      aria-labelledby="tour-heading"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldOpenIcon size={16} style={{ color: 'var(--accent)' }} />
          <span className="label-caps" style={{ color: 'var(--accent)' }}>
            {step.badge} &bull; {currentStep + 1}/{TOUR_STEPS.length}
          </span>
        </div>
        <button
          type="button"
          onClick={handleComplete}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '2px',
          }}
          aria-label="Close tour"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      {/* Content */}
      <div>
        <h3 id="tour-heading" className="font-display" style={{ fontSize: '16px', color: 'var(--text)', margin: '0 0 6px 0' }}>
          {step.title}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
          {step.description}
        </p>
      </div>

      {/* Target Tip */}
      <div
        style={{
          backgroundColor: 'var(--bg-2)',
          border: '1px solid var(--line)',
          padding: '8px 10px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text)',
        }}
      >
        <span style={{ color: 'var(--accent)', marginRight: '6px' }}>&rsaquo;</span>
        {step.targetTip}
      </div>

      {/* Step Indicators & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === currentStep ? '18px' : '6px',
                height: '4px',
                backgroundColor: i === currentStep ? 'var(--accent)' : 'var(--line)',
                transition: 'all 120ms ease',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="btn btn-secondary"
              style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
            >
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="btn btn-primary"
            style={{ height: '28px', fontSize: '11px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>{currentStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next'}</span>
            {currentStep === TOUR_STEPS.length - 1 ? <CheckIcon size={12} /> : <ChevronIcon size={12} direction="right" />}
          </button>
        </div>
      </div>
    </div>
  );
};
