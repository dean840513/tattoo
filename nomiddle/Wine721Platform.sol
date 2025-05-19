// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Wine721Platform is ERC721, Ownable {
    using Strings for uint256;

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
        uint256 listingId;
        uint256 cost;
        uint256 stock;
        uint8 status;        // 0=下架, 1=上架, 2=售罄
        address creator;
        uint256 createdAt;
    }

    Listing[] public listings;
    string public baseURI = "ipfs://QmYourRootCID/";

    function createList(
        uint256 cost,
        uint256 stock
    ) external onlyOwner {
        listings.push(Listing({
            listingId: listings.length,
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
    mapping(uint256 => uint256) public listingNextIndex; // listingId => 当前编号

    function redeem(uint256 listingId) external {
        require(listingId < listings.length, "Invalid listing");
        Listing storage item = listings[listingId];

        require(item.status == 1, "Item not for sale");
        require(item.stock >= 1, "Out of stock");
        require(_balances[msg.sender] >= item.cost, "Insufficient points");

        burnPoints(msg.sender, item.cost);

        uint256 index = listingNextIndex[listingId] + 1;
        listingNextIndex[listingId] = index;

        uint256 tokenId = listingId * 1_000_000 + index;
        item.stock -= 1;
        if (item.stock == 0) {
            item.status = 2;
        }

        _mint(msg.sender, tokenId);
    }

    function issue(address to, uint256 tokenId) external onlyOwner {
        _mint(to, tokenId);
    }

    // ======================== 自动拼接 URI ========================
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        uint256 listingId = tokenId / 1_000_000;
        return string(abi.encodePacked(_baseURI(), listingId.toString(), ".json"));
    }

    function setBaseURI(string memory newuri) external onlyOwner {
        baseURI = newuri;
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
