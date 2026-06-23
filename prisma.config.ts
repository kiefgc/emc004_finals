// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        // No extra internal quotes!
        seed: "npx tsx ./prisma/seed.ts",
    },
    datasource: {
        url: env("DIRECT_URL"),
    },
});
