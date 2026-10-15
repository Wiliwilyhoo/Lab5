import { useState } from "react";

// STEP 1. Initial account data

const initialAccounts = [
    { name: "Alice", balance: 20 },
    { name: "Bob", balance: 10 },
    { name: "Carol", balance: 15 },
    { name: "David", balance: 30 },
    { name: "Emma", balance: 25 }
];


// STEP 2. Account Card Component


function AccountCard({ name, balance, sender, receiver }) {
  return (
    <div
      className={`account ${name.toLowerCase()}
        ${name === sender ? "selected-sender" : ""}
        ${name === receiver ? "selected-receiver" : ""}`}
    >
      <h3>{name}</h3>
      <h2>{balance}</h2>
      <p>Tokens</p>
    </div>
  );
}


// AccountSummary Component (Optional)

function AccountSummary({
  accountCount,
  totalTokens,
  transactionCount
}) {
  return (
    <div className="account-summary">
      <h3>Account Summary</h3>

      <p>Number of accounts: {accountCount}</p>
      <p>Total tokens: {totalTokens}</p>
      <p>Successful transactions: {transactionCount}</p>
    </div>
  );
}

// STEP 3. Transfer Form Component

function TransferForm({
    accounts,
    sender,
    receiver,
    amount,
    setSender,
    setReceiver,
    setAmount,
    onTransfer,
    onReset
}) {

    return (
        <div className="transfer-form">

            <div className="form-row">

                <div>
                    <label htmlFor="sender">Sender</label>

                    <select
                        id="sender"
                        value={sender}
                        onChange={(event) =>
                            setSender(event.target.value)
                        }
                    >
                        {accounts.map((account) => (
                            <option
                                key={account.name}
                                value={account.name}
                            >
                                {account.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="receiver">Receiver</label>

                    <select
                        id="receiver"
                        value={receiver}
                        onChange={(event) =>
                            setReceiver(event.target.value)
                        }
                    >
                        {accounts.map((account) => (
                            <option
                                key={account.name}
                                value={account.name}
                            >
                                {account.name}
                            </option>
                        ))}
                    </select>
                </div>

            </div>

            <label htmlFor="amount">
                Amount (tokens)
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
            />

            <div className="buttons">
                <button
                    id="transferBtn"
                    onClick={onTransfer}
                >
                    Transfer
                </button>

                <button
                    id="resetBtn"
                    onClick={onReset}
                >
                    Reset
                </button>
            </div>

        </div>
    );
}


// STEP 4. Transaction History Component

function TransactionHistory({
  transactions,
  onClearHistory
}) {
  return (
    <div>
      <h3>Transaction History</h3>
        {transactions.map((tx, index) => (
        <div className="transaction" key={tx.id}>
            <p>
            {index + 1}. {tx.from} → {tx.to}: {tx.amount} tokens
            </p>

            <small>Time: {tx.timestamp}</small>
        </div>
        ))}
      <button onClick={onClearHistory}>
        Clear History
      </button>
    </div>
  );
}

// STEP 5. Main App Component

export default function App() {

    const [accounts, setAccounts] = useState(
        initialAccounts.map(account => ({ ...account }))
    );

    const [sender, setSender] = useState("Alice");
    const [receiver, setReceiver] = useState("Bob");
    const [amount, setAmount] = useState("5");

    const [transactions, setTransactions] = useState([]);

    const [status, setStatus] = useState(
        "Ready to transfer tokens."
    );

    const [statusColor, setStatusColor] = useState("#666");

    // xóa history giao dịch

    function clearHistory() {
    setTransactions([]);
    setStatus("Transaction history cleared.");
    setStatusColor("#666");
    }


    // STEP 6. Transfer Function

    function transfer() {

        const value = Number(amount);

        if (sender === receiver) {

            setStatus(
                "Error: Sender and receiver must be different."
            );

            setStatusColor("red");
            return;
        }

        if (
            amount.trim() === "" ||
            !Number.isSafeInteger(value) ||
            value <= 0
        ) {

            setStatus(
                "Error: Enter a valid positive integer amount."
            );

            setStatusColor("red");
            return;
        }

        const senderAccount =
            accounts.find(account => account.name === sender);

        const receiverAccount =
            accounts.find(account => account.name === receiver);

        if (!senderAccount || !receiverAccount) {

            setStatus("Error: Account not found.");
            setStatusColor("red");
            return;
        }

        if (senderAccount.balance < value) {

            setStatus("Error: Insufficient balance.");
            setStatusColor("red");
            return;
        }

        if (
            !Number.isSafeInteger(receiverAccount.balance + value)
        ) {

            setStatus("Error: Balance exceeds supported range.");
            setStatusColor("red");
            return;
        }

        // Update balances without mutating existing state

        setAccounts(previousAccounts =>
            previousAccounts.map(account => {

                if (account.name === sender) {
                    return {
                        ...account,
                        balance: account.balance - value
                    };
                }

                if (account.name === receiver) {
                    return {
                        ...account,
                        balance: account.balance + value
                    };
                }

                return account;
            })
        );

        setTransactions(previousTransactions => [

            ...previousTransactions,

            {
                id: crypto.randomUUID(),
                from: sender,
                to: receiver,
                amount: value,
                timestamp: new Date().toLocaleString()
            }

        ]);

        setStatus(
            `Transfer successful! ${value} tokens sent from ${sender} to ${receiver}.`
        );

        setStatusColor("green");
    }


    // STEP 7. Reset Function

    function reset() {

        setAccounts(
            initialAccounts.map(account => ({ ...account }))
        );

        setSender("Alice");
        setReceiver("Bob");
        setAmount("5");

        setTransactions([]);

        setStatus("Simulation reset.");
        setStatusColor("#666");
    }


    // STEP 8. Calculate Total Balance

    const totalBalance = accounts.reduce(
        (sum, account) => sum + account.balance,
        0
    );

    // STEP 9. Render the Dashboard

    return (

        <div className="container">

            <header>
                <h1>React Banking Dashboard</h1>
                <span className="badge">
                    React Components
                </span>
            </header>

            <p className="subtitle">
                Interactive Token Transfer Simulation
            </p>

            <div className="accounts">

                {accounts.map(account => (

                    <AccountCard
                        key={account.name}
                        name={account.name}
                        balance={account.balance}
                        sender={sender}
                        receiver={receiver}     
                    />  

                ))}

            </div>

            <TransferForm
                accounts={accounts}
                sender={sender}
                receiver={receiver}
                amount={amount}
                setSender={setSender}
                setReceiver={setReceiver}
                setAmount={setAmount}
                onTransfer={transfer}
                onReset={reset}
            />


            <p
                id="status"
                style={{ color: statusColor }}
            >
                {status}
            </p>

            <AccountSummary
                accountCount={accounts.length}
                totalTokens={totalBalance}
                transactionCount={transactions.length}
            />  
            <hr />
            <TransactionHistory
                transactions={transactions}
                onClearHistory={clearHistory}
            />
        
            <div className="total">
                <strong>Total Balance</strong>

                <strong>{totalBalance} tokens</strong>
            </div>

            <p className="note">
                This is a local React simulation,
                not a blockchain transaction.
            </p>

        </div>

    );
}

