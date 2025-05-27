const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  login: (credentials) => ipcRenderer.invoke("login", credentials),
  onDevices: (callback) =>
    ipcRenderer.on("devices-data", (event, data) => callback(data)),
  emitWithAck: (channel, data) => ipcRenderer.invoke(channel, data),
  // Listen for messages from main.js
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, data) => callback(data));
  },
  // Emit message to main.js (fire-and-forget)
  emit: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
});
