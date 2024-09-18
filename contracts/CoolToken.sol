// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CoolToken is ERC20("CoolToken", "COOL") {
    error OnlyOwner();

    address immutable OWNER;

    constructor() {
        OWNER = msg.sender;
        _mint(msg.sender, 2_000_000e18);
    }

    function mint(address _account, uint _amount) public {
        if (msg.sender != OWNER) {
            revert OnlyOwner();
        }

        _mint(_account, _amount);
    }

    function burn(uint _amount) public {
        if (msg.sender != OWNER) {
            revert OnlyOwner();
        }

        _burn(address(this), _amount);
    }
}
