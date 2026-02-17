import { startServer } from "./src/server.ts";
import { resolveDefaultSessionConfig } from "./src/startup-config.ts";

const defaultSessionConfig = resolveDefaultSessionConfig();
await startServer({ defaultSessionConfig });
