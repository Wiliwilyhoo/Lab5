import { useState } from "react";

// STEP 1. Initial data

const initialAccounts = [
    { name: "Alice", balance: 20 },
    { name: "Bob", balance: 10 },
    { name: "Carol", balance: 15 },
    { name: "David", balance: 30 },
    { name: "Emma", balance: 25 }
];

const processingDelay = 1500;


// STEP 2. Reusable account selector

function AccountSelector({
    accounts,
    selectedAccount,
    onAccountChange,
    disabled
}) {

    return (
        <div>
            <label htmlFor="account">Select Account</label>

            <select
                id="account"
                value={selectedAccount}
                onChange={(event) =>
                    onAccountChange(event.target.value)
                }
                disabled={disabled}
            >
                {accounts.map(account => (
                    <option
                        key={account.name}
                        value={account.name}
                    >
                        {account.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

// EX2

function AccountList({ accounts }) {
  return (
    <div className="account-list">
      <h3>All Account Balances</h3>

      {accounts.map(account => (
        <p key={account.name}>
          {account.name}: {account.balance} tokens
        </p>
      ))}
    </div>
  );
}

// EX3

function TransactionSummary({ transactions }) {
  const totalDeposits = transactions.filter(
    tx => tx.type === "Deposit"
  ).length;

  const totalWithdrawals = transactions.filter(
    tx => tx.type === "Withdraw"
  ).length;

  return (
    <div className="transaction-summary">
      <h3>Transaction Summary</h3>

      <p>Successful Deposits: {totalDeposits}</p>
      <p>Successful Withdrawals: {totalWithdrawals}</p>
      <p>Total Transactions: {transactions.length}</p>
    </div>
  );
}


// STEP 3. Balance display component

function BalanceCard({ name, balance }) {

    return (
    <div
      className={`balance-card ${
        balance < 5 ? "low-balance" : ""
      }`}
    > 
            <p>Selected Account: {name}</p>

            <h2>{balance} Tokens</h2>
        </div>
    );
}


// STEP 4. Transaction history component

function TransactionHistory({ transactions }) {

    return (
        <div>
            <div className="history-header">
                <h3>Transaction History</h3>

                <span>
                    {transactions.length} transactions
                </span>
            </div>

            {transactions.length === 0 ? (

                <p>No transactions yet.</p>

            ) : (

                transactions.map((tx, index) => (

                    <div
                        className="transaction"
                        key={tx.id}
                    >
                        {index + 1}. {tx.account}:
                        {" "}{tx.type}
                        {" "}{tx.type === "Deposit" ? "+" : "-"}
                        {tx.amount} tokens
                        {" "} | Balance: {tx.balance}
                    </div>

                ))

            )}
        </div>
    );
}


// STEP 5. Main App

export default function App() {

    const [accounts, setAccounts] = useState(
        initialAccounts.map(account => ({ ...account }))
    );

    const [selectedAccount, setSelectedAccount] =
        useState("Alice");

    const [amount, setAmount] = useState("5");

    const [isConnected, setIsConnected] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);

    const [transactions, setTransactions] = useState([]);

    
    function clearHistory() {
      if (isProcessing) return;

      setTransactions([]);
      setMessage("Transaction history cleared.");
      setMessageColor("#666");
    }


    const [message, setMessage] = useState(
        "Connect a wallet to begin."
    );

    const [messageColor, setMessageColor] =
        useState("#666");


    // STEP 6. Get the selected account

    const currentAccount = accounts.find(
        account => account.name === selectedAccount
    );

    const currentBalance = currentAccount
        ? currentAccount.balance
        : 0;


    // STEP 7. Connect or disconnect wallet

    function toggleWallet() {

        if (isProcessing) {
            return;
        }

        setIsConnected(previous => !previous);

        if (isConnected) {
            setMessage("Wallet disconnected.");
        } else {
            setMessage("Wallet connected (simulation).");
        }

        setMessageColor("#666");
    }


    // STEP 8. Validate amount

    function getValidAmount() {

        const value = Number(amount);

        if (
            amount.trim() === "" ||
            !Number.isSafeInteger(value) ||
            value <= 0
        ) {
            throw new Error(
                "Enter a valid positive integer amount."
            );
        }

        return value;
    }


    // STEP 9. Simulate processing delay

    function waitForProcessing() {

        return new Promise(resolve => {
            setTimeout(resolve, processingDelay);
        });
    }


    // STEP 10. Handle transactions

    async function handleTransaction(type) {

        if (!isConnected || isProcessing) {
            return;
        }

        let started = false;

        try {

            const value = getValidAmount();

            if (!currentAccount) {
                throw new Error("Account not found.");
            }

            setIsProcessing(true);
            started = true;

            setMessage(
                `Processing ${type.toLowerCase()}... Please wait.`
            );

            setMessageColor("#2563eb");

            await waitForProcessing();

            if (
                type === "Withdraw" &&
                value > currentAccount.balance
            ) {
                throw new Error("Insufficient balance.");
            }

            if (
                type === "Deposit" &&
                !Number.isSafeInteger(currentAccount.balance + value)
            ) {
                throw new Error(
                    "Balance exceeds supported range."
                );
            }

            const newBalance =
                type === "Deposit"
                    ? currentAccount.balance + value
                    : currentAccount.balance - value;

            setAccounts(previousAccounts =>
                previousAccounts.map(account =>
                    account.name === selectedAccount
                        ? { ...account, balance: newBalance }
                        : account
                )
            );

            setTransactions(previousTransactions => [
                ...previousTransactions,
                {
                    id: crypto.randomUUID(),
                    account: selectedAccount,
                    type: type,
                    amount: value,
                    balance: newBalance
                }
            ]);

            setMessage(
                `${type} successful! ${value} tokens processed.`
            );

            setMessageColor("green");

        } catch (error) {

            setMessage(
                "Transaction Failed: " + error.message
            );

            setMessageColor("red");

        } finally {

            if (started) {
                setIsProcessing(false);
            }

        }
    }


    // STEP 11. Reset application

    function reset() {

        if (isProcessing) {
            return;
        }

        setAccounts(
            initialAccounts.map(account => ({ ...account }))
        );

        setSelectedAccount("Alice");
        setAmount("5");

        setIsConnected(false);
        setTransactions([]);

        setMessage("Simulation reset.");
        setMessageColor("#666");
    }


    // STEP 12. Render interface

    return (
        <div className="container">

            <header>
                <h1>Interactive Token Wallet</h1>

                <span className="badge">
                    React State & Events
                </span>
            </header>

            <p className="subtitle">
                Simulated Wallet Dashboard
            </p>

            <div className="wallet-status">
                <strong>
                    Wallet Status:
                    {" "}
                    {isConnected
                        ? "Connected"
                        : "Disconnected"}
                </strong>

                <button
                    id="connectBtn"
                    onClick={toggleWallet}
                    disabled={isProcessing}
                >
                    {isConnected
                        ? "Disconnect Wallet"
                        : "Connect Wallet"}
                </button>
            </div>

            <AccountList accounts={accounts} />

            <AccountSelector
                accounts={accounts}
                selectedAccount={selectedAccount}
                onAccountChange={setSelectedAccount}
                disabled={!isConnected || isProcessing}
            />

            <BalanceCard
                name={selectedAccount}
                balance={currentBalance}
            />

            <label htmlFor="amount">
                Transaction Amount (tokens)
            </label>

            <input
                id="amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) =>
                    setAmount(event.target.value)
                }
                disabled={!isConnected || isProcessing}
            />

            <div className="buttons">

                <button
                    id="depositBtn"
                    onClick={() =>
                        handleTransaction("Deposit")
                    }
                    disabled={!isConnected || isProcessing}
                >
                    Deposit
                </button>

                <button
                    id="withdrawBtn"
                    onClick={() =>
                        handleTransaction("Withdraw")
                    }
                    disabled={!isConnected || isProcessing}
                >
                    Withdraw
                </button>

            </div>

            <p
                id="message"
                style={{ color: messageColor }}
            >
                {message}
            </p>

            <hr />

            <TransactionSummary transactions={transactions} />

            <TransactionHistory
                transactions={transactions}
            />

            <button
              type="button"
              onClick={clearHistory}
              disabled={isProcessing}
            >
              Clear History
            </button>

            <button
                id="resetBtn"
                onClick={reset}
                disabled={isProcessing}
            >
                Reset Simulation
            </button>

            <p className="note">
                This is a local React simulation.
                No real blockchain wallet is connected.
            </p>

        </div>
    );
}

