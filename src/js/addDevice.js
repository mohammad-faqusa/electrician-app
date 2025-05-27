document.addEventListener("DOMContentLoaded", async function () {
  console.log("this page is loaded");

  let selectedPeripherals = [];
  let lastFormData = null;
  let isDisconnected = false;

  const form = document.getElementById("peripheralForm");
  const selectedPeripheralsInput = document.getElementById(
    "selectedPeripherals"
  );
  const addButton = document.getElementById("addPeripheral");
  const peripheralSelect = document.getElementById("peripheral");
  const messageScreen = document.getElementById("messageScreen");
  const messageContent = document.getElementById("messageContent");

  // Add peripheral to the list
  addButton.addEventListener("click", function () {
    console.log("clicked!");
    const peripheral = peripheralSelect.value;

    if (peripheral && !selectedPeripherals.includes(peripheral)) {
      // Add to array
      selectedPeripherals.push(peripheral);

      // Create list item
      const li = document.createElement("li");
      li.className = "peripheral-item";
      li.innerHTML = `
                <span>${peripheral}</span>
                <button type="button" class="btn-delete" data-peripheral="${peripheral}">×</button>
            `;

      // Add to list
      peripheralList.appendChild(li);

      // Update hidden input
      selectedPeripheralsInput.value = JSON.stringify(selectedPeripherals);

      // Reset select
      peripheralSelect.value = "";
    }
  });

  // Remove peripheral from the list
  peripheralList.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-delete")) {
      const button = e.target;
      const peripheral = button.getAttribute("data-peripheral");

      // Remove from array
      selectedPeripherals = selectedPeripherals.filter((p) => p !== peripheral);

      // Remove list item
      button.parentElement.remove();

      // Update hidden input
      selectedPeripheralsInput.value = JSON.stringify(selectedPeripherals);
    }
  });

  // Form submission
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = {
      name: document.getElementById("name").value,
      location: document.getElementById("location").value,
      peripherals: selectedPeripherals,
    };

    console.log("Form submitted:", formData);

    // Process the form submission
    processFormSubmission(formData);
  });

  // Event delegation for message content actions
  messageContent.addEventListener("click", function (e) {
    if (e.target.classList.contains("error-action-btn")) {
      const action = e.target.getAttribute("data-action");
      const errorId = e.target.getAttribute("data-error-id");

      handleErrorAction(action, errorId);
    }
  });

  // Process form submission
  async function processFormSubmission(formData) {
    // Store form data for retry functionality
    lastFormData = formData;

    // Show message screen
    form.style.display = "none";
    messageScreen.style.display = "block";

    // Clear previous messages
    messageContent.innerHTML = "";

    // Remove any existing continue button container
    const existingContinueContainer = document.querySelector(
      ".continue-button-container"
    );
    if (existingContinueContainer) {
      existingContinueContainer.remove();
    }

    // Add initial message
    addMessage(
      "Form submitted successfully! Connecting to server...",
      "success"
    );

    addMessage("Connecting to the server", "success");
    if (isDisconnected) {
      const errorDetails = {
        code: "err.message",
        id: "server-" + Date.now(),
        actionable: true,
        action: "reload",
        actionText: "reload the page",
      };

      addMessage("Disconnected from the server", "error", errorDetails);

      // Show error modal
      showErrorModal(
        "Disconnected from the server, please reload the page!",
        "SERVER_ERROR_500"
      );

      return;
    }
    addMessage("Sending Data to the server", "success");
    deviceId = await electronAPI.emitWithAck("addDevice", formData);
    if (deviceId == -1) {
      const errorDetails = {
        code: "err.message",
        id: "server-" + Date.now(),
        actionable: true,
        action: "reload",
        actionText: "reload the page",
      };

      addMessage("dublicated key name device", "error", errorDetails);
      return;
    }
    addMessage(
      `The device is added to the database, setup the device...`,
      "success"
    );
    // socket.emit("setupDevice", deviceId);

    electronAPI.on("processSetup", (res) => {
      addMessage(res.data, "success");

      if (res.status === "finished")
        addMessage(
          `the esp32 setup is finished successfully!`,
          "success",
          null,
          true
        );
    });

    electronAPI.on("errorSetup", (res) => {
      //   console.log("errorSetup: ", res.data);
      const errorDetails = {
        code: "err.message",
        id: "server-" + Date.now(),
        actionable: true,
        action: "reload",
        actionText: "reload the page",
      };

      if (res.status === "finished")
        addMessage(res.data, "error", errorDetails, true);
      else addMessage(res.data, "error", errorDetails);

      // Show error modal
      showErrorModal(res.data, "SERVER_ERROR_500");
    });
  }

  // Helper function to add a message to the message screen
  function addMessage(
    text,
    type = "info",
    errorDetails = null,
    isFinal = false
  ) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;

    // Add special class for final message
    if (isFinal) {
      messageDiv.classList.add("final-message");
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString();

    let messageHTML = `${text}<div class="message-time">${timeString}</div>`;

    // Add error details if provided
    if (errorDetails && type === "error") {
      messageHTML += `<div class="error-details">Error: ${errorDetails.code}</div>`;

      // Add action button based on error type
      if (errorDetails.actionable) {
        messageHTML += `<button class="error-action-btn" data-action="${errorDetails.action}" data-error-id="${errorDetails.id}">
                    ${errorDetails.actionText}
                </button>`;
      }
    }

    messageDiv.innerHTML = messageHTML;
    messageContent.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: "smooth" });

    // Add event listener to error action button if it exists
    if (errorDetails && errorDetails.actionable) {
      const actionButton = messageDiv.querySelector(".error-action-btn");
      if (actionButton) {
        actionButton.addEventListener("click", function () {
          const action = this.getAttribute("data-action");
          const errorId = this.getAttribute("data-error-id");

          handleErrorAction(action, errorId);
        });
      }
    }

    // Add continue button if this is the final message
    if (isFinal) {
      // Check if a continue button container already exists
      let continueContainer = document.querySelector(
        ".continue-button-container"
      );

      if (!continueContainer) {
        // Create container for continue button
        continueContainer = document.createElement("div");
        continueContainer.className = "continue-button-container";

        // Create continue button
        const continueButton = document.createElement("button");
        continueButton.className = "btn-continue";
        continueButton.textContent = "Continue to Dashboard";
        continueButton.addEventListener("click", function () {
          // Navigate to another page
          // window.location.href = "/devices"; // Change this to your desired URL
          electronAPI.emit("devicesPage", 123);
        });

        // Add button to container
        continueContainer.appendChild(continueButton);

        // Add container after the message content
        messageContent.parentNode.insertBefore(continueContainer, backToForm);
      }
    }
  }

  // Handle error action
  function handleErrorAction(action, errorId) {
    switch (action) {
      case "retry":
        addMessage("Retrying request...", "info");
        // Simulate retry logic
        setTimeout(() => {
          const random = Math.random();
          if (random > 0.5) {
            addMessage("Retry successful!", "success");
          } else {
            addMessage("Retry failed. Please try again later.", "error", {
              code: "RETRY_FAILED",
              id: "retry-" + Date.now(),
              actionable: true,
              action: "contact_support",
              actionText: "Contact Support",
            });
          }
        }, 1500);
        break;
      case "contact_support":
        addMessage("Opening support ticket...", "info");
        // Simulate opening support ticket
        setTimeout(() => {
          addMessage(
            "Support ticket #ST-" +
              Math.floor(Math.random() * 10000) +
              " created. Our team will contact you shortly.",
            "success"
          );
        }, 1000);
        break;
      case "check_status":
        addMessage("Checking request status...", "info");
        // Simulate checking status
        setTimeout(() => {
          addMessage(
            "Your request is still being processed. Please wait.",
            "info"
          );
        }, 1000);
        break;

      case "reload":
        window.location.href = "http://localhost:3000/addDevice";
        break;
      default:
        addMessage("Unknown action", "error");
    }
  }
});
