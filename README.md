# 6-Vertex Model Simulator

[![CI](https://github.com/DavidAllison/6v-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/DavidAllison/6v-simulator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript/React implementation of the 6-vertex model with Domain Wall Boundary Conditions (DWBC), based on the paper "Numerical study of the 6-vertex model with DWBC" by David Allison & Reshetikhin (2005).

![6-Vertex Model Simulation](docs/images/simulation-preview.png)

## Features

- **Interactive Simulation**: Real-time Monte Carlo simulation with configurable parameters
- **Multiple Visualization Modes**: Path flow, arrow directions, and vertex type displays
- **DWBC Configurations**: Support for both High and Low boundary conditions
- **Debug Tools**: Step-through flip operations and ice rule validation
- **Performance Optimized**: Efficient simulation engine with Web Workers support
- **Comprehensive Testing**: Full test suite ensuring physics accuracy

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with Canvas API support

### Installation

```bash
# Clone the repository
git clone https://github.com/DavidAllison/6v-simulator.git
cd 6v-simulator

# Install dependencies
cd client
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the simulator in action.

### Building for Production

```bash
cd client
npm run build
# Output will be in client/dist/
```

## Physics Background

The 6-vertex model is a statistical mechanics model originally developed to describe ice and ferroelectric materials. Each vertex represents a molecular configuration with the "ice rule" constraint: exactly 2 arrows point in and 2 arrows point out.

### Vertex Types

The model has six allowed vertex configurations:

- **a₁, a₂**: Source/sink configurations
- **b₁, b₂**: Straight-through configurations  
- **c₁, c₂**: Turn configurations

### Domain Wall Boundary Conditions (DWBC)

DWBC creates specific boundary arrow patterns that lead to interesting Arctic phenomena:

- **DWBC High**: Arrows in from top/right, out to bottom/left
- **DWBC Low**: Opposite pattern with diagonal Arctic regions

## Project Structure

```
6v-simulator/
├── client/                   # React application
│   ├── src/
│   │   ├── lib/six-vertex/  # Physics engine
│   │   ├── components/      # React components
│   │   ├── routes/          # Application pages
│   │   └── App.tsx          # Main application
│   └── tests/               # Test suite
├── docs/                    # Documentation
│   ├── development/         # Development guides
│   └── reference/           # Research papers
└── CLAUDE.md               # AI assistant instructions
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm test            # Run test suite
```

### Key Routes

- `/` - Main simulator interface
- `/dwbc-verify` - DWBC pattern verification
- `/flip-debug` - Step-through flip operations
- `/performance` - Performance testing tools

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the coding standards in CLAUDE.md
4. Ensure all tests pass
5. Submit a pull request

## Testing

The project includes comprehensive tests for:

- Vertex type mappings
- Ice rule preservation
- DWBC pattern generation
- Flip transformations
- Monte Carlo dynamics

Run tests with:

```bash
cd client
npm test
```

## Performance

The simulator is optimized for:

- **Small lattices (N ≤ 20)**: Real-time animation at 60 FPS
- **Medium lattices (N ≤ 50)**: Smooth interaction with slight delays
- **Large lattices (N > 50)**: Batch processing with Web Workers

## Research References

- Allison, David & Reshetikhin, N. (2005). "Numerical study of the 6-vertex model with DWBC". [arXiv:cond-mat/0502314v1](https://arxiv.org/abs/cond-mat/0502314)
- Original C implementation available in `docs/reference/attached_assets/main.c`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original research by David Allison and N. Reshetikhin
- Physics consultation and validation from the statistical mechanics community
- Built with React, TypeScript, and Vite

## Support

For issues, questions, or suggestions:

- Open an issue on [GitHub](https://github.com/DavidAllison/6v-simulator/issues)
- Check the [troubleshooting guide](CLAUDE.md#troubleshooting-guide)
- Review the [development documentation](docs/development/)# Test deployment Fri Aug 22 22:07:09 PDT 2025
# Deployment test Fri Aug 22 22:19:10 PDT 2025
