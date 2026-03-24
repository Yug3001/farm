function goToSoil() {
  window.location.href = "soil.html";
}

function goToCrop() {
  window.location.href = "crop.html";
}

function goToPlanner() {
  window.location.href = "planner.html";
}

function sendQuestion() {
  const question = document.getElementById("question").value;

  if (question.trim() === "") {
    alert("Please enter your question 🌱");
    return;
  }

  alert("Advisor received:\n" + question);
  document.getElementById("question").value = "";
}

function goToReminders() {
  window.location.href = "reminders.html";
}