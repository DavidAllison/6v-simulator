import React, { useRef, useEffect } from 'react';

interface CanvasDebugTestProps {
  width?: number;
  height?: number;
}

export function CanvasDebugTest({ width = 300, height = 300 }: CanvasDebugTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Test 1: Draw a simple black line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(250, 50);
    ctx.stroke();

    // Test 2: Draw a red line
    ctx.strokeStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(50, 100);
    ctx.lineTo(250, 100);
    ctx.stroke();

    // Test 3: Draw a blue rectangle
    ctx.strokeStyle = '#0000ff';
    ctx.strokeRect(50, 150, 200, 50);

    // Test 4: Draw some text
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText('Canvas is working!', 50, 250);

    // Add a border to see canvas boundaries
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    console.log('Canvas debug test rendered');
  }, [width, height]);

  return (
    <div style={{ padding: '20px', background: '#f0f0f0' }}>
      <h3>Canvas Debug Test</h3>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          border: '2px solid purple',
          background: 'transparent',
        }}
      />
      <p>You should see:</p>
      <ul>
        <li>Black horizontal line</li>
        <li>Red horizontal line</li>
        <li>Blue rectangle</li>
        <li>Text saying "Canvas is working!"</li>
        <li>Green border around canvas</li>
      </ul>
    </div>
  );
}