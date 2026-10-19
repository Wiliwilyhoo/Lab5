// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 private value;
    address public lastUpdatedBy;
    uint256 public updateCount;

    event ValueUpdated(
        address indexed updatedBy,
        uint256 oldValue,
        uint256 newValue,
        uint256 updateNumber
    );

    function setValue(uint256 newValue) external {
        require(
            newValue <= 1000,
            "Value must not exceed 1000"
        );

        uint256 oldValue = value;
        value = newValue;
        lastUpdatedBy = msg.sender;
        updateCount += 1;

        emit ValueUpdated(
            msg.sender,
            oldValue,
            newValue,
            updateCount
        );
    }

    function getValue() external view returns (uint256) {
        return value;
    }

    function getStorageInfo()
        external
        view
        returns (uint256, address, uint256)
    {
        return (value, lastUpdatedBy, updateCount);
    }
}
