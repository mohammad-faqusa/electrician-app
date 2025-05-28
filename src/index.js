const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const axios = require("axios");
const { io } = require("socket.io-client");
const fs = require("fs");

let mainWindow;
let socket = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer.html")); // default login page
}

app.whenReady().then(createWindow);

// ✅ Login + socket + dashboard redirect
ipcMain.handle("login", async (event, { email, password }) => {
  try {
    const response = await axios.post("http://localhost:3000/api/login", {
      email,
      password,
    });

    const jwtToken = response.data.token;

    socket = io("http://localhost:3000/electron", {
      transports: ["websocket"],
      auth: {
        token: jwtToken,
      },
    });

    socket.on("connect", async () => {
      console.log("✅ Electron socket connected:", socket.id);

      // ✅ Load dashboard page in renderer
      mainWindow.loadFile(path.join(__dirname, "dashboard.html")); // <-- your custom HTML file

      try {
        const devices = await socket.emitWithAck("fetchDevices", "all");
        console.log("✅ Devices fetched:", devices);
        // ✅ Send to renderer
        mainWindow.webContents.once("did-finish-load", () => {
          mainWindow.webContents.send("devices-data", devices);

          socket.on("disconnect", async () => {
            console.log("disconnected from the server");
            mainWindow.webContents.send("disconnect", 123);
          });

          socket.on("connect_error", (err) => {
            console.error("Socket error:", err.message);
          });

          socket.on("errorSetup", (err) => {
            console.error("Socket error:", err.message);
            mainWindow.webContents.send("errorSetup", 123);
          });

          socket.on("processSetup", (data) => {
            console.log(data);
            if (data.code) {
              if (data.codeName === "main")
                fs.writeFileSync("./main.py", data.code);
              if (data.codeName === "boot")
                fs.writeFileSync("./boot.py", data.code);
              mainWindow.webContents.send("processSetup", {
                data: data.data,
                status: data.status,
              });
            } else {
              mainWindow.webContents.send("processSetup", data);
            }
          });

          socket.on("hi-server", (data) => {
            console.log(data);
          });
        });
      } catch (err) {
        console.error("❌ fetchDevices failed:", err);
      }
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
});

// Handle 'online-devices' with acknowledgment
ipcMain.handle("online-devices", async (event, data) => {
  const onlineDevices = await socket.emitWithAck("onlineDevices", "123");

  return onlineDevices;
});

// Handle 'get-user-info' with acknowledgment
ipcMain.handle("getConnections", async (event, data) => {
  const pinConnections = await socket.emitWithAck("getConnections", data);
  console.log("here is pin connections : ", pinConnections);

  return pinConnections;
});

// Handle move to add device page
ipcMain.on("addDevicePage", async (event, data) => {
  mainWindow.loadFile(path.join(__dirname, "addDevice.html"));
});

ipcMain.handle("addDevice_pList", async (event, data) => {
  const pList = await socket.emitWithAck("addDevice_pList", data);
  console.log("this is plist : ", pList);
  return pList;
});

ipcMain.handle("addDevice", async (event, data) => {
  console.log("this is add devcie request : ", data);
  const deviceId = await socket.emitWithAck("addDevice", data);
  console.log("this is added devcie id to database", deviceId);
  return deviceId;
});

ipcMain.on("disonnect", async (event, data) => {
  socket.disconnect();
});

ipcMain.on("devicesPage", async (event, data) => {
  mainWindow.loadFile(path.join(__dirname, "dashboard.html"));
});

ipcMain.on("setupDevice", async (event, data) => {
  console.log("this is setup device emitting the socket ", data);
  socket.emit("hi", "hi again from electron");
  socket.emit("setupDevice", data);
});

ipcMain.handle("addDeviceForm", async (event, data) => {
  console.log(data);
  data.electron = "electron";
  return data;
});
