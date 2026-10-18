// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleTokenBank {
    uint256 public transactionCount;
    // STEP 1. Account balances in wei

    mapping(address => uint256) public balances;


    // STEP 2. Transaction events

    event Deposited(
        address indexed account,
        uint256 amount,
        uint256 newBalance
    );

    event Withdrawn(
        address indexed account,
        uint256 amount,
        uint256 newBalance
    );

    event BalanceTransferred(
        address indexed sender,
        address indexed receiver,
        uint256 amount
    );

    // STEP 3. Deposit Ether

    function deposit() external payable {

        require(
            msg.value > 0.01 ether,
            "Minimum deposit is 0.01 ETH"
        );

        balances[msg.sender] += msg.value;
        transactionCount++;

        emit Deposited(
            msg.sender,
            msg.value,
            balances[msg.sender]
        );
    }


    // STEP 4. Withdraw Ether

    function withdraw(uint256 amount) external {

        require(
            amount > 0,
            "Withdrawal amount must be greater than zero"
        );

        require(
            amount <= 1 ether,
            "Maximum withdraw is 1 eth"
        );

        require(
            balances[msg.sender] >= amount,
            "Insufficient balance"
        );

        // Update state before sending Ether

        balances[msg.sender] -= amount;

        // Transfer Ether to the caller

        (bool success, ) = payable(msg.sender).call{
            value: amount
        }("");

        require(
            success,
            "Ether transfer failed"
        );
        transactionCount++;

        emit Withdrawn(
            msg.sender,
            amount,
            balances[msg.sender]
        );
    }


    // STEP 5. Get caller's balance

    function getMyBalance()
        external
        view
        returns (uint256)
    {
        return balances[msg.sender];
    }


    // STEP 6. Get total contract balance

    function getContractBalance()
        external
        view
        returns (uint256)
    {
        return address(this).balance;
    }

    
    function getAccountSummary()
        external
        view
        returns (
            uint256 accountBalance,
            uint256 totalContractBalance
        )
    {
        return (
            balances[msg.sender],
            address(this).balance
        );
    }


    function transferBalance(
        address receiver,
        uint256 amount
    ) external {
        require(
            amount > 0,
            "Transfer amount must be greater than zero"
        );

        require(
            receiver != address(0),
            "Invalid receiver"
        );

        require(
            receiver != msg.sender,
            "Cannot transfer to self"
        );

        require(
            balances[msg.sender] >= amount,
            "Insufficient balance"
        );

        balances[msg.sender] -= amount;
        balances[receiver] += amount;

        emit BalanceTransferred(
            msg.sender,
            receiver,
            amount
        );
    }

}

