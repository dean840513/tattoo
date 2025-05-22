// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract WinePlatform1155 is
    Initializable,
    ERC1155URIStorageUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
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
    mapping(address => uint256) public userNonce;

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer can call");
        _;
    }

    /// @notice 用户兑换：需验证签名 + 积分消耗
    function redeem(
        address user,
        uint256 tokenId,
        string calldata uri,
        uint256 amount,
        uint256 cost,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external onlyRelayer {
        require(block.timestamp <= deadline, "Signature expired");
        require(nonce == userNonce[user], "Invalid nonce");

        bytes32 hash = keccak256(
            abi.encodePacked(
                user,
                tokenId,
                uri,
                amount,
                cost,
                deadline,
                nonce,
                address(this)
            )
        );

        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        address signer = ECDSA.recover(ethHash, signature);
        require(signer == user, "Invalid signature");

        userNonce[user]++;
        burnPoints(user, cost);

        _mint(user, tokenId, amount, "");
        _setURI(tokenId, uri);
    }

    /// @notice 平台直接发 NFT（无积分、无签名）
    function issue(
        address user,
        uint256 tokenId,
        string calldata uri,
        uint256 amount
    ) external onlyRelayer {
        _mint(user, tokenId, amount, "");
        _setURI(tokenId, uri);
    }

    // ======================== NFT 查询 ========================
    function getUserNFTs(address user)
        external
        view
        returns (
            uint256[] memory tokenIds,
            uint256[] memory amounts,
            string[] memory uris
        )
    {
        uint256 max = 100;
        uint256 count = 0;

        for (uint256 i = 0; i < max; i++) {
            if (balanceOf(user, i) > 0) {
                count++;
            }
        }

        tokenIds = new uint256[](count);
        amounts = new uint256[](count);
        uris = new string[](count);

        uint256 found = 0;
        for (uint256 i = 0; i < max; i++) {
            uint256 bal = balanceOf(user, i);
            if (bal > 0) {
                tokenIds[found] = i;
                amounts[found] = bal;
                uris[found] = uri(i);
                found++;
            }
        }
    }

    // ======================== 合约基础配置 ========================
    function initialize(address owner_, address relayer_) public initializer {
        __ERC1155_init("");
        __ERC1155URIStorage_init();
        __Ownable_init(owner_);
        __UUPSUpgradeable_init();

        relayer = relayer_;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    receive() external payable {}

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
