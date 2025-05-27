document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const result = await window.electronAPI.login({ email, password });

  const status = document.getElementById("status");
  if (result.success) {
    status.innerText = "Login successful. Loading dashboard...";
    // No need to load file manually here – main.js will handle it
  } else {
    status.innerText = "Login failed: " + result.error;
  }
});
