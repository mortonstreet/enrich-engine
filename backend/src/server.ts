import { config } from "@/config";
import { app } from "@/api/app";
import { startWorker } from "@/worker";
import logger from "@/lib/logger";

const asciiArt = `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ██╗   ██╗███████╗███████╗███████╗███████╗███████╗   ║
║   ╚██╗ ██╔╝██╔════╝██╔════╝██╔════╝██╔════╝██╔════╝   ║
║    ╚████╔╝ █████╗  █████╗  █████╗  █████╗  █████╗     ║
║     ╚██╔╝  ██╔══╝  ██╔══╝  ██╔══╝  ██╔══╝  ██╔══╝     ║
║      ██║   ███████╗███████╗███████╗███████╗███████╗   ║
║      ╚═╝   ╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝   ║
║                                                       ║
║          🚀 Server is running on port ${config.port} 🚀         ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`;

app.listen(config.port, () => {
  console.log(asciiArt);
});

startWorker().catch((error: Error) => {
  logger.error({ error }, "Error starting Worker service");
  process.exit(1);
});

export default app;
