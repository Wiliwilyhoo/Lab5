import { useEffect, useRef, useState } from "react";
import { Web3 } from "web3";

import {
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    DEPLOYMENT_BLOCK
} from "./contract.js";

const SEPOLIA_CHAIN_ID = "11155111";

function shortenAddress(value) {
    if (!value) return "";
    return value.slice(0, 6) + "..." + value.slice(-4);
}

function errorMessage(error) {
    if (error?.code === 4001) {
        return "Request rejected in MetaMask.";
    }

    return error?.message || "Unknown error.";
}

function SummaryCard({ title, value }) {
    return (
        <div className="summary-card">
            <p>{title}</p>
            <h2>{value}</h2>
        </div>
    );
}

function TransactionHistory({ events }) {
    return (
        <section className="history-section">
            <h3>Recent Blockchain Events</h3>

            {events.length === 0 ? (
                <p>No events found for this account.</p>
            ) : (
                events.map(event => (
                    <div
                        className="event-item"
                        key={event.id}
                    >
                        <strong>{event.type}</strong>

                        <span>{event.amount} ETH</span>

                        <a
                            href={
                                "https://sepolia.etherscan.io/tx/" +
                                event.hash
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {shortenAddress(event.hash)}
                        </a>
                    </div>
                ))
            )}
        </section>
    );
}

export default function App() {

    const [account, setAccount] = useState("");
    const [chainId, setChainId] = useState("");

    const [walletBalance, setWalletBalance] =
        useState("0");

    const [depositedBalance, setDepositedBalance] =
        useState("0");

    const [contractBalance, setContractBalance] =
        useState("0");

    const [transactionCount, setTransactionCount] =
        useState("0");
    const [lastUpdated, setLastUpdated] = useState("");

    const [amount, setAmount] = useState("0.001");

    const [events, setEvents] = useState([]);
    const [eventFilter, setEventFilter] = useState("all");

    const [isProcessing, setIsProcessing] =
        useState(false);

    const [lookupAddress, setLookupAddress] = useState("");
    const [publicBalance, setPublicBalance] = useState("");

    const [status, setStatus] = useState(
        "Connect MetaMask to begin."
    );

    const [statusType, setStatusType] = useState("info");

    const [transactionHash, setTransactionHash] =
        useState("");

    const [receiptInfo, setReceiptInfo] = useState(null);
    const [transactionBalance, setTransactionBalance] = useState(null);

    const sessionRef = useRef(0);
    const busyRef = useRef(false);

    const isSepolia = chainId === SEPOLIA_CHAIN_ID;

    const validContract = Web3.utils.isAddress(
        CONTRACT_ADDRESS
    );

    function updateStatus(message, type = "info") {
        setStatus(message);
        setStatusType(type);
    }

    function clearBlockchainData() {
        setWalletBalance("0");
        setDepositedBalance("0");
        setContractBalance("0");
        setTransactionCount("0");
        setEvents([]);
        setTransactionHash("");
        setReceiptInfo(null);
        setTransactionBalance(null);
    }

    function getContract(web3) {
        return new web3.eth.Contract(
            CONTRACT_ABI,
            CONTRACT_ADDRESS
        );
    }

    async function loadEvents(
        web3,
        contract,
        selectedAccount
    ) {

        const filter = {
            account: selectedAccount
        };

        const options = {
            filter,
            fromBlock: DEPLOYMENT_BLOCK,
            toBlock: "latest"
        };

        const [deposits, withdrawals] = await Promise.all([
            contract.getPastEvents("Deposited", options),
            contract.getPastEvents("Withdrawn", options)
        ]);

        const normalize = (items, type) =>
            items.map(item => ({
                id: `${item.transactionHash}-${item.logIndex}`,
                type,
                amount: web3.utils.fromWei(
                    item.returnValues.amount,
                    "ether"
                ),
                hash: item.transactionHash,
                blockNumber: Number(item.blockNumber),
                logIndex: Number(item.logIndex)
            }));

        return [
            ...normalize(deposits, "Deposit"),
            ...normalize(withdrawals, "Withdraw")
        ]
            .sort((a, b) =>
                b.blockNumber - a.blockNumber ||
                b.logIndex - a.logIndex
            )
            .slice(0, 10);
    }

    async function refreshBlockchainState(
        selectedAccount = account,
        session = sessionRef.current
    ) {

        if (
            !window.ethereum ||
            !selectedAccount ||
            !validContract
        ) {
            return;
        }

        const web3 = new Web3(window.ethereum);

        const currentChain = (
            await web3.eth.getChainId()
        ).toString();

        if (currentChain !== SEPOLIA_CHAIN_ID) {
            throw new Error("Please select Sepolia.");
        }

        const contract = getContract(web3);

        const [walletWei, summary] = await Promise.all([
            web3.eth.getBalance(selectedAccount),

            contract.methods.getAccountSummary().call({
                from: selectedAccount
            })
        ]);

        const accountEth = web3.utils.fromWei(
            summary[0],
            "ether"
        );

        const totalEth = web3.utils.fromWei(
            summary[1],
            "ether"
        );

        const count = summary[2].toString();

        if (session !== sessionRef.current) return;

        setWalletBalance(
            web3.utils.fromWei(walletWei, "ether")
        );

        setDepositedBalance(accountEth);
        setContractBalance(totalEth);
        setTransactionCount(count);

        // Event queries may be restricted by the RPC provider.
        // Balance reads should still succeed independently.

        try {

            const recentEvents = await loadEvents(
                web3,
                contract,
                selectedAccount
            );

            if (session === sessionRef.current) {
                setEvents(recentEvents);
            }

        } catch (error) {

            if (session === sessionRef.current) {
                setEvents([]);

                updateStatus(
                    "Balances loaded, but historical events " +
                    "could not be retrieved. Try a smaller " +
                    "deployment-block range.",
                    "info"
                );
            }
        }

        if (session === sessionRef.current) {
            setLastUpdated(new Date().toLocaleTimeString());
        }
    }

    async function lookupPublicBalance() {
        try {
            if (!window.ethereum) {
                throw new Error("MetaMask provider not detected.");
            }

            if (!Web3.utils.isAddress(lookupAddress)) {
                throw new Error("Enter a valid Ethereum address.");
            }

            const web3 = new Web3(window.ethereum);
            const currentChain = (
                await web3.eth.getChainId()
            ).toString();

            if (currentChain !== SEPOLIA_CHAIN_ID) {
                throw new Error("Please select Sepolia.");
            }

            const contract = getContract(web3);
            const balanceWei = await contract.methods
                .balances(lookupAddress.trim())
                .call();

            setPublicBalance(
                web3.utils.fromWei(balanceWei, "ether")
            );
            updateStatus("Deposited balance loaded.", "success");
        } catch (error) {
            setPublicBalance("");
            updateStatus(
                "Could not read balance: " + errorMessage(error),
                "error"
            );
        }
    }

    async function connectWallet() {

        if (busyRef.current) return;

        busyRef.current = true;
        setIsProcessing(true);

        try {

            if (!window.ethereum) {
                throw new Error(
                    "MetaMask provider not detected."
                );
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            if (!accounts.length) {
                throw new Error("No wallet account available.");
            }

            const web3 = new Web3(window.ethereum);

            const network = (
                await web3.eth.getChainId()
            ).toString();

            const session = ++sessionRef.current;

            setAccount(accounts[0]);
            setChainId(network);
            clearBlockchainData();

            if (network !== SEPOLIA_CHAIN_ID) {
                updateStatus(
                    "Wrong network. Switch to Sepolia.",
                    "error"
                );
                return;
            }

            if (!validContract) {
                updateStatus(
                    "Set your deployed contract address " +
                    "in src/contract.js.",
                    "error"
                );
                return;
            }

            await refreshBlockchainState(
                accounts[0],
                session
            );

            updateStatus(
                "Wallet connected. Blockchain data loaded.",
                "success"
            );

        } catch (error) {

            updateStatus(
                "Connection failed: " + errorMessage(error),
                "error"
            );

        } finally {

            busyRef.current = false;
            setIsProcessing(false);
        }
    }

    function getAmountWei(web3) {

        if (!/^\d+(\.\d{1,18})?$/.test(amount)) {
            throw new Error(
                "Enter a valid ETH amount with up to 18 decimals."
            );
        }

        const amountWei = web3.utils.toWei(
            amount,
            "ether"
        );

        if (BigInt(amountWei) <= 0n) {
            throw new Error(
                "Amount must be greater than zero."
            );
        }

        return amountWei;
    }

    async function executeTransaction(type) {

        if (
            busyRef.current ||
            !account ||
            !isSepolia ||
            !validContract
        ) {
            return;
        }

        busyRef.current = true;
        setIsProcessing(true);
        setTransactionHash("");
        setReceiptInfo(null);

        const session = sessionRef.current;

        try {

            const web3 = new Web3(window.ethereum);

            const activeAccounts =
                await window.ethereum.request({
                    method: "eth_accounts"
                });

            const activeChain = (
                await web3.eth.getChainId()
            ).toString();

            if (
                !activeAccounts.length ||
                activeAccounts[0].toLowerCase() !==
                    account.toLowerCase() ||
                activeChain !== SEPOLIA_CHAIN_ID
            ) {
                throw new Error(
                    "Wallet account or network changed. " +
                    "Reconnect first."
                );
            }

            const amountWei = getAmountWei(web3);

            const contract = getContract(web3);
            const previousBalanceWei = await contract.methods
                .balances(account)
                .call({ from: account });

            if (type === "Withdraw") {

                const summary =
                    await contract.methods.getAccountSummary().call({
                        from: account
                    });

                if (
                    BigInt(amountWei) >
                    BigInt(summary[0])
                ) {
                    throw new Error(
                        "Insufficient deposited balance."
                    );
                }
            }

            updateStatus(
                `Waiting for MetaMask approval: ${type}...`
            );

            const transaction =
                type === "Deposit"
                    ? contract.methods.deposit().send({
                        from: account,
                        value: amountWei
                    })
                    : contract.methods.withdraw(
                        amountWei
                    ).send({
                        from: account
                    });

            transaction.on("transactionHash", hash => {

                if (session === sessionRef.current) {
                    setTransactionHash(hash);

                    updateStatus(
                        "Transaction submitted. " +
                        "Waiting for confirmation..."
                    );
                }
            });

            const receipt = await transaction;

            if (session !== sessionRef.current) return;

            if (
                receipt.status === 0n ||
                receipt.status === 0
            ) {
                throw new Error("Transaction reverted.");
            }

            setTransactionHash(receipt.transactionHash);

            setReceiptInfo({
                blockNumber: receipt.blockNumber.toString(),
                gasUsed: receipt.gasUsed.toString()
            });

            const newBalanceWei = await contract.methods
                .balances(account)
                .call({}, receipt.blockNumber);

            const balanceChangeWei =
                BigInt(newBalanceWei) - BigInt(previousBalanceWei);
            const changeSign = balanceChangeWei >= 0n ? "+" : "-";

            setTransactionBalance({
                previous: web3.utils.fromWei(
                    previousBalanceWei.toString(),
                    "ether"
                ),
                current: web3.utils.fromWei(
                    newBalanceWei.toString(),
                    "ether"
                ),
                change: changeSign + web3.utils.fromWei(
                    (balanceChangeWei >= 0n
                        ? balanceChangeWei
                        : -balanceChangeWei
                    ).toString(),
                    "ether"
                )
            });

            await refreshBlockchainState(
                account,
                session
            );

            updateStatus(
                `${type} confirmed. Blockchain state updated.`,
                "success"
            );

        } catch (error) {

            if (session === sessionRef.current) {
                updateStatus(
                    "Transaction failed: " + errorMessage(error),
                    "error"
                );
            }

        } finally {

            busyRef.current = false;
            setIsProcessing(false);
        }
    }

    async function handleRefresh() {

        if (
            busyRef.current ||
            !account ||
            !isSepolia
        ) {
            return;
        }

        busyRef.current = true;
        setIsProcessing(true);

        try {

            await refreshBlockchainState();

            updateStatus(
                "Blockchain state refreshed.",
                "success"
            );

        } catch (error) {

            updateStatus(
                "Refresh failed: " + errorMessage(error),
                "error"
            );

        } finally {

            busyRef.current = false;
            setIsProcessing(false);
        }
    }

    useEffect(() => {

        const provider = window.ethereum;

        if (!provider) return;

        let active = true;

        async function restoreConnection() {

            try {

                const accounts = await provider.request({
                    method: "eth_accounts"
                });

                const web3 = new Web3(provider);

                const network = (
                    await web3.eth.getChainId()
                ).toString();

                if (!active) return;

                setChainId(network);

                if (!accounts.length) return;

                const session = ++sessionRef.current;

                setAccount(accounts[0]);

                if (
                    network === SEPOLIA_CHAIN_ID &&
                    validContract
                ) {
                    await refreshBlockchainState(
                        accounts[0],
                        session
                    );
                }

            } catch (error) {

                if (active) {
                    updateStatus(
                        "Could not restore wallet data.",
                        "error"
                    );
                }
            }
        }

        function handleAccountsChanged(accounts) {

            ++sessionRef.current;
            clearBlockchainData();

            if (!accounts.length) {
                setAccount("");
                updateStatus("Wallet access removed.");
                return;
            }

            setAccount(accounts[0]);

            updateStatus(
                "Account changed. Click Refresh State."
            );
        }

        function handleChainChanged(hexChainId) {

            ++sessionRef.current;
            clearBlockchainData();

            const nextChain =
                BigInt(hexChainId).toString();

            setChainId(nextChain);

            updateStatus(
                nextChain === SEPOLIA_CHAIN_ID
                    ? "Sepolia selected. Click Refresh State."
                    : "Wrong network. Switch to Sepolia.",
                nextChain === SEPOLIA_CHAIN_ID
                    ? "info"
                    : "error"
            );
        }

        provider.on(
            "accountsChanged",
            handleAccountsChanged
        );

        provider.on(
            "chainChanged",
            handleChainChanged
        );

        restoreConnection();

        return () => {

            active = false;

            provider.removeListener(
                "accountsChanged",
                handleAccountsChanged
            );

            provider.removeListener(
                "chainChanged",
                handleChainChanged
            );
        };

    }, []);

    const canTransact =
        Boolean(account) &&
        isSepolia &&
        validContract &&
        !isProcessing;

    const filteredEvents = events.filter(event => {
        if (eventFilter === "deposits") return event.type === "Deposit";
        if (eventFilter === "withdrawals") return event.type === "Withdraw";
        return true;
    });

    return (

        <div className="container">

            <header>
                <div>
                    <h1>Blockchain Banking Dashboard</h1>

                    <p className="subtitle">
                        Reading & Updating Blockchain State
                    </p>
                </div>

                <span className="badge">
                    Sepolia Testnet
                </span>
            </header>

            <section className="wallet-panel">

                <div>
                    <strong>
                        Wallet:{" "}
                        {account ? "Connected" : "Disconnected"}
                    </strong>

                    {account && (
                        <p>{shortenAddress(account)}</p>
                    )}
                </div>

                <button
                    onClick={connectWallet}
                    disabled={isProcessing}
                >
                    {account
                        ? "Reconnect Wallet"
                        : "Connect Wallet"}
                </button>

            </section>

            <p>
                Network:{" "}
                <strong>
                    {chainId || "Not detected"}
                    {isSepolia ? " (Sepolia)" : ""}
                </strong>
            </p>

            <div className="summary-grid">

                <SummaryCard
                    title="Wallet Balance"
                    value={`${walletBalance} ETH`}
                />

                <SummaryCard
                    title="My Deposits"
                    value={`${depositedBalance} ETH`}
                />

                <SummaryCard
                    title="Contract Balance"
                    value={`${contractBalance} ETH`}
                />

                <SummaryCard
                    title="Transactions"
                    value={transactionCount}
                />

            </div>

            <label htmlFor="amount">
                Transaction Amount (ETH)
            </label>

            <input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={event =>
                    setAmount(event.target.value)
                }
                disabled={isProcessing}
            />

            <input
                type="text"
                value={lookupAddress}
                onChange={event => {
                    setLookupAddress(event.target.value);
                    setPublicBalance("");
                }}
                placeholder="Enter public Ethereum address"
            />

            <button
                onClick={lookupPublicBalance}
                disabled={!isSepolia || !validContract}
            >
                Read Balance
            </button>

            {publicBalance !== "" && (
                <p>Deposited Balance: {publicBalance} ETH</p>
            )}

            <div className="buttons">

                <button
                    className="deposit"
                    onClick={() =>
                        executeTransaction("Deposit")
                    }
                    disabled={!canTransact}
                >
                    Deposit
                </button>

                <button
                    className="withdraw"
                    onClick={() =>
                        executeTransaction("Withdraw")
                    }
                    disabled={!canTransact}
                >
                    Withdraw
                </button>

            </div>

            <p className={`status ${statusType}`}>
                {status}
            </p>
            <p>
                Last Updated: {lastUpdated || "Not refreshed yet"}
            </p>            

            {transactionHash && (
                <section className="receipt">

                    <h3>Latest Transaction</h3>

                    <p className="hash">
                        {transactionHash}
                    </p>

                    {receiptInfo && (
                        <>
                            {transactionBalance && (
                                <>
                                    <p>
                                        Previous Balance: {transactionBalance.previous} ETH
                                    </p>
                                    <p>
                                        New Balance: {transactionBalance.current} ETH
                                    </p>
                                    <p>
                                        Change: {transactionBalance.change} ETH
                                    </p>
                                </>
                            )}

                            <p>
                                Block: {receiptInfo.blockNumber}
                            </p>

                            <p>
                                Gas Used: {receiptInfo.gasUsed}
                            </p>
                        </>
                    )}

                    <a
                        href={
                            "https://sepolia.etherscan.io/tx/" +
                            transactionHash
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View on Sepolia Etherscan
                    </a>

                </section>
            )}

            <label htmlFor="event-filter">Transaction Filter</label>
            <select
                id="event-filter"
                value={eventFilter}
                onChange={event => setEventFilter(event.target.value)}
            >
                <option value="all">All Transactions</option>
                <option value="deposits">Deposits Only</option>
                <option value="withdrawals">Withdrawals Only</option>
            </select>

            <TransactionHistory events={filteredEvents} />

            <button
                className="refresh"
                onClick={handleRefresh}
                disabled={!canTransact}
            >
                Refresh Blockchain State
            </button>

            <p className="note">
                Educational application using Sepolia test ETH.
                Do not use real funds.
            </p>

        </div>
    );
}

