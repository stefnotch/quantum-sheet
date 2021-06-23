import { createArchiveByFileExtension } from "@shockpkg/archive-files";
import fse from "fs-extra";
import path from "path";
import fetch from "node-fetch";
import util from "util";
import { pipeline } from "stream";

const streamPipeline = util.promisify(pipeline);
const outputDirectory = path.join(path.resolve(), "public/pyodide");
const filesWhitelist = [
  "pyodide.js",
  "pyodide.asm.wasm",
  "pyodide.asm.data.js",
  "pyodide.asm.data",
  "pyodide.asm.js",
  "pyodide-interrupts.js",
  "pyodide-interrupts.data",
  "packages.json",
  "sympy.js",
  "sympy.data",
  "mpmath.js",
  "mpmath.data",
  "numpy.js",
  "numpy.data",
];
// Maybe:
// micropip
// scipy
// matplotlib
// Request:
// gmpy

(async () => {
  const latestReleaseResponse = await fetch(
    "https://api.github.com/repos/iodide-project/pyodide/releases/latest"
  );
  if (!latestReleaseResponse.ok) {
    throw new Error(
      `unexpected release api response ${latestReleaseResponse.statusText}\nHeaders:\n${latestReleaseResponse.headers}`
    );
  }
  const latestRelease = await latestReleaseResponse.json();
  const latestReleaseAsset = latestRelease.assets.find((asset) =>
    asset.name.startsWith("pyodide-build")
  );
  console.log(`Downloading: ${latestReleaseAsset.url}`);

  const downloadResponse = await fetch(latestReleaseAsset.url, {
    headers: { Accept: "application/octet-stream" },
  });
  if (!downloadResponse.ok) {
    throw new Error(
      `unexpected download response ${latestReleaseResponse.statusText}\nHeaders:\n${latestReleaseResponse.headers}`
    );
  }
  await fse.remove(outputDirectory);
  await fse.ensureDir(outputDirectory);
  const outputArchivePath = path.join(outputDirectory, latestReleaseAsset.name);
  await streamPipeline(
    downloadResponse.body,
    fse.createWriteStream(outputArchivePath)
  );

  console.log(`Extracting ${outputArchivePath}`);

  const archive = createArchiveByFileExtension(outputArchivePath);
  const pyodideData = {
    version: latestRelease.tag_name,
    identifier: latestRelease.node_id,
  };
  await archive.read(async (entry) => {
    const entryPath = entry.path.replace(/^pyodide\//, "");
    if (filesWhitelist.includes(entryPath)) {
      await entry.extract(path.join(outputDirectory, entryPath));
    }
  });
  await fse.remove(outputArchivePath);
  await fse.writeFile(
    path.join(outputDirectory, "pyodide-data.json"),
    JSON.stringify(pyodideData),
    "utf8"
  );
  console.log("Done");
})();
