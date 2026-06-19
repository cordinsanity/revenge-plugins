// jszip's bundled promise polyfill reads `process.browser` unconditionally.
// React Native's JS engine has no global `process`, so without this stub
// loading the plugin would throw a ReferenceError before anything else runs.
globalThis.process = Object.assign({
  browser: true,
  env: {},
  version: "v16.0.0",
  nextTick: (cb, ...args) => setTimeout(() => cb(...args), 0),
}, globalThis.process);
