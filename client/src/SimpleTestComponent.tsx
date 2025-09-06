import React from 'react';

export function SimpleTestComponent() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Test Component</h1>
      <p>If you can see this, React routing is working!</p>
      <div style={{ padding: '20px', background: '#f0f0f0', marginTop: '20px' }}>
        <h2>Debug Information:</h2>
        <ul>
          <li>Component loaded: ✓</li>
          <li>React rendered: ✓</li>
          <li>Route matched: ✓</li>
        </ul>
      </div>
    </div>
  );
}