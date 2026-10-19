// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BlockchainBank {

    mapping(address => uint256) public balances;

    uint256 public transactionCount;

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

    function deposit() external payable {

        require(
            msg.value > 0,
            "Deposit amount must be positive"
        );

        balances[msg.sender] += msg.value;

        transactionCount++;

        emit Deposited(
            msg.sender,
            msg.value,
            balances[msg.sender]
        );
    }

    function withdraw(uint256 amount) external {

        require(
            amount > 0,
            "Withdrawal amount must be positive"
        );

        require(
            balances[msg.sender] >= amount,
            "Insufficient balance"
        );

        balances[msg.sender] -= amount;

        transactionCount++;

        (bool success, ) = payable(msg.sender).call{
            value: amount
        }("");

        require(success, "Ether transfer failed");

        emit Withdrawn(
            msg.sender,
            amount,
            balances[msg.sender]
        );
    }

    function getMyBalance()
        external
        view
        returns (uint256)
    {
        return balances[msg.sender];
    }

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
            uint256 totalContractBalance,
            uint256 totalTransactions
        )
    {
        return (
            balances[msg.sender],
            address(this).balance,
            transactionCount
        );
    }
}

