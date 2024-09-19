// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract CoolAirdrop {
    error ZeroAddress();
    error InvalidProof();
    error UserClaimed();
    error OnlyOwner();
    error AirdropEnded();
    error AirdropActive();
    error AirdropExhausted();
    error NotAnNFTHolder();
    error NFTAlreadyVerified();

    event AirdropClaimed(address indexed account, uint time, uint256 amount);

    IERC20 public immutable TOKEN;
    IERC721 public immutable NFT;

    bytes32 public merkleRoot;

    uint256 immutable ENDDATE;
    uint256 balance;

    address public immutable OWNER;

    mapping(address => bool) claimedAddresses;
    mapping(uint256 => bool) claimedNFTs;

    constructor(address _tokenAddress, bytes32 _merkleRoot, uint _duration) {
        if (_tokenAddress == address(0)) revert ZeroAddress();

        OWNER = msg.sender;
        TOKEN = IERC20(_tokenAddress);
        NFT = IERC721(0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D); //BAYC NFT address
        merkleRoot = _merkleRoot;
        ENDDATE = block.timestamp + _duration;
        balance = 1_000_000;
    }

    function claimAirdrop(
        bytes32[] memory _merkleProof,
        uint256 _amount,
        uint256 _tokenId
    ) external {
        if (msg.sender == address(0)) revert ZeroAddress();
        if (NFT.balanceOf(msg.sender) < 1) revert NotAnNFTHolder();
        if (claimedAddresses[msg.sender] == true) revert UserClaimed();
        if (claimedNFTs[_tokenId]) revert NFTAlreadyVerified();
        if (block.timestamp >= ENDDATE) revert AirdropEnded();
        if (balance == 0) revert AirdropExhausted();

        verifyProof(_merkleProof, _amount, msg.sender);

        claimedAddresses[msg.sender] = true;
        claimedNFTs[_tokenId] = true;
        balance = balance - _amount;

        TOKEN.transfer(msg.sender, _amount);

        emit AirdropClaimed(msg.sender, block.timestamp, _amount);
    }

    function verifyProof(
        bytes32[] memory _proof,
        uint256 _amount,
        address _address
    ) private view {
        bytes32 leaf = keccak256(
            bytes.concat(keccak256(abi.encode(_address, _amount)))
        );

        bool validProof = MerkleProof.verify(_proof, merkleRoot, leaf);

        if (!validProof) revert InvalidProof();
    }

    function updateMerkleRoot(bytes32 _merkleRoot) external {
        if (msg.sender != OWNER) revert OnlyOwner();

        merkleRoot = _merkleRoot;
    }

    function withdraw(address _to) external {
        if (msg.sender != OWNER) revert OnlyOwner();
        if (block.timestamp < ENDDATE) revert AirdropActive();
        if (balance == 0) revert AirdropExhausted();

        TOKEN.transfer(_to, balance);
    }
}
