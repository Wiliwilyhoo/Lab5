export const CONTRACT_ADDRESS =
    "0xb81Dd92B3Db30F16AFb68b0C6F9Cd8b71d4F4e2e";

// Replace 0 with the actual deployment block
// recorded in Remix or Sepolia Etherscan.
export const DEPLOYMENT_BLOCK = 0;

export const CONTRACT_ABI = [
    {
        inputs: [],
        name: "getValue",
        outputs: [
            { name: "", type: "uint256" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            { name: "newValue", type: "uint256" }
        ],
        name: "setValue",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "getStorageInfo",
        outputs: [
            { name: "value", type: "uint256" },
            { name: "updater", type: "address" },
            { name: "updates", type: "uint256" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "lastUpdatedBy",
        outputs: [
            { name: "", type: "address" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "updateCount",
        outputs: [
            { name: "", type: "uint256" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: "updatedBy",
                type: "address"
            },
            {
                indexed: false,
                name: "oldValue",
                type: "uint256"
            },
            {
                indexed: false,
                name: "newValue",
                type: "uint256"
            },
            {
                indexed: false,
                name: "updateNumber",
                type: "uint256"
            }
        ],
        name: "ValueUpdated",
        type: "event"
    }
];

