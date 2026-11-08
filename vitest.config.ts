import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/shared/src/**/*.test.ts", "apps/web/src/config/**/*.test.ts", "apps/web/src/art/**/*.test.ts"],
    environment: "node",
    globals: true,
  },
});
