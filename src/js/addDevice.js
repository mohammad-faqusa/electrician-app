document.addEventListener("DOMContentLoaded", async function () {
  console.log("this page is loaded");
  let selectedPeripherals = [];

  const form = document.getElementById("peripheralForm");
  const selectedPeripheralsInput = document.getElementById(
    "selectedPeripherals"
  );
  const addButton = document.getElementById("addPeripheral");
  const peripheralSelect = document.getElementById("peripheral");

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
});
