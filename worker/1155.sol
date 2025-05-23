// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// ========== 内部定义的 ERC20（积分合约） ==========
contract WinePointERC20 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    mapping(address => uint256) private _balances;
    address public controller;

    string public tokenName;
    string public tokenSymbol;
    uint8 public decimals;

    modifier onlyController() {
        require(msg.sender == controller, "Not controller");
        _;
    }

    function initialize(
        address _controller,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        controller = _controller;
        tokenName = _name;
        tokenSymbol = _symbol;
        decimals = _decimals;
    }

    function name() external view returns (string memory) {
        return tokenName;
    }

    function symbol() external view returns (string memory) {
        return tokenSymbol;
    }

    function mint(address to, uint256 amount) external onlyController {
        _balances[to] += amount;
    }

    function burn(address from, uint256 amount) external onlyController {
        require(_balances[from] >= amount, "Insufficient");
        _balances[from] -= amount;
    }

    function balanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}

// ========== 主合约（自动部署 ERC20 + NFT） ==========
contract WinePlatform1155 is
    Initializable,
    ERC1155URIStorageUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using ECDSA for bytes32;

    address public relayer;
    address public erc20Proxy;

    string public tokenName;
    string public tokenSymbol;

    mapping(address => uint256) public userNonce;

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer can call");
        _;
    }

    function initialize(
        address relayer_,
        string memory _name,
        string memory _symbol
    ) public initializer {
        __ERC1155_init("");
        __ERC1155URIStorage_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        relayer = relayer_;
        tokenName = _name;
        tokenSymbol = _symbol;

        // 自动部署积分代币并传入 name/symbol/decimals
        WinePointERC20 logic = new WinePointERC20();
        bytes memory initData = abi.encodeWithSelector(
            WinePointERC20.initialize.selector,
            address(this),
            "Wine Point",
            "WP",
            6
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(logic), initData);
        erc20Proxy = address(proxy);
    }

    function name() external view returns (string memory) {
        return tokenName;
    }

    function symbol() external view returns (string memory) {
        return tokenSymbol;
    }

    // ========== 积分接口 ==========

    function mintPoints(address to, uint256 amount) external onlyRelayer {
        WinePointERC20(erc20Proxy).mint(to, amount);
    }

    function burnPoints(address from, uint256 amount) internal {
        WinePointERC20(erc20Proxy).burn(from, amount);
    }

    function pointBalanceOf(address user) external view returns (uint256) {
        return WinePointERC20(erc20Proxy).balanceOf(user);
    }

    // ========== NFT 铸造逻辑 ==========

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
        address signer = ethHash.recover(signature);
        require(signer == user, "Invalid signature");

        userNonce[user]++;
        burnPoints(user, cost);

        _mint(user, tokenId, amount, "");
        _setURI(tokenId, uri);
    }

    function issue(
        address user,
        uint256 tokenId,
        string calldata uri,
        uint256 amount
    ) external onlyRelayer {
        _mint(user, tokenId, amount, "");
        _setURI(tokenId, uri);
    }

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
            if (balanceOf(user, i) > 0) count++;
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

    // ========== 外部查询 ==========

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    receive() external payable {}

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
