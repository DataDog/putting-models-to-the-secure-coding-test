import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(clientRoot, "dist");

await fs.copyFile(path.join(distRoot, "index.html"), path.join(distRoot, "404.html"));
