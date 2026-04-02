import { defineConfig } from "vite";

export default defineConfig({
  // "minify: false" so the `require_<X>` naming collision is clearly visible in the generated output
  build: { minify: false },
  optimizeDeps: {
    force: true,
    // force reproducing the error in dev mode
    include: [
      'cjs-dependency',
    ],
  },
});
