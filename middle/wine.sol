// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract WinePlatform is ERC721URIStorage, Ownable {
    using ECDSA for bytes32;

    // ======================== 积分逻辑 ========================
    mapping(address => uint256) private _balances;

    address public relayer;

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

    function mintPoints(address to, uint256 amount) external {
        require(msg.sender == relayer, "Only relayer can mint points");
        _balances[to] += amount;
    }

    function burnPoints(address from, uint256 amount) internal {
        require(_balances[from] >= amount, "Insufficient points");
        _balances[from] -= amount;
    }

    function pointBalanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    // ======================== NFT 铸造控制 ========================
    uint256 public nextTokenId;

    /// @notice 用户兑换：需验证签名 + 积分消耗
    mapping(address => uint256) public userNonce;

    

    function redeem(
        address user,
        string calldata uri,
        uint256 cost,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external {
        require(msg.sender == relayer, "Only relayer can call");
        require(block.timestamp <= deadline, "Signature expired");
        require(nonce == userNonce[user], "Invalid nonce");

        bytes32 hash = keccak256(abi.encodePacked(user, uri, cost, deadline, nonce, address(this)));
        
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        address signer = ECDSA.recover(ethHash, signature);
        require(signer == user, "Invalid signature");

        userNonce[user]++;
        burnPoints(user, cost);

        uint256 tokenId = nextTokenId++;
        _mint(user, tokenId);
        _setTokenURI(tokenId, uri);
    }

    /// @notice 平台直接发 NFT（无积分、无签名）
    function issue(address user, string calldata uri) external {
        require(msg.sender == relayer, "Only relayer can call");

        uint256 tokenId = nextTokenId++;
        _mint(user, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // ======================== NFT 查询 ========================
    function getUserNFTs(address user) external view returns (
        uint256[] memory tokenIds,
        string[] memory uris
    ) {
        uint256 count = balanceOf(user);
        tokenIds = new uint256[](count);
        uris = new string[](count);

        uint256 found = 0;
        for (uint256 i = 0; i < nextTokenId; i++) {
            if (ownerOf(i) == user) {
                tokenIds[found] = i;
                uris[found] = tokenURI(i);
                found++;
            }
        }
    }

    // ======================== 合约基础配置 ========================
    constructor() ERC721("WineNFT", "WINE") Ownable(msg.sender) {}

    receive() external payable {}

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
