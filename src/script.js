
/*
 LAB 5.1 – Simple Transaction Manager
 JavaScript Fundamentals
*/

// STEP 1. Create initial account balances

const initialBalances = {
    Alice: 20,
    Bob: 10,
    Carol: 15,
    David: 30,
};

// Store current account balances
let balances = { ...initialBalances };

// Store successful transactions
let transactions = [];


// STEP 2. Update the interface

function updateDisplay() {

    document.getElementById("aliceBalance").textContent =
        balances.Alice;

    document.getElementById("bobBalance").textContent =
        balances.Bob;

    document.getElementById("carolBalance").textContent =
        balances.Carol;

    document.getElementById("davidBalance").textContent =
        balances.David; 
        
    // Calculate total balance
    const total =
        balances.Alice + balances.Bob + balances.Carol + balances.David;

    document.getElementById("totalBalance").textContent =
        total;

    // Update transaction count
    document.getElementById("transactionCount").textContent =
        transactions.length + " transactions";
}


// STEP 3. Process token transfers

function transfer() {

    // Get input values
    const sender =
        document.getElementById("sender").value;

    const receiver =
        document.getElementById("receiver").value;

    const amountText =
        document.getElementById("amount").value;

    const amount = Number(amountText);

    const status =
        document.getElementById("status");


    // Validate sender and receiver
    if (sender === receiver) {

        status.textContent =
            "Error: Sender and receiver must be different.";

        status.style.color = "red";
        return;
    }


    // Validate transfer amount
    if (
        amountText.trim() === "" ||
        !Number.isSafeInteger(amount) ||
        amount <= 0
    ) {

        status.textContent =
            "Error: Enter a valid positive integer amount.";

        status.style.color = "red";
        return;
    }


    // Validate account names
    if (
        !Object.prototype.hasOwnProperty.call(balances, sender) ||
        !Object.prototype.hasOwnProperty.call(balances, receiver)
    ) {

        status.textContent =
            "Error: Account not found.";

        status.style.color = "red";
        return;
    }


    // Check sufficient balance
    if (balances[sender] < amount) {

        status.textContent =
            "Error: Insufficient balance.";

        status.style.color = "red";
        return;
    }


    // Deduct tokens from sender
    balances[sender] -= amount;

    // Add tokens to receiver
    balances[receiver] += amount;


    // Save successful transaction
    transactions.push({
        from: sender,
        to: receiver,
        amount: amount
    });


    // Display success message
    status.textContent =
        `Transfer successful! ${amount} tokens sent from ${sender} to ${receiver}.`;

    status.style.color = "green";


    // Update the interface
    updateDisplay();

    // Update transaction history
    showHistory();

    console.log(
        "Transaction successful:",
        sender,
        "->",
        receiver,
        amount
    );
}


// STEP 4. Display transaction history

function showHistory() {

    const history =
        document.getElementById("history");

    // Clear the previous display
    history.innerHTML = "";

    // Display each successful transaction
    transactions.forEach(function(tx) {

        const item =
            document.createElement("div");

        item.className = "transaction";

        item.textContent =
            `${tx.from} → ${tx.to}: ${tx.amount} tokens`;

        history.appendChild(item);
    });
}


// STEP 5. Reset the simulation

function reset() {

    // Restore original balances
    balances = { ...initialBalances };

    // Clear transaction records
    transactions = [];

    // Reset status message
    const status =
        document.getElementById("status");

    status.textContent = "Simulation reset.";
    status.style.color = "#666";

    // Clear transaction history display
    document.getElementById("history").textContent =
        "No transactions yet.";

    // Update account balances
    updateDisplay();

    console.log("Simulation reset.");
}


// STEP 6. Initialize the application

function initializeApp() {

    const transferButton =
        document.getElementById("transferBtn");

    const resetButton =
        document.getElementById("resetBtn");

    // Check whether buttons exist
    if (!transferButton || !resetButton) {

        console.error(
            "Error: Transfer or Reset button not found. Check index.html."
        );

        return;
    }

    // Handle Transfer button click
    transferButton.addEventListener("click", transfer);

    // Handle Reset button click
    resetButton.addEventListener("click", reset);

    // Display initial balances
    updateDisplay();

    console.log("Simple Transaction Manager is ready!");
}


// STEP 7. Wait until the HTML is ready

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();

}
