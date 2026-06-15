import { useNavigate } from 'react-router-dom';
import { BoundaryCondition } from '../lib/six-vertex/types';
import './PresetBar.css';

export interface VertexWeights {
  a1: number;
  a2: number;
  b1: number;
  b2: number;
  c1: number;
  c2: number;
}

export interface PresetConfig {
  latticeSize: number;
  boundaryCondition: BoundaryCondition;
  dwbcType: 'high' | 'low';
  weights: VertexWeights;
  run: boolean;
}

export interface PresetBarProps {
  onApplyPreset: (config: PresetConfig) => void;
}

interface PresetDefinition {
  id: string;
  label: string;
  caption: string;
  config: PresetConfig;
}

const UNIFORM_WEIGHTS: VertexWeights = { a1: 1, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 };

const PRESETS: PresetDefinition[] = [
  {
    id: 'arctic-circle',
    label: 'Arctic circle',
    caption: 'Order freezes in the corners; a circle in the middle stays random.',
    config: {
      latticeSize: 40,
      boundaryCondition: BoundaryCondition.DWBC,
      dwbcType: 'high',
      weights: { ...UNIFORM_WEIGHTS },
      run: true,
    },
  },
  {
    id: 'ice-point',
    label: 'Ice point',
    caption: 'Every arrangement equally likely — maximum disorder.',
    config: {
      latticeSize: 24,
      boundaryCondition: BoundaryCondition.DWBC,
      dwbcType: 'high',
      weights: { ...UNIFORM_WEIGHTS },
      run: false,
    },
  },
  {
    id: 'ferroelectric',
    label: 'Ferroelectric',
    caption: 'Straight paths dominate; the lattice locks into order.',
    config: {
      latticeSize: 24,
      boundaryCondition: BoundaryCondition.DWBC,
      dwbcType: 'high',
      weights: { a1: 3, a2: 3, b1: 1, b2: 1, c1: 1, c2: 1 },
      run: false,
    },
  },
];

function PresetBar({ onApplyPreset }: PresetBarProps) {
  const navigate = useNavigate();

  return (
    <section className="preset-bar" aria-label="Preset scenarios">
      <span className="preset-bar__lead">Presets:</span>
      <div className="preset-bar__items">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="preset-button"
            title={preset.caption}
            onClick={() => onApplyPreset(preset.config)}
          >
            <span className="preset-button__label">{preset.label}</span>
            <span className="preset-button__caption">{preset.caption}</span>
          </button>
        ))}
        <button
          type="button"
          className="preset-button preset-button--nav"
          title="See both domain-wall setups side by side."
          onClick={() => navigate('/dual-simulation')}
        >
          <span className="preset-button__label">Compare High vs Low</span>
          <span className="preset-button__caption">See both domain-wall setups side by side.</span>
        </button>
      </div>
    </section>
  );
}

export default PresetBar;
