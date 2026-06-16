import { Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import MainSimulator from './MainSimulator';
import DwbcVerify from './routes/dwbcVerify';
import { PerformanceDemo } from './routes/performanceDemo';
import { DWBCDebug } from './routes/dwbcDebug';
import { FlipDebug } from './routes/flipDebug';
import { DualSimulation } from './routes/dualSimulation';
import { NSimulation } from './routes/nSimulation';
import { HeightDemo } from './routes/heightDemo';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeToggle } from './components/ThemeToggle';

const isDev = import.meta.env.DEV;

function App() {
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <svg
              className="logo"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
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
            <div className="header-titles">
              <h1>6-Vertex Model Simulator</h1>
              <p className="header-eyebrow">Monte Carlo · domain-wall boundaries</p>
            </div>
          </div>

          <nav className="header-nav" aria-label="Primary">
            <div className="nav-group nav-group--primary">
              {/* Blank label keeps this group the same height as the labelled
                  groups so every nav link aligns on a common row. */}
              <span className="nav-group__label" aria-hidden="true">
                &nbsp;
              </span>
              <div className="nav-group__items">
                <NavLink to="/" className="nav-link" end>
                  Simulator
                </NavLink>
              </div>
            </div>

            <div className="nav-group">
              <span className="nav-group__label" id="nav-group-learn">
                Learn
              </span>
              <div className="nav-group__items" aria-labelledby="nav-group-learn">
                <NavLink to="/dual-simulation" className="nav-link">
                  Compare High vs Low
                </NavLink>
                <NavLink to="/n-simulation" className="nav-link">
                  Compare N Sims
                </NavLink>
                <NavLink to="/height-demo" className="nav-link">
                  Height Function
                </NavLink>
                <NavLink to="/dwbc-verify" className="nav-link">
                  DWBC Patterns
                </NavLink>
              </div>
            </div>

            {isDev && (
              <div className="nav-group">
                <span className="nav-group__label" id="nav-group-dev">
                  Developer
                </span>
                <div className="nav-group__items" aria-labelledby="nav-group-dev">
                  <NavLink to="/dwbc-debug" className="nav-link">
                    DWBC Debug
                  </NavLink>
                  <NavLink to="/flip-debug" className="nav-link">
                    Flip Debug
                  </NavLink>
                  <NavLink to="/performance" className="nav-link">
                    Performance
                  </NavLink>
                </div>
              </div>
            )}

            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="main-content">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<MainSimulator />} />
            <Route path="/dwbc-verify" element={<DwbcVerify />} />
            <Route path="/dwbc-debug" element={<DWBCDebug />} />
            <Route path="/flip-debug" element={<FlipDebug />} />
            <Route path="/dual-simulation" element={<DualSimulation />} />
            <Route path="/n-simulation" element={<NSimulation />} />
            <Route path="/height-demo" element={<HeightDemo />} />
            <Route path="/performance" element={<PerformanceDemo />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
