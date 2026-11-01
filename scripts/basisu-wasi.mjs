// Runs the official basisu WASI build (single-threaded) under Node's built-in WASI.
// usage: node basisu.mjs <basisu_st.wasm> <work_dir> [basisu args, paths relative to /work]
import { readFile } from "node:fs/promises";
import { WASI } from "node:wasi";

const [wasmPath, workDir, ...args] = process.argv.slice(2);
const wasi = new WASI({ version: "preview1", args: ["basisu", ...args], preopens: { "/work": workDir }, returnOnExit: true });
const instance = await WebAssembly.instantiate(await WebAssembly.compile(await readFile(wasmPath)), wasi.getImportObject());
process.exit(wasi.start(instance));
