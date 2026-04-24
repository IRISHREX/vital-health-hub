// Startup compatibility guard for React Three Fiber stack.
// React 18 requires @react-three/fiber ^8, @react-three/drei ^9, three >=0.133
// React 19 requires @react-three/fiber ^9, @react-three/drei ^10
//
// We read versions from each package's package.json via Vite's import. If we
// detect an incompatible combination we throw at import-time so the broken
// 3D scene never mounts and crashes the whole React tree with the cryptic
// "Cannot read properties of undefined (reading 'S')" reconciler error.

import React from 'react';
import reactPkg from 'react/package.json';
import fiberPkg from '@react-three/fiber/package.json';
import dreiPkg from '@react-three/drei/package.json';
import threePkg from 'three/package.json';

const major = (v) => parseInt(String(v).replace(/^[^\d]*/, '').split('.')[0], 10);

export const r3fVersions = {
  react: reactPkg.version,
  reactRuntime: React.version,
  fiber: fiberPkg.version,
  drei: dreiPkg.version,
  three: threePkg.version,
};

export function checkR3FCompatibility() {
  const issues = [];
  const reactMajor = major(r3fVersions.reactRuntime || r3fVersions.react);
  const fiberMajor = major(r3fVersions.fiber);
  const dreiMajor = major(r3fVersions.drei);
  const threeMinor = parseInt(String(r3fVersions.three).split('.')[1] || '0', 10);

  if (reactMajor === 18) {
    if (fiberMajor !== 8) {
      issues.push(`@react-three/fiber must be v8.x for React 18 (found ${r3fVersions.fiber}). v9+ requires React 19 and will crash with "Cannot read properties of undefined (reading 'S')".`);
    }
    if (dreiMajor !== 9) {
      issues.push(`@react-three/drei must be v9.x for React 18 (found ${r3fVersions.drei}).`);
    }
  } else if (reactMajor === 19) {
    if (fiberMajor < 9) issues.push(`@react-three/fiber should be v9+ for React 19 (found ${r3fVersions.fiber}).`);
    if (dreiMajor < 10) issues.push(`@react-three/drei should be v10+ for React 19 (found ${r3fVersions.drei}).`);
  }

  if (threeMinor < 133) {
    issues.push(`three must be >= 0.133 (found ${r3fVersions.three}).`);
  }

  return { ok: issues.length === 0, issues, versions: r3fVersions };
}

let cached;
export function assertR3FCompatible() {
  if (!cached) cached = checkR3FCompatibility();
  if (!cached.ok) {
    const msg = `[R3F compatibility check failed]\n- ${cached.issues.join('\n- ')}`;
     
    console.error(msg, cached.versions);
    throw new Error(msg);
  }
  return cached;
}
