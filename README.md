# Repro: `TypeError: require_<X> is not a function` - rolldown re-processing its own CJS output

## Summary

`vite build` silently generates broken code when bundling a CJS package whose files were themselves previously emitted by rolldown using "unbundle" mode.

The root cause is a naming collision: rolldown uses `require_<filestem>` as the variable name
for its `__commonJS` factory wrappers. When a source file already contains a local variable
with the same name (because it was previously emitted by rolldown), rolldown skips creating the
outer factory, yet still replaces `require("./file.cjs")` with `require_<X>()` inside the
wrapper body. The result is self-referencing code that crashes at runtime:

```js
var require_greet = require_greet();  // require_greet is never defined: TypeError
```

## Steps to Reproduce

```bash
pnpm install
pnpm build 
pnpm preview
```

Expected: `vite build` produces correct code.

Actual: `vite build` succeeds but generates code that throws at runtime:

```
TypeError: require_greet is not a function
```

In server-side-rendering setups that execute the SSR bundle during `vite build`
to produce static HTML, this TypeError causes the build to fail.

## Environment

- Vite: 8.0.5 (rolldown-powered build)
- tsdown: 0.21.7
- Node: 22.x
- pnpm: 10.x

## The Collision in Detail

### Source code

`packages/cjs-dependency` is built with **tsdown** (which uses rolldown internally). In particular it uses `unbundle: true`, which emits separate output files per source module. The generated `dist/index.cjs` uses rolldown's
`require_<stem>` naming convention for sub-module requires:

```js
// dist/index.cjs - emitted by tsdown/rolldown with unbundle: true
const require_greet = require("./greet.cjs");
exports.greet = require_greet.greet;
```

### What rolldown generates during `vite build`

The actual generated output (`dist/assets/index-*.js`):

```js
var import_dist = (/* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	var require_greet = require_greet();
	exports.greet = require_greet.greet;
})))();
```

There is **no outer factory** for `greet.cjs`. rolldown should have generated:

```js
// EXPECTED - but missing from the output:
var require_greet = __commonJSMin(((exports) => {
    exports.greet = function() { return "hello from cjs-dependency"; };
}));
```

**What might be happening**: rolldown sees `const require_greet = require("./greet.cjs")` in the
source and recognises that `require_greet` matches the factory name it would generate for
`greet.cjs` (the `require_<stem>` convention). It therefore **omits the outer factory**
(assuming it already exists), yet still replaces `require("./greet.cjs")` with `require_greet()`
inside the wrapper body.

The result is broken, self-referencing code: `var require_greet = require_greet()`.