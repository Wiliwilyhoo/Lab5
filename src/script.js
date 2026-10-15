/*
 LAB 5.2 – Asynchronous Banking Transaction Simulator
 Topics: Promises, async/await, try/catch/finally
*/

// STEP 1. Application state

const initialBalance = 20;
const processingDelay = 5000;

let balance = initialBalance;
let transactions = [];
let isProcessing = false;

// EX4. Counter attempted transaction
let totalAttempts = 0;
// STEP 2. Update the interface

function updateDisplay() {

    document.getElementById("balance").textContent =
        balance;

    document.getElementById("transactionCount").textContent =
        totalAttempts + " total transactions";
}


// STEP 3. Display status messages

function showStatus(message, color = "#666") {

    const status =
        document.getElementById("status");

    status.textContent = message;
    status.style.color = color;
}


// STEP 4. Enable or disable controls

function setProcessing(processing) {

    isProcessing = processing;

    document.getElementById("depositBtn").disabled =
        processing;

    document.getElementById("withdrawBtn").disabled =
        processing;

    document.getElementById("resetBtn").disabled =
        processing;

    document.getElementById("amount").disabled =
        processing;
}


// STEP 5. Validate user input

function getValidAmount() {

    const amountText =
        document.getElementById("amount").value;

    const amount = Number(amountText);

    if (
        amountText.trim() === "" ||
        !Number.isSafeInteger(amount) ||
        amount <= 0
    ) {

        throw new Error(
            "Enter a valid positive integer amount."
        );
    }

    return amount;
}


// STEP 6. Simulate an asynchronous transaction

function simulateTransaction(type, amount) {

    return new Promise(function(resolve, reject) {

        setTimeout(function() {

            if (type === "Withdraw" && amount > balance) {

                reject(
                    new Error("Insufficient balance.")
                );

                return;
            }

            if (
                type === "Deposit" &&
                !Number.isSafeInteger(balance + amount)
            ) {

                reject(
                    new Error("Balance exceeds the supported range.")
                );

                return;
            }
            if (
                Math.random() < 0.2
            ) {
                reject(new Error("Simulated network error."));
                return;
            }

            resolve({
                type: type,
                amount: amount,
                success: true
            });

        }, processingDelay);

    });
}


// STEP 7. Process deposits asynchronously

async function deposit() {

    if (isProcessing) {
        return;
    }
      // NEW: Count every deposit attempt
    totalAttempts++;
    updateDisplay();
    let attemptedAmount = document.getElementById("amount").value;

    try {

        const amount = getValidAmount();
        attemptedAmount = amount;

        setProcessing(true);

        showStatus(
            "Processing deposit... Please wait.",
            "#2563eb"
        );

        const result =
            await simulateTransaction("Deposit", amount);

        balance += result.amount;

        transactions.push({
            type: "Deposit",
            amount: result.amount,
            balance: balance
        });

        showStatus(
            `Deposit successful! Added ${result.amount} tokens.`,
            "green"
        );

        updateDisplay();
        showHistory();

        console.log("Deposit completed:", result);

    } catch (error) {

        transactions.push({
            type: "Deposit",
            amount: attemptedAmount,
            balance: balance,
            success: false,
            error: error.message
        });
        showHistory();

        showStatus(
            "Transaction Failed: " + error.message,
            "red"
        );

        console.error(error.message);

    } finally {

        setProcessing(false);

        console.log("Deposit processing finished.");

    }
}


// STEP 8. Process withdrawals asynchronously

async function withdraw() {

    if (isProcessing) {
        return;
    }
      // NEW: Count every deposit attempt
    totalAttempts++;
    updateDisplay();
    let attemptedAmount = document.getElementById("amount").value;

    try {

        const amount = getValidAmount();
        attemptedAmount = amount;

        setProcessing(true);

        showStatus(
            "Processing withdrawal... Please wait.",
            "#2563eb"
        );

        const result =
            await simulateTransaction("Withdraw", amount);

        balance -= result.amount;

        transactions.push({
            type: "Withdrawal",
            amount: result.amount,
            balance: balance
        });

        showStatus(
            `Withdrawal successful! Removed ${result.amount} tokens.`,
            "green"
        );

        updateDisplay();
        showHistory();

        console.log("Withdrawal completed:", result);

    } catch (error) {

        transactions.push({
            type: "Withdrawal",
            amount: attemptedAmount,
            balance: balance,
            success: false,
            error: error.message
        });
        showHistory();

        showStatus(
            "Transaction Failed: " + error.message,
            "red"
        );

        console.error(error.message);

    } finally {

        setProcessing(false);

        console.log("Withdrawal processing finished.");

    }
}


// STEP 9. Display transaction history

function showHistory() {

    const history =
        document.getElementById("history");

    history.innerHTML = "";

    transactions.forEach(function(tx, index) {

        const item =
            document.createElement("div");

        item.className = "transaction";

        if (tx.success === false) {
            item.classList.add("transaction-failed");
            item.textContent =
                `${index + 1}. ${tx.type} failed (${tx.amount} tokens) | Balance: ${tx.balance} | ${tx.error}`;
        } else {
            const sign = tx.type === "Deposit" ? "+" : "-";
            item.textContent =
                `${index + 1}. ${tx.type}: ${sign}${tx.amount} tokens | Balance: ${tx.balance}`;
        }

        history.appendChild(item);
    });
}


// STEP 10. Reset the simulation

function reset() {

    if (isProcessing) {
        return;
    }

    balance = initialBalance;
    transactions = [];
    totalAttempts = 0;

    document.getElementById("amount").value = 5;

    document.getElementById("history").textContent =
        "No transactions yet.";

    showStatus("Simulation reset.");

    updateDisplay();

    console.log("Simulation reset.");
}


// STEP 11. Initialize the application

function initializeApp() {

    const depositButton =
        document.getElementById("depositBtn");

    const withdrawButton =
        document.getElementById("withdrawBtn");

    const resetButton =
        document.getElementById("resetBtn");

    if (
        !depositButton ||
        !withdrawButton ||
        !resetButton
    ) {

        console.error(
            "Required buttons not found. Check index.html."
        );

        return;
    }

    depositButton.addEventListener("click", deposit);

    withdrawButton.addEventListener("click", withdraw);

    resetButton.addEventListener("click", reset);

    updateDisplay();

    console.log("AsyncBank Simulator is ready!");
}


// STEP 12. Wait until HTML is ready

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();

}
