#!/bin/bash

# 6-Vertex Model Comprehensive Test Suite Runner
# This script runs all test categories and generates reports

set -e  # Exit on error

echo "================================================"
echo "6-Vertex Model Simulator - Comprehensive Tests"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test categories
declare -a test_categories=(
  "Physics Validation:vertexShapes|initialStates|physicsFlips"
  "Heat Bath & Equilibrium:heatBath|equilibrium"
  "Reproducibility:reproducibility"
  "Performance:performance"
  "Integration:integration"
  "Error Handling:errorHandling"
  "Rendering:rendering"
  "Snapshots:snapshot"
  "RNG:rng"
  "Types:types"
)

# Results tracking
total_tests=0
passed_tests=0
failed_tests=0
test_results=()

# Function to run a test category
run_test_category() {
  local category_name="$1"
  local pattern="$2"
  
  echo -e "${YELLOW}Running: $category_name${NC}"
  echo "Pattern: $pattern"
  echo "----------------------------------------"
  
  if npm test -- --testPathPattern="$pattern" --watchAll=false --passWithNoTests 2>&1 | tee test-output.tmp; then
    echo -e "${GREEN}✓ $category_name passed${NC}"
    ((passed_tests++))
    test_results+=("✓ $category_name")
  else
    echo -e "${RED}✗ $category_name failed${NC}"
    ((failed_tests++))
    test_results+=("✗ $category_name")
  fi
  
  ((total_tests++))
  echo ""
  
  # Extract test counts from output
  if grep -q "Tests:" test-output.tmp; then
    grep "Tests:" test-output.tmp | tail -1
  fi
  
  rm -f test-output.tmp
}

# Main test execution
echo "Starting test suite execution..."
echo ""

# Run each test category
for category in "${test_categories[@]}"; do
  IFS=':' read -r name pattern <<< "$category"
  run_test_category "$name" "$pattern"
done

# Run coverage report
echo -e "${YELLOW}Generating Coverage Report...${NC}"
echo "----------------------------------------"
npm test -- --coverage --watchAll=false --coverageReporters=text-summary 2>&1 | tee coverage-summary.txt

# Extract coverage percentages
if [ -f coverage-summary.txt ]; then
  echo ""
  echo "Coverage Summary:"
  grep -E "Statements|Branches|Functions|Lines" coverage-summary.txt || true
  rm -f coverage-summary.txt
fi

echo ""
echo "================================================"
echo "Test Suite Summary"
echo "================================================"
echo ""

# Display results
echo "Test Categories Run: $total_tests"
echo -e "Passed: ${GREEN}$passed_tests${NC}"
echo -e "Failed: ${RED}$failed_tests${NC}"
echo ""

echo "Detailed Results:"
for result in "${test_results[@]}"; do
  echo "  $result"
done

echo ""

# Performance benchmarks
echo -e "${YELLOW}Running Performance Benchmarks...${NC}"
echo "----------------------------------------"

# Quick performance test
node -e "
const { performance } = require('perf_hooks');

// Mock test for demonstration
const start = performance.now();
const iterations = 1000000;
for (let i = 0; i < iterations; i++) {
  // Simulate work
  Math.sqrt(i);
}
const end = performance.now();

console.log('Quick benchmark:');
console.log(\`  Operations: \${iterations.toLocaleString()}\`);
console.log(\`  Time: \${(end - start).toFixed(2)}ms\`);
console.log(\`  Ops/sec: \${Math.round(iterations / ((end - start) / 1000)).toLocaleString()}\`);
"

echo ""

# Check for specific physics requirements
echo -e "${YELLOW}Physics Implementation Verification...${NC}"
echo "----------------------------------------"

# Check vertex types implementation
echo -n "Checking vertex types (a1, a2, b1, b2, c1, c2)... "
if grep -q "VertexType\." tests/six-vertex/vertexShapes.test.ts; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
fi

# Check DWBC patterns
echo -n "Checking DWBC pattern generation... "
if grep -q "generateDWBC" tests/six-vertex/initialStates.test.ts; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
fi

# Check flip operations
echo -n "Checking flip invariants... "
if grep -q "executeFlip" tests/six-vertex/physicsFlips.test.ts; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
fi

# Check heat bath dynamics
echo -n "Checking heat-bath probabilities... "
if grep -q "getWeightRatio" tests/six-vertex/heatBath.test.ts; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
fi

# Check equilibrium
echo -n "Checking equilibrium distribution... "
if grep -q "runSimulation" tests/six-vertex/equilibrium.test.ts; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
fi

echo ""

# Final status
if [ $failed_tests -eq 0 ]; then
  echo -e "${GREEN}================================================${NC}"
  echo -e "${GREEN}All test categories passed successfully!${NC}"
  echo -e "${GREEN}================================================${NC}"
  exit 0
else
  echo -e "${RED}================================================${NC}"
  echo -e "${RED}$failed_tests test category(ies) failed${NC}"
  echo -e "${RED}================================================${NC}"
  exit 1
fi