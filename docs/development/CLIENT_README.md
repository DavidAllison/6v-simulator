# 6-Vertex Model Simulator

A browser-based interactive simulator for the 6-vertex model with Domain Wall Boundary Conditions (DWBC), implementing the physics from David Allison & Reshetikhin's paper "Numerical study of the 6-vertex model with DWBC" (arXiv:cond-mat/0502314).

## Features

- **Accurate Physics Implementation**: Direct port from reference C code with heat-bath Monte Carlo dynamics
- **Multiple Visualization Modes**: 
  - Paths (bold connected segments as in the paper)
  - Arrows (directional flow visualization)
  - Both (overlay mode)
  - Vertices (labeled vertex types)
- **DWBC Initial States**: Exact reproduction of High and Low configurations from the paper
- **Real-time Simulation**: Optimized for smooth performance up to N=100
- **Interactive Controls**: Adjust weights, temperature, and visualization parameters
- **Statistics Tracking**: Monitor acceptance rates, vertex distributions, and physical properties

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

Visit http://localhost:5173 after starting the development server.

## Project Structure

```
client/
├── src/
│   ├── lib/six-vertex/       # Physics engine
│   │   ├── types.ts          # Core types and vertex definitions
│   │   ├── vertexShapes.ts   # Vertex-to-edge mappings from paper
│   │   ├── initialStates.ts  # DWBC generators
│   │   ├── physicsFlips.ts   # Flip mechanics from C code
│   │   ├── simulation.ts     # Monte Carlo controller
│   │   └── renderer/         # Visualization
│   ├── components/           # UI components
│   ├── routes/              # Application routes
│   └── App.tsx              # Main application
└── tests/                   # Comprehensive test suite
```

## Visualization Modes

### Paths Mode
Shows bold connected segments without arrows, matching the paper's Figure 1 style. This is the default visualization for understanding the domain structure.

### Arrows Mode  
Displays directional arrows on edges to visualize the flow pattern. Useful for understanding the ice rule constraints.

### Both Mode
Overlays semi-transparent arrows on the path visualization, combining structural and directional information.

### Vertices Mode
Labels each vertex with its type (a₁, a₂, b₁, b₂, c₁, c₂) using color coding:
- Blue: a-type vertices
- Green: b-type vertices
- Orange: c-type vertices

## Physics Implementation

The simulator implements the 6-vertex model with:
- **Ice Rule**: Each vertex has exactly 2 arrows in and 2 arrows out
- **Heat-Bath Algorithm**: Metropolis-Hastings with detailed balance
- **2×2 Flip Updates**: Multi-cell updates as in the reference implementation
- **Height Function**: Tracks topological properties
- **Vertex Weights**: Configurable Boltzmann weights for each vertex type

## DWBC Configurations

### High Configuration
- c₂ vertices on the anti-diagonal
- b₁ vertices in upper-left triangle
- b₂ vertices in lower-right triangle
- Corresponds to Figure 2 in the paper

### Low Configuration
- c₂ vertices on the main diagonal
- a₁ vertices in upper-right triangle
- a₂ vertices in lower-left triangle
- Corresponds to Figure 3 in the paper

## Performance

Optimized implementation achieves:
- **N=24**: 600+ FPS
- **N=50**: 150+ FPS
- **N=100**: 30+ FPS

Uses Web Workers for large lattices (N≥50) to maintain UI responsiveness.

## Testing

Comprehensive test suite covering:
- Vertex shape mappings
- DWBC pattern verification
- Flip invariants and ice rule preservation
- Heat-bath probability distributions
- Equilibrium convergence
- Rendering accuracy
- Performance benchmarks

Run tests with:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Preview production build
npm run preview
```

## Routes

- `/` - Main simulator interface
- `/dwbc-verify` - Visual verification of DWBC patterns
- `/model-tests` - Interactive physics tests
- `/performance` - Performance benchmarking

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## References

- Allison, David and Reshetikhin, N. (2005). "Numerical study of the 6-vertex model with domain wall boundary conditions." arXiv:cond-mat/0502314.
- Original implementation: `attached_assets/main.c`

## License

Academic use only. Please cite the original paper when using this simulator.