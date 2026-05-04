import "dotenv/config";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";

const PORT = Number(process.env.PORT) || 5000;

async function main() {
  await connectDatabase();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
