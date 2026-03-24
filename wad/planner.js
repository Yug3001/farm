function goToSoil() {
  window.location.href = "soil.html";
}

function goToCrop() {
  window.location.href = "crop.html";
}

function refreshPlan() {
  const season = document.getElementById("seasonSelect").value;
  alert("Generating plan for " + season + " 🌱");
}

function goToAdvisor() {
  window.location.href = "advisor.html";
}

function goToReminders() {
  window.location.href = "reminders.html";
}
