import { useEffect, useRef, useState } from "react";
import { Web3 } from "web3";

import {
    CONTRACT_ADDRESS,
    CONTRACT_ABI
} from "./contract.js";

const SEPOLIA_CHAIN_ID = "11155111";

function shortenAddress(address) {
    if (!address) return "";
    return address.slice(0, 6) + "..." + address.slice(-4);
}

function getErrorMessage(error) {
    if (error?.code === 4001) {
        return "Request rejected in MetaMask.";
    }

    return error?.message || "An unknown error occurred.";
}

function TransactionHistory({ transactions }) {
  return (
    <section>
      <h3>Transaction History</h3>

      {transactions.length === 0 ? (
        <p>No transactions in this session.</p>
      ) : (
        transactions.map((tx, index) => (
          <div key={tx.hash + "-" + index}>
            <p>
              {tx.type}: {tx.amount} ETH
            </p>
            <a
              href={"https://sepolia.etherscan.io/tx/" + tx.hash}
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

function ContractInfo({
  address,
  chainId,
  balance
}) {
  return (
    <section>
      <h4>Contract Information</h4>

      <p>Contract Address: {address}</p>

      <p>
        Network: {
          chainId === "11155111"
            ? "Sepolia"
            : "Other network"
        }
      </p>

      <p>Chain ID: {chainId || "Not detected"}</p>

      <p>Total Contract Balance: {balance} ETH</p>
    </section>
  );
}

export default function App() {

    const [account, setAccount] = useState("");
    const [chainId, setChainId] = useState("");
    const [walletBalance, setWalletBalance] = useState("0");
    const [depositedBalance, setDepositedBalance] = useState("0");
    const [contractBalance, setContractBalance] = useState("0");

    const [amount, setAmount] = useState("0.001");

    const [isBusy, setIsBusy] = useState(false);
    const [status, setStatus] = useState(
        "Connect MetaMask to begin."
    );
    const [statusType, setStatusType] = useState("info");
    const busyRef = useRef(false);
    const sessionRef = useRef(0);

    const isSepolia = chainId === SEPOLIA_CHAIN_ID;

    const validContractAddress = Web3.utils.isAddress(
        CONTRACT_ADDRESS
    );
    const [sessionTransactions, setSessionTransactions] =
       useState([]);

    function showStatus(message, type = "info") {
        setStatus(message);
        setStatusType(type);
    }

    function clearBalances() {
        setWalletBalance("0");
        setDepositedBalance("0");
        setContractBalance("0");
    }

    async function refreshBalances(
        selectedAccount = account,
        session = sessionRef.current
    ) {

        if (
            !window.ethereum ||
            !selectedAccount ||
            !validContractAddress
        ) {
            return;
        }

        const web3 = new Web3(window.ethereum);
        const currentChainId = (
            await web3.eth.getChainId()
        ).toString();

        if (currentChainId !== SEPOLIA_CHAIN_ID) {
            return;
        }

        const contract = new web3.eth.Contract(
            CONTRACT_ABI,
            CONTRACT_ADDRESS
        );

        const [
            walletWei,
            depositedWei,
            totalWei
        ] = await Promise.all([
            web3.eth.getBalance(selectedAccount),

            contract.methods.getMyBalance().call({
                from: selectedAccount
            }),

            contract.methods.getContractBalance().call()
        ]);

        // Ignore results from an outdated wallet session.
        if (session !== sessionRef.current) {
            return;
        }

        setWalletBalance(
            web3.utils.fromWei(walletWei, "ether")
        );

        setDepositedBalance(
            web3.utils.fromWei(depositedWei, "ether")
        );

        setContractBalance(
            web3.utils.fromWei(totalWei, "ether")
        );
    }

    async function connectWallet() {

        if (busyRef.current) return;

        busyRef.current = true;
        setIsBusy(true);

        try {

            if (!window.ethereum) {
                throw new Error(
                    "MetaMask provider not detected. Open the DApp " +
                    "in a browser page with MetaMask enabled."
                );
            }

            showStatus("Waiting for wallet approval...");

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
            clearBalances();

            if (network !== SEPOLIA_CHAIN_ID) {
                showStatus(
                    "Wrong network. Please switch MetaMask to Sepolia.",
                    "error"
                );
                return;
            }

            if (!validContractAddress) {
                showStatus(
                    "Enter your deployed Sepolia contract address " +
                    "in src/contract.js.",
                    "error"
                );
                return;
            }

            await refreshBalances(accounts[0], session);

            showStatus("Wallet connected successfully!", "success");

        } catch (error) {

            showStatus(
                "Connection failed: " + getErrorMessage(error),
                "error"
            );

        } finally {

            busyRef.current = false;
            setIsBusy(false);
        }
    }

    async function switchToSepolia() {

        if (!window.ethereum || busyRef.current) return;

        busyRef.current = true;
        setIsBusy(true);

        try {

            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [
                    { chainId: "0xaa36a7" }
                ]
            });

            showStatus("Network switch requested.", "info");

        } catch (error) {

            showStatus(
                "Network switch failed: " + getErrorMessage(error),
                "error"
            );

        } finally {

            busyRef.current = false;
            setIsBusy(false);
        }
    }

    function getValidAmountWei(web3) {

        if (!/^-?\d+(\.\d{1,18})?$/.test(amount)) {
            throw new Error(
                "Enter a valid ETH amount with up to 18 decimals."
            );
        }

        if (amount.startsWith("-")) {
            throw new Error(
                "Enter a valid positive integer amount."
            );
        }

        const valueWei = web3.utils.toWei(amount, "ether");

        if (BigInt(valueWei) <= 0n) {
            throw new Error(
                "Amount must be greater than zero."
            );
        }

        return valueWei;
    }

    async function executeTransaction(type) {

        if (
            busyRef.current ||
            !account ||
            !isSepolia ||
            !validContractAddress
        ) {
            return;
        }

        busyRef.current = true;
        setIsBusy(true);
        const session = sessionRef.current;

        try {

            const web3 = new Web3(window.ethereum);

            const accounts = await window.ethereum.request({
                method: "eth_accounts"
            });

            const network = (
                await web3.eth.getChainId()
            ).toString();

            if (
                !accounts.length ||
                accounts[0].toLowerCase() !== account.toLowerCase() ||
                network !== SEPOLIA_CHAIN_ID
            ) {
                throw new Error(
                    "Wallet account or network changed. Reconnect first."
                );
            }

            const valueWei = getValidAmountWei(web3);

            if (
              type === "Deposit" &&
              BigInt(valueWei) > 10000000000000000n
            ) {
              throw new Error(
                "Maximum deposit per transaction is 0.01 ETH."
              );
            }

            const contract = new web3.eth.Contract(
                CONTRACT_ABI,
                CONTRACT_ADDRESS
            );

            if (type === "Withdraw") {

                const currentWei =
                    await contract.methods.getMyBalance().call({
                        from: account
                    });

                if (BigInt(valueWei) > BigInt(currentWei)) {
                    throw new Error(
                        "Insufficient deposited balance."
                    );
                }
            }

            showStatus(
                `Waiting for MetaMask approval: ${type}...`
            );

            let transaction;

            if (type === "Deposit") {

                transaction = contract.methods.deposit().send({
                    from: account,
                    value: valueWei
                });

            } else {

                transaction = contract.methods.withdraw(
                    valueWei
                ).send({
                    from: account
                });

            }

            transaction.on("transactionHash", () => {
                if (session === sessionRef.current) {
                    showStatus(
                        "Transaction submitted. Waiting for confirmation..."
                    );
                }
            });

            const receipt = await transaction;

            if (session !== sessionRef.current) {
                return;
            }

            if (receipt.status === 0n || receipt.status === 0) {
                throw new Error("Transaction reverted.");
            }

            showStatus(
                `${type} successful! Transaction confirmed.`,
                "success"
            );

            await refreshBalances(account, session);
            
            setSessionTransactions(previous => [
              ...previous,
              {
                type,
                amount,
                hash: receipt.transactionHash
              }
            ]);
        } catch (error) {

            if (session === sessionRef.current) {
                showStatus(
                    "Transaction failed: " + getErrorMessage(error),
                    "error"
                );
            }

        } finally {

            busyRef.current = false;
            setIsBusy(false);
        }
    }

    async function handleRefresh() {

        if (busyRef.current || !account || !isSepolia) {
            return;
        }

        busyRef.current = true;
        setIsBusy(true);

        try {
            await refreshBalances();
            showStatus("Balances refreshed.", "success");
        } catch (error) {
            showStatus(
                "Refresh failed: " + getErrorMessage(error),
                "error"
            );
        } finally {
            busyRef.current = false;
            setIsBusy(false);
        }
    }

    // Restore previously authorized account access
    // without opening a MetaMask approval popup.

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
                    validContractAddress
                ) {
                    await refreshBalances(accounts[0], session);

                    if (active) {
                        showStatus(
                            "Wallet connection restored.",
                            "success"
                        );
                    }
                }

            } catch (error) {

                if (active) {
                    showStatus(
                        "Could not restore wallet connection.",
                        "error"
                    );
                }
            }
        }

        function handleAccountsChanged(accounts) {

            ++sessionRef.current;
            clearBalances();

            if (!accounts.length) {
                setAccount("");
                showStatus("Wallet access removed.");
                return;
            }

            setAccount(accounts[0]);

            showStatus(
                "Account changed. Click Refresh Balances.",
                "info"
            );
        }

        function handleChainChanged(hexChainId) {

            ++sessionRef.current;

            const decimalChainId =
                BigInt(hexChainId).toString();

            setChainId(decimalChainId);
            clearBalances();

            showStatus(
                decimalChainId === SEPOLIA_CHAIN_ID
                    ? "Sepolia selected. Click Refresh Balances."
                    : "Wrong network. Switch to Sepolia.",
                decimalChainId === SEPOLIA_CHAIN_ID
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
        validContractAddress &&
        !isBusy;

    return (

        <div className="container">

            <header>
                <div>
                    <h1>Web3 Token Bank</h1>
                    <p className="subtitle">
                        React + MetaMask + Web3.js
                    </p>
                </div>

                <span className="badge">
                    Sepolia Testnet
                </span>
            </header>

            <section className="wallet-panel">

                <div>
                    <strong>
                        Wallet Status:{" "}
                        {account ? "Connected" : "Disconnected"}
                    </strong>

                    {account && (
                        <p className="address">
                            <span>{shortenAddress(account)}</span>
                            <button
                                className="copy-button"
                                type="button"
                                aria-label="Copy wallet address"
                                title="Copy wallet address"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(account);
                                        showStatus("Address copied.", "success");
                                    } catch {
                                        showStatus("Could not copy wallet address.", "error");
                                    }
                                }}
                            >
                                ⧉
                            </button>
                        </p>
                    )}
                </div>

                <button
                    id="connectBtn"
                    onClick={connectWallet}
                    disabled={isBusy}
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
            
            <p
              style={{
                fontWeight: "bold",
                color: !account
                  ? "#666"
                  : isSepolia
                    ? "green"
                    : "red"
              }}
            >
              {!account
                ? "Wallet disconnected"
                : isSepolia
                  ? "Sepolia connected"
                  : "Wrong network"}
            </p>

            {account && !isSepolia && (
                <button
                    className="switch-button"
                    onClick={switchToSepolia}
                    disabled={isBusy}
                >
                    Switch to Sepolia
                </button>
            )}

            <div className="balance-grid">

                <div className="balance-card">
                    <p>Wallet Balance</p>
                    <h2>{walletBalance} ETH</h2>
                </div>

                <div className="balance-card deposited">
                    <p>Deposited Balance</p>
                    <h2>{depositedBalance} ETH</h2>
                </div>

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
                disabled={isBusy}
            />

            <div className="buttons">

                <button
                    id="depositBtn"
                    onClick={() =>
                        executeTransaction("Deposit")
                    }
                    disabled={!canTransact}
                >
                    Deposit
                </button>

                <button
                    id="withdrawBtn"
                    onClick={() =>
                        executeTransaction("Withdraw")
                    }
                    disabled={!canTransact}
                >
                    Withdraw
                </button>

            </div>

            <p
                id="status"
                className={`status ${statusType}`}
            >
                {status}
            </p>
            <TransactionHistory
              transactions={sessionTransactions}
            />   
            
   
            <hr />

            <div className="summary">

                <h3>Contract Balance</h3>

                <p>{contractBalance} ETH</p>

            </div>

            <ContractInfo
              address={CONTRACT_ADDRESS}
              chainId={chainId}
              balance={contractBalance}
            />
                 
            <button
                id="refreshBtn"
                onClick={handleRefresh}
                disabled={!canTransact}
            >
                Refresh Balances
            </button>

            <p className="note">
                Educational DApp using Sepolia test ETH only.
                Do not use real funds.
            </p>

        </div>
    );
}

