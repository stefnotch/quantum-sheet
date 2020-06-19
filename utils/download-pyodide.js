import ArchiveFiles from "@shockpkg/archive-files";
import fse from "fs-extra";
import path from "path";
import fetch from "node-fetch";
import util from "util";
import { pipeline } from "stream";

const streamPipeline = util.promisify(pipeline);
const outputDirectory = path.join(path.resolve(), "public/pyodide");

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
  const assetToDownload = latestRelease.assets.find((asset) =>
    asset.name.startsWith("pyodide-build")
  );
  console.log(`Downloading: ${assetToDownload.url}`);

  const downloadResponse = await fetch(assetToDownload.url, {
    headers: { Accept: "application/octet-stream" },
  });
  if (!downloadResponse.ok) {
    throw new Error(
      `unexpected download response ${latestReleaseResponse.statusText}\nHeaders:\n${latestReleaseResponse.headers}`
    );
  }
  await fse.remove(outputDirectory);
  await fse.ensureDir(outputDirectory);
  const outputPath = path.join(outputDirectory, assetToDownload.name);
  await streamPipeline(
    downloadResponse.body,
    fse.createWriteStream(outputPath)
  );
  console.log(`Extracting ${outputPath}`);

  const archive = ArchiveFiles.createArchiveByFileExtension(outputPath);
  const pyodideData = {
    version: latestRelease.tag_name,
    identifier: latestRelease.node_id,
  };
  await archive.read(async (entry) => {
    await entry.extract(path.join(outputDirectory, entry.path));
  });
  await fse.writeFile(
    path.join(outputDirectory, "pyodide-data.json"),
    JSON.stringify(pyodideData),
    "utf8"
  );
  console.log("Done");
})();
