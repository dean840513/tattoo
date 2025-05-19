// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Wine1155Platform is ERC1155, Ownable {
    // ======================== 积分逻辑 ========================
    mapping(address => uint256) private _balances;

    function mintPoints(address to, uint256 amount) external onlyOwner {
        _balances[to] += amount;
    }

    function burnPoints(address from, uint256 amount) internal {
        require(_balances[from] >= amount, "Insufficient points");
        unchecked {
            _balances[from] -= amount;
        }
    }

    function pointBalanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    // ======================== 商品列表逻辑 ========================
    struct Listing {
        uint256 tokenId;
        uint256 cost;
        uint256 stock;
        uint8 status;        // 0=下架, 1=上架, 2=售罄
        address creator;
        uint256 createdAt;
    }

    Listing[] public listings;

    function createList(
        uint256 tokenId,
        uint256 cost,
        uint256 stock
    ) external onlyOwner {
        listings.push(Listing({
            tokenId: tokenId,
            cost: cost,
            stock: stock,
            status: 1,
            creator: msg.sender,
            createdAt: block.timestamp
        }));
    }

    function updateList(
        uint256 listingId,
        uint256 cost,
        uint256 stock,
        uint8 status
    ) external onlyOwner {
        require(listingId < listings.length, "Invalid listing");
        Listing storage item = listings[listingId];
        item.cost = cost;
        item.stock = stock;
        item.status = status;
    }

    function getAllList() external view returns (Listing[] memory) {
        return listings;
    }

    // ======================== NFT 铸造逻辑 ========================
    function redeem(uint256 listingId, uint256 amount) external {
        require(listingId < listings.length, "Invalid listing");
        Listing storage item = listings[listingId];

        require(item.status == 1, "Item not for sale");
        require(item.stock >= amount, "Out of stock");
        require(_balances[msg.sender] >= item.cost * amount, "Insufficient points");

        burnPoints(msg.sender, item.cost * amount);

        item.stock -= amount;
        if (item.stock == 0) {
            item.status = 2;
        }

        _mint(msg.sender, item.tokenId, amount, "");
    }

    function issue(address to, uint256 tokenId, uint256 amount) external onlyOwner {
        _mint(to, tokenId, amount, "");
    }

    // ======================== URI 可升级模板 ========================
    constructor() ERC1155("ipfs://QmYourRootCID/{id}.json") {}

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    // ======================== 合约基础配置 ========================
    receive() external payable {}

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
