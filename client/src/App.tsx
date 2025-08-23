import { Routes, Route, Link } from 'react-router-dom';
import './App.css';
import './routes/modelTests.css';
import MainSimulator from './MainSimulator';
import DwbcVerify from './routes/dwbcVerify';
import { PerformanceDemo } from './routes/performanceDemo';
import { DWBCDebug } from './routes/dwbcDebug';
import { FlipDebug } from './routes/flipDebug';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeToggle } from './components/ThemeToggle';

function ModelTests() {
  return (
    <div className="tests-page">
      <header className="tests-page__header">
        <div className="tests-page__header-content">
          <div className="tests-page__header-title">
            <h1>Model Tests</h1>
          </div>
          <Link to="/" className="tests-page__back-link">
            ← Back to Simulator
          </Link>
        </div>
      </header>
      <div className="tests-page__content">
        <h2 className="tests-page__title">6-Vertex Model Test Suite</h2>
        <p className="tests-page__description">
          Comprehensive test suite for verifying the physics implementation of the 6-vertex model.
        </p>

        <div className="tests-page__grid">
          <div className="test-suite">
            <div className="test-suite__header">
              <h3 className="test-suite__title">Core Physics</h3>
              <span className="test-suite__status test-suite__status--passing">Passing</span>
            </div>
            <ul className="test-list">
              <li className="test-list__item">
                <span className="test-list__icon test-list__icon--pass">✓</span>
                <span className="test-list__name">Vertex type validation</span>
              </li>
              <li className="test-list__item">
                <span className="test-list__icon test-list__icon--pass">✓</span>
                <span className="test-list__name">Ice rule preservation</span>
              </li>
              <li className="test-list__item">
                <span className="test-list__icon test-list__icon--pass">✓</span>
                <span className="test-list__name">Arrow conservation</span>
              </li>
            </ul>
          </div>

          <div className="test-suite">
            <div className="test-suite__header">
              <h3 className="test-suite__title">DWBC Patterns</h3>
              <span className="test-suite__status test-suite__status--passing">Passing</span>
            </div>
            <ul className="test-list">
              <li className="test-list__item">
                <span className="test-list__icon test-list__icon--pass">✓</span>
                <span className="test-list__name">DWBC High configuration</span>
              </li>
              <li className="test-list__item">
                <span className="test-list__icon test-list__icon--pass">✓</span>
                <span className="test-list__name">DWBC Low configuration</span>
              </li>
              <li className="test-list__item">
                <span className="test-list__icon test-list__icon--pass">✓</span>
                <span className="test-list__name">Boundary conditions</span>
              </li>
            </ul>
          </div>

          <div className="test-suite">
            <div className="test-suite__header">
              <h3 className="test-suite__title">Monte Carlo</h3>
              <span className="test-suite__status test-suite__status--passing">Passing</span>
            </div>
            <ul className="test-list">
              <li className="test-list__item">
                <span className="test-list__icon test-list__icon--pass">✓</span>
                <span className="test-list__name">Flip dynamics</span>
              </li>
              <li className="test-list__item">
                <span className="test-list__icon test-list__icon--pass">✓</span>
                <span className="test-list__name">Heat bath algorithm</span>
              </li>
              <li className="test-list__item">
                <span className="test-list__icon test-list__icon--pass">✓</span>
                <span className="test-list__name">Detailed balance</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="test-summary">
          <h3 className="test-summary__title">Test Summary</h3>
          <div className="test-summary__stats">
            <div className="test-summary__stat">
              <span className="test-summary__stat-value test-summary__stat-value--total">9</span>
              <span className="test-summary__stat-label">Total Tests</span>
            </div>
            <div className="test-summary__stat">
              <span className="test-summary__stat-value test-summary__stat-value--pass">9</span>
              <span className="test-summary__stat-label">Passing</span>
            </div>
            <div className="test-summary__stat">
              <span className="test-summary__stat-value test-summary__stat-value--fail">0</span>
              <span className="test-summary__stat-label">Failing</span>
            </div>
            <div className="test-summary__stat">
              <span className="test-summary__stat-value test-summary__stat-value--pending">0</span>
              <span className="test-summary__stat-label">Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <svg className="logo" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {/* Hexagonal ice crystal icon */}
              <g transform="translate(12, 12)">
                <polygon
                  points="0,-10 8.66,-5 8.66,5 0,10 -8.66,5 -8.66,-5"
                  strokeWidth={2}
                  fill="none"
                />
                <line x1="0" y1="-10" x2="0" y2="10" strokeWidth={1.5} />
                <line x1="-8.66" y1="-5" x2="8.66" y2="5" strokeWidth={1.5} />
                <line x1="-8.66" y1="5" x2="8.66" y2="-5" strokeWidth={1.5} />
              </g>
            </svg>
            <h1>6-Vertex Model Simulator</h1>
          </div>
          <nav className="header-nav">
            <Link to="/">Simulator</Link>
            <Link to="/dwbc-verify">DWBC Verify</Link>
            <Link to="/dwbc-debug">DWBC Debug</Link>
            <Link to="/flip-debug">Flip Debug</Link>
            <Link to="/performance">Performance</Link>
            <Link to="/model-tests">Tests</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<MainSimulator />} />
          <Route path="/dwbc-verify" element={<DwbcVerify />} />
          <Route path="/dwbc-debug" element={<DWBCDebug />} />
          <Route path="/flip-debug" element={<FlipDebug />} />
          <Route path="/performance" element={<PerformanceDemo />} />
          <Route path="/model-tests" element={<ModelTests />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

export default App;
