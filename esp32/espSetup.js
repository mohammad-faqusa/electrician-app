const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const fs = require("fs");
const path = require("path");

// Replace with your actual port (or use "auto" if only one board is connected)
const port = "COM3";

// GitHub MIP package URLs

const peripherals_info = JSON.parse(
  fs.readFileSync(path.join(__dirname, "peripherals_info.json"))
);

async function prepareESP32(socket) {
  try {
    console.log("this is socket : ");
    console.log(socket);

    socket.send("processSetup", {
      status: "processing",
      data: "🔄 Resetting ESP32...",
    });
    console.log("🔄 Resetting ESP32...");

    await execPromise(`mpremote connect ${port} reset`);
    socket.send("processSetup", {
      status: "processing",
      data: "✅ Board reset.",
    });
    console.log("✅ Board reset.");

    // Optional: wait for 2 seconds before next command
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.log(`❌ Reset failed:", ${error.stderr || error.message}`);

    throw error;
  }
}

async function installLibraries(plist, socket) {
  console.log("here is the selected libraries : ", plist);
  console.log(peripherals_info[0]);
  const libraries = peripherals_info
    .filter((p) => plist.includes(p.name))
    .map((p) => [
      p.name,
      `github:mohammad-faqusa/mip-packages/${p.library_name}/package.json`,
    ]);
  console.log(libraries);
  libraries.push([
    "micropython-mqtt",
    `github:mohammad-faqusa/micropython-mqtt`,
  ]);
  for (const lib of libraries) {
    try {
      console.log(`📦 Installing ${lib[0]}...`);
      socket.send("processSetup", {
        status: "processing",
        data: `📦 Installing ${lib[0]}...`,
      });
      const { stdout } = await execPromise(
        `mpremote connect ${port} mip install ${lib[1]}`
      );
      socket.send("processSetup", {
        status: "processing",
        data: `✅ Installed:", ${stdout}`,
      });
      console.log("✅ Installed:", stdout);
    } catch (err) {
      console.error(
        `❌ Failed to install ${lib[0]}:`,
        err.stderr || err.message
      );
      throw err;
    }
  }
}

async function copyFilesToESP32(filesArray, socket) {
  for (const fileName of filesArray) {
    try {
      // const fileName = path.basename(file); // Target name on ESP32
      console.log(`📁 Uploading ${fileName} -> ESP32: ${fileName}`);
      socket.send("processSetup", {
        status: "processing",
        data: `📁 Uploading ${fileName} -> ESP32: ${fileName}`,
      });

      const command = `mpremote connect ${port} fs cp ${path.join(
        __dirname,
        fileName
      )} :${fileName}`;
      const { stdout } = await execPromise(command);
      console.log("✅ Uploaded:", fileName);
      socket.send("processSetup", {
        status: "processing",
        data: `✅ Uploaded: ${fileName}`,
      });
      if (stdout) console.log(stdout);
    } catch (err) {
      console.error(
        `❌ Failed to upload ${fileName}:`,
        err.stderr || err.message
      );
      throw err;
    }
  }
}

async function copyCleanupScriptToMain(socket) {
  try {
    sourceFilePath = path.join(__dirname, "clean_up.py");
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error("Source file does not exist");
    }

    socket.send("processSetup", {
      status: "processing",
      data: "📄 Preparing cleanup script...",
    });

    const tempMainPath = path.join(__dirname, "clean_up.py");
    const content = fs.readFileSync(sourceFilePath, "utf-8");
    fs.writeFileSync(tempMainPath, content);

    socket.send("processSetup", {
      status: "processing",
      data: "📁 Uploading cleanup script as main.py to ESP32...",
    });

    const { stdout } = await execPromise(
      `mpremote fs cp ${tempMainPath} :boot.py`
    );
    socket.send("processSetup", {
      status: "processing",
      data: "✅ Cleanup script copied as main.py successfully!",
    });
  } catch (err) {
    throw new Error(`❌ Failed to upload cleanup script: ${err.message}`);
  }
}

async function espSetup(id, plist, socket) {
  try {
    console.log("start espSetup");
    console.log("this is socket");
    console.log(socket);
    await prepareESP32(socket);
    console.log("prepareESP32");
    await copyCleanupScriptToMain(socket);
    console.log("copyCleanupScriptToMain");
    await prepareESP32(socket);
    console.log("prepareESP32");
    await installLibraries(plist, socket);
    console.log("installLibraries");
    await copyFilesToESP32(["main.py", "boot.py"], socket);
    console.log("copyFilesToESP32");
    socket.send("processSetup", {
      status: "finished",
      data: `the esp32 setup is finished successfully!`,
    });
    await prepareESP32(socket);
  } catch (error) {
    console.log(error.stderr || error.message);
    socket.send("errorSetup", {
      status: "error",
      data: `❌failed:", ${error.stderr || error.message}`,
    });
    throw error;
  }
}

module.exports = espSetup;
