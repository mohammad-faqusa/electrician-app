const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  login: (credentials) => ipcRenderer.invoke("login", credentials),
  onDevices: (callback) =>
    ipcRenderer.on("devices-data", (event, data) => callback(data)),
  emitWithAck: (channel, data) => ipcRenderer.invoke(channel, data),
});
