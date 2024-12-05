// Get elements for delete modal
const deleteBtn = document.getElementById("deleteBtn");
const deleteModal = document.getElementById("deleteModal");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const passwordInput = document.getElementById("passwordInput");

// Get elements for card creation modal
const createBtn = document.getElementById("create");
const createCardModal = document.getElementById("createCardModal");
const cancelCreateCardBtn = document.getElementById("cancelCreateCardBtn");
const createCardForm = document.getElementById("createCardForm");

// Show the delete modal when the delete button is clicked
deleteBtn.addEventListener("click", () => {
    deleteModal.style.display = "flex"; // Show the modal
    deleteBtn.style.display = "none"; // Hide the delete button
});

// Close the delete modal when the cancel button is clicked
cancelDeleteBtn.addEventListener("click", () => {
    deleteModal.style.display = "none"; // Hide the modal
    deleteBtn.style.display = "block"; // Show the delete button again
});

// Handle account deletion when confirm is clicked
confirmDeleteBtn.addEventListener("click", async () => {
    const password = passwordInput.value;

    if (!password) {
        alert("Please enter your password.");
        return;
    }

    try {
        const response = await fetch("/delete-account", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: password }),
        });

        const result = await response.json();

        if (response.ok) {
            alert("Account deleted successfully.");
            window.location.href = "/login"; // Redirect to login page after deletion
        } else {
            alert(result.message || "Error deleting account.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred. Please try again.");
    }
});

// Show the card creation modal when the create button is clicked
createBtn.addEventListener("click", () => {
    createCardModal.style.display = "flex"; // Show the modal
});

// Close the card creation modal when the cancel button is clicked
cancelCreateCardBtn.addEventListener("click", () => {
    createCardModal.style.display = "none"; // Hide the modal
});

// Handle card creation when the form is submitted
createCardForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cardName = document.getElementById("cardName").value;
    const cardPosition = document.getElementById("cardPosition").value;
    const cardCompany = document.getElementById("cardCompany").value;
    const cardTag = document.getElementById("cardTag").value;

    if (!cardName || !cardPosition || !cardCompany || !cardTag) {
        alert("All fields are required.");
        return;
    }

    try {
        const response = await fetch("/create-card", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                cardName,
                cardPosition,
                cardCompany,
                cardTag
            }),
        });

        const result = await response.json();

        if (response.ok) {
            alert("Card created successfully.");
            window.location.reload(); // Reload the page to display the new card
        } else {
            alert(result.message || "Error creating card.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred. Please try again.");
    }
});