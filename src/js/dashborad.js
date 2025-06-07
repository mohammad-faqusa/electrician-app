onlineDevices = {};

let devices = [];

(async () => {
  const receivedDevices = await electronAPI.emitWithAck("fetchDevices");
  devices = receivedDevices;
  renderCards(devices);

  openOnClick(devices);
})();

// window.electronAPI.on((receivedDevices) => {
//   devices = receivedDevices;
//   renderCards(devices);

//   openOnClick(devices);
// });
window.electronAPI.on("hello", (receivedDevices) => {
  console.log(receivedDevices);
});

electronAPI.emit("devices-list", "hi from the client");

function renderCards(devices) {
  const deviceGrid = document.querySelector(".device-grid");
  deviceGrid.innerHTML = "";
  devices.forEach((device) => {
    console.log(device);
    const card = document.createElement("div");
    card.className = "device-card";
    card.id = `device-card-${device.id}`;
    card.innerHTML = `
            <img src="${device.image}" alt="${device.name}" class="device-image">
            <div class="device-info">
                <h2 class="device-name">${device.name}</h2>
                <p class="device-id">ID: ${device.id}</p>
                <div class="device-status">
                    <span class="status-indicator status-${device.status}"></span>
                    <span class="status-text status-${device.status}-text">${device.status}</span>
                </div>
            </div>
        `;
    deviceGrid.appendChild(card);
  });
}

function openOnClick(devices) {
  // Create a single instance of DynamicDeviceModal
  const deviceModal = new DynamicDeviceModal();
  // Add click event to each device card
  const deviceCards = document.querySelectorAll(".device-card");
  deviceCards.forEach((card) => {
    card.addEventListener("click", async () => {
      const deviceId = card.id.toString().split("-")[2];
      const device = devices.find((dev) => dev.id === deviceId * 1);
      console.log("this is device in openOnClick : ", device);
      deviceModal.showDevice(device);
    });
  });
}

const displayInterval = setInterval(async () => {
  const onlineDevices = await electronAPI.emitWithAck("online-devices", 123);
  console.log(onlineDevices);
  renderDevicesStatus(devices, onlineDevices);
}, 4000);

function renderDevicesStatus(devices, onlineDevices) {
  devices.forEach((device) => {
    console.log("this is device id : ", device.id);
    console.log("this is online devices : ", onlineDevices);
    device.status = isDeviceActive(device.id, onlineDevices)
      ? "online"
      : "offline";
    console.log(device.status);
    const status = document.querySelector(
      `#device-card-${device.id} .device-status`
    );
    status.innerHTML = `
<div class="device-status">
    <span class="status-indicator status-${device.status}"></span>
    <span class="status-text status-${device.status}-text">${device.status}</span>
</div>
`;
  });
}

function isDeviceActive(deviceId, onlineDevices, thresholdMs = 10000) {
  const lastSeen = onlineDevices[deviceId];
  console.log("this is last seen : ", lastSeen);
  if (!lastSeen) return false;
  console.log(Date.now() - lastSeen);
  return Date.now() - lastSeen <= thresholdMs;
}

const addDeviceButton = document.getElementById("add-device-button");

addDeviceButton.addEventListener("click", () => {
  electronAPI.emit("addDevicePage", 123);
});
