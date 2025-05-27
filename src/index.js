const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const axios = require("axios");
const { io } = require("socket.io-client");

let mainWindow;
let socket = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
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
        });
      } catch (err) {
        console.error("❌ fetchDevices failed:", err);
      }
    });

    socket.on("disconnect", async () => {
      win.webContents.send("disconnect", 123);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
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
  // simulate fetch from DB
  // const user = { id: userId, name: "Mohammad", role: "Admin" };

  const onlineDevices = await socket.emitWithAck("onlineDevices", "123");

  return onlineDevices;
  // return user;
});

// Handle 'get-user-info' with acknowledgment
ipcMain.handle("getConnections", async (event, data) => {
  // simulate fetch from DB
  // const user = { id: userId, name: "Mohammad", role: "Admin" };

  const pinConnections = await socket.emitWithAck("getConnections", data);
  console.log("here is pin connections : ", pinConnections);

  return pinConnections;
  // return user;
});
// Handle move to add device page
ipcMain.on("addDevicePage", async (event, data) => {
  mainWindow.loadFile(path.join(__dirname, "addDevice.html"));
});
// Handle move to add device page
ipcMain.handle("addDevicePage", async (event, data) => {
  mainWindow.loadFile(path.join(__dirname, "addDevice.html"));

  return;
});

//
ipcMain.handle("addDevice_pList", async (event, data) => {
  const pList = await socket.emitWithAck("addDevice_pList", data);
  console.log("this is plist : ", pList);
  return pList;
});

ipcMain.handle("addDevice", async (event, data) => {
  const deviceId = await socket.emitWithAck("addDevice", data);
  return deviceId;
});

ipcMain.on("disonnect", async (event, data) => {
  socket.disconnect();
});

ipcMain.on("devicesPage", async (event, data) => {
  console.log(data);
  mainWindow.loadFile(path.join(__dirname, "dashboard.html"));
});
