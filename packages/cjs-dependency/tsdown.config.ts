import { defineConfig } from "tsdown";

export default defineConfig({
  // forcing only cjs output
  format: ["cjs"],
  // emits separate output files per source module, which causes rolldown to use the require_<stem> naming convention
  unbundle: true,
  exports: true,
});
