import { useEffect, useRef, useState } from "react";
import { Web3 } from "web3";
import ContractInfo from "./ContractInfo.jsx";

import {
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    DEPLOYMENT_BLOCK
} from "./contract.js";

const SEPOLIA_CHAIN_ID = "11155111";

const ZERO_ADDRESS =
    "0x0000000000000000000000000000000000000000";

function shortenAddress(value) {
    if (!value) return "—";
    return value.slice(0, 6) + "..." + value.slice(-4);
}

function getErrorMessage(error) {
    if (error?.code === 4001) {
        return "Request rejected in MetaMask.";
    }
    return error?.message || "Unknown error.";
}

function validateValue(input) {

    if (!/^\d+$/.test(input)) {
        throw new Error(
            "Enter a nonnegative whole number."
        );
    }

    const value = BigInt(input);

    if (value > 1000n) {
        throw new Error(
            "Value must not exceed 1000."
        );
    }

    return value.toString();
}

function InfoCard({ label, value }) {
    return (
        <div className="info-card">
            <p>{label}</p>
            <strong>{value}</strong>
        </div>
    );
}

function UpdateHistory({ events, account, filter, onFilterChange }) {
    const visibleEvents = filter === "mine" && account
        ? events.filter(event =>
            event.updater.toLowerCase() === account.toLowerCase()
        )
        : events;

    return (
        <section className="history">
            <h3>Recent Value Updates</h3>

            <label className="history-filter-label" htmlFor="historyFilter">
                Display
            </label>
            <select
                id="historyFilter"
                className="history-filter"
                value={filter}
                onChange={event => onFilterChange(event.target.value)}
                disabled={!account}
            >
                <option value="all">All Updates</option>
                <option value="mine">My Updates Only</option>
            </select>

            {visibleEvents.length === 0 ? (
                <p>No update events found.</p>
            ) : (
                visibleEvents.map(event => (
                    <div
                        className="history-item"
                        key={event.id}
                    >
                        <div>
                            <strong>
                                {event.oldValue}
                                {" → "}
                                {event.newValue}
                            </strong>

                            <p>
                                By {shortenAddress(event.updater)}
                            </p>
                        </div>

                        <a
                            href={
                                "https://sepolia.etherscan.io/tx/" +
                                event.hash
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View Transaction
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

    const [storedValue, setStoredValue] =
        useState("—");

    const [lastUpdatedBy, setLastUpdatedBy] =
        useState(ZERO_ADDRESS);

    const [updateCount, setUpdateCount] =
        useState("0");

    const [newValue, setNewValue] = useState("");

    const [events, setEvents] = useState([]);
    const [eventFilter, setEventFilter] = useState("all");

    const [status, setStatus] = useState(
        "Connect MetaMask to begin."
    );

    const [statusType, setStatusType] =
        useState("info");

    const [isProcessing, setIsProcessing] =
        useState(false);

    const [transactionHash, setTransactionHash] =
        useState("");

    const [receiptInfo, setReceiptInfo] =
        useState(null);

    const [valueChange, setValueChange] =
        useState(null);

    const sessionRef = useRef(0);
    const busyRef = useRef(false);

    const isSepolia =
        chainId === SEPOLIA_CHAIN_ID;

    const networkName = !chainId
        ? "Not detected"
        : isSepolia
            ? "Sepolia"
            : `Chain ${chainId}`;

    const validContract =
        Web3.utils.isAddress(CONTRACT_ADDRESS);

    function updateStatus(message, type = "info") {
        setStatus(message);
        setStatusType(type);
    }

    function clearBlockchainData() {
        setStoredValue("—");
        setLastUpdatedBy(ZERO_ADDRESS);
        setUpdateCount("0");
        setEvents([]);
        setTransactionHash("");
        setReceiptInfo(null);
        setValueChange(null);
    }

    function getContract(web3) {
        return new web3.eth.Contract(
            CONTRACT_ABI,
            CONTRACT_ADDRESS
        );
    }

    async function loadUpdateEvents(contract) {

        const items = await contract.getPastEvents(
            "ValueUpdated",
            {
                fromBlock: DEPLOYMENT_BLOCK,
                toBlock: "latest"
            }
        );

        return items
            .map(item => ({
                id:
                    item.transactionHash +
                    "-" +
                    item.logIndex.toString(),

                oldValue:
                    item.returnValues.oldValue.toString(),

                newValue:
                    item.returnValues.newValue.toString(),

                updater:
                    item.returnValues.updatedBy,

                hash:
                    item.transactionHash,

                blockNumber:
                    Number(item.blockNumber),

                logIndex:
                    Number(item.logIndex)
            }))
            .sort((a, b) =>
                b.blockNumber - a.blockNumber ||
                b.logIndex - a.logIndex
            )
            .slice(0, 10);
    }

    async function refreshBlockchainData(
        session = sessionRef.current
    ) {

        if (!window.ethereum || !validContract) {
            return;
        }

        const web3 = new Web3(window.ethereum);

        const currentChain = (
            await web3.eth.getChainId()
        ).toString();

        if (currentChain !== SEPOLIA_CHAIN_ID) {
            throw new Error(
                "Please switch MetaMask to Sepolia."
            );
        }

        const contract = getContract(web3);

        const info =
            await contract.methods.getStorageInfo().call();

        if (session !== sessionRef.current) return;

        setStoredValue(info[0].toString());
        setLastUpdatedBy(info[1]);
        setUpdateCount(info[2].toString());

        try {

            const recentEvents =
                await loadUpdateEvents(contract);

            if (session === sessionRef.current) {
                setEvents(recentEvents);
            }

        } catch (error) {

            if (session === sessionRef.current) {
                setEvents([]);

                updateStatus(
                    "Storage data loaded, but historical " +
                    "events could not be retrieved. Check " +
                    "the deployment block or RPC limits.",
                    "info"
                );
            }
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

            const accounts =
                await window.ethereum.request({
                    method: "eth_requestAccounts"
                });

            if (!accounts.length) {
                throw new Error(
                    "No wallet account available."
                );
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
                    "Set the deployed contract address " +
                    "in src/contract.js.",
                    "error"
                );
                return;
            }

            await refreshBlockchainData(session);

            updateStatus(
                "Wallet connected. Blockchain data loaded.",
                "success"
            );

        } catch (error) {

            updateStatus(
                "Connection failed: " +
                getErrorMessage(error),
                "error"
            );

        } finally {

            busyRef.current = false;
            setIsProcessing(false);
        }
    }

    async function updateStoredValue() {

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
        setValueChange(null);

        const session = sessionRef.current;

        try {

            const value = validateValue(newValue);

            const web3 = new Web3(window.ethereum);

            const accounts =
                await window.ethereum.request({
                    method: "eth_accounts"
                });

            const network = (
                await web3.eth.getChainId()
            ).toString();

            if (
                !accounts.length ||
                accounts[0].toLowerCase() !==
                    account.toLowerCase() ||
                network !== SEPOLIA_CHAIN_ID
            ) {
                throw new Error(
                    "Wallet account or network changed. " +
                    "Reconnect first."
                );
            }

            const contract = getContract(web3);
            const previousValue = BigInt(
                await contract.methods.getValue().call()
            );
            const nextValue = BigInt(value);

            updateStatus(
                "Waiting for MetaMask approval..."
            );

            const transaction =
                contract.methods.setValue(value).send({
                    from: account
                });

            transaction.on(
                "transactionHash",
                hash => {

                    if (session === sessionRef.current) {
                        setTransactionHash(hash);

                        updateStatus(
                            "Transaction submitted. " +
                            "Waiting for confirmation..."
                        );
                    }
                }
            );

            const receipt = await transaction;

            if (session !== sessionRef.current) return;

            if (
                receipt.status === 0n ||
                receipt.status === 0
            ) {
                throw new Error(
                    "Transaction reverted."
                );
            }

            setTransactionHash(
                receipt.transactionHash
            );

            setReceiptInfo({
                blockNumber:
                    receipt.blockNumber.toString(),

                gasUsed:
                    receipt.gasUsed.toString()
            });

            const difference = nextValue - previousValue;
            setValueChange({
                previous: previousValue.toString(),
                next: nextValue.toString(),
                change:
                    difference > 0n
                        ? `+${difference}`
                        : difference.toString()
            });

            await refreshBlockchainData(session);

            updateStatus(
                "Transaction confirmed. " +
                "Blockchain value updated.",
                "success"
            );

        } catch (error) {

            if (session === sessionRef.current) {
                updateStatus(
                    "Update failed: " +
                    getErrorMessage(error),
                    "error"
                );
            }

        } finally {

            busyRef.current = false;
            setIsProcessing(false);
        }
    }

    async function resetStoredValue() {

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
            const accounts =
                await window.ethereum.request({
                    method: "eth_accounts"
                });
            const network = (
                await web3.eth.getChainId()
            ).toString();

            if (
                !accounts.length ||
                accounts[0].toLowerCase() !==
                    account.toLowerCase() ||
                network !== SEPOLIA_CHAIN_ID
            ) {
                throw new Error(
                    "Wallet account or network changed. " +
                    "Reconnect first."
                );
            }

            const contract = getContract(web3);
            const previousValue = BigInt(
                await contract.methods.getValue().call()
            );
            const nextValue = 0n;

            updateStatus(
                "Waiting for MetaMask approval..."
            );

            const transaction =
                contract.methods.setValue(0).send({
                    from: account
                });

            transaction.on(
                "transactionHash",
                hash => {
                    if (session === sessionRef.current) {
                        setTransactionHash(hash);
                        updateStatus(
                            "Reset submitted. Waiting for confirmation..."
                        );
                    }
                }
            );

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

            const difference = nextValue - previousValue;
            setValueChange({
                previous: previousValue.toString(),
                next: nextValue.toString(),
                change:
                    difference > 0n
                        ? `+${difference}`
                        : difference.toString()
            });

            await refreshBlockchainData(session);

            updateStatus(
                "Transaction confirmed. Value reset to zero.",
                "success"
            );

        } catch (error) {

            if (session === sessionRef.current) {
                updateStatus(
                    "Reset failed: " + getErrorMessage(error),
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
            !isSepolia ||
            !validContract
        ) {
            return;
        }

        busyRef.current = true;
        setIsProcessing(true);

        try {

            await refreshBlockchainData();

            updateStatus(
                "Blockchain data refreshed.",
                "success"
            );

        } catch (error) {

            updateStatus(
                "Refresh failed: " +
                getErrorMessage(error),
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

                const accounts =
                    await provider.request({
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
                    await refreshBlockchainData(session);
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
                updateStatus(
                    "Wallet access removed."
                );
                return;
            }

            setAccount(accounts[0]);

            updateStatus(
                "Account changed. Click Refresh Data."
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
                    ? "Sepolia selected. Click Refresh Data."
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

    const canUpdate =
        Boolean(account) &&
        isSepolia &&
        validContract &&
        !isProcessing;

    return (

        <div className="container">

            <header>

                <div>
                    <h1>SimpleStorage DApp</h1>

                    <p className="subtitle">
                        Solidity + React + Web3.js
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
                        {account
                            ? "Connected"
                            : "Disconnected"}
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

            <ContractInfo
                contractAddress={CONTRACT_ADDRESS}
                network={networkName}
                chainId={chainId || "Not detected"}
                deploymentBlock={DEPLOYMENT_BLOCK}
            />

            <section className="value-card">

                <p>Current Stored Value</p>

                <h2>{storedValue}</h2>

                <span>
                    Retrieved from the smart contract
                </span>

            </section>

            <div className="info-grid">

                <InfoCard
                    label="Last Updated By"
                    value={
                        lastUpdatedBy === ZERO_ADDRESS
                            ? "No updates yet"
                            : shortenAddress(lastUpdatedBy)
                    }
                />

                <InfoCard
                    label="Update Count"
                    value={updateCount}
                />

            </div>

            <label htmlFor="newValue">
                New Value
            </label>

            <input
                id="newValue"
                type="text"
                inputMode="numeric"
                placeholder="Enter a nonnegative integer"
                value={newValue}
                onChange={event =>
                    setNewValue(event.target.value)
                }
                disabled={isProcessing}
            />

            <button
                className="update-button"
                onClick={updateStoredValue}
                disabled={!canUpdate}
            >
                {isProcessing
                    ? "Processing..."
                    : "Update Blockchain Value"}
            </button>

            <button
                className="reset-button"
                onClick={resetStoredValue}
                disabled={!canUpdate}
            >
                {isProcessing ? "Processing..." : "Reset to Zero"}
            </button>

            <p className={`status ${statusType}`}>
                {status}
            </p>

            {transactionHash && (
                <section className="receipt">

                    <h3>Latest Transaction</h3>

                    <p className="hash">
                        {transactionHash}
                    </p>

                    {receiptInfo && (
                        <>
                            <p>
                                Block:{" "}
                                {receiptInfo.blockNumber}
                            </p>

                            <p>
                                Gas Used:{" "}
                                {receiptInfo.gasUsed}
                            </p>
                        </>
                    )}

                    {valueChange && (
                        <div className="value-change" aria-live="polite">
                            <p>
                                <span>Previous Value:</span>
                                <strong>{valueChange.previous}</strong>
                            </p>
                            <p>
                                <span>New Value:</span>
                                <strong>{valueChange.next}</strong>
                            </p>
                            <p>
                                <span>Change:</span>
                                <strong>{valueChange.change}</strong>
                            </p>
                        </div>
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

            <UpdateHistory
                events={events}
                account={account}
                filter={eventFilter}
                onFilterChange={setEventFilter}
            />

            <button
                className="refresh-button"
                onClick={handleRefresh}
                disabled={!canUpdate}
            >
                Refresh Blockchain Data
            </button>

            <p className="note">
                Educational DApp using Sepolia test ETH only.
                Never share wallet private keys or recovery phrases.
            </p>

        </div>
    );
}

