// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WineNFTSimplified is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    // ============ 积分系统 ============
    mapping(address => uint256) private _points;

    function mintPoints(address to, uint256 amount) external onlyOwner {
        _points[to] += amount;
    }

    function burnPoints(address from, uint256 amount) internal {
        require(_points[from] >= amount, "Insufficient points");
        unchecked {
            _points[from] -= amount;
        }
    }

    function pointBalanceOf(address user) external view returns (uint256) {
        return _points[user];
    }

    // ============ 商品列表 ============
    struct Listing {
        string uri;
        uint256 cost;
        uint256 stock;
        uint8 status; // 0 = 下架, 1 = 上架
        address creator;
        uint256 createdAt;
    }

    Listing[] public listings;

    function createList(
        string memory uri,
        uint256 cost,
        uint256 stock
    ) external onlyOwner {
        listings.push(Listing({
            uri: uri,
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

    // ============ NFT 兑换 ============
    function redeem(uint256 listingId) external {
        require(listingId < listings.length, "Invalid listing");
        Listing storage item = listings[listingId];

        require(item.status == 1, "Not for sale");
        require(item.stock > 0, "Out of stock");

        burnPoints(msg.sender, item.cost);

        item.stock--;
        if (item.stock == 0) {
            item.status = 0; // 自动下架
        }

        uint256 tokenId = nextTokenId++;
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, item.uri);
    }

    // ============ 合约基础 ============
    constructor() ERC721("WineNFT", "WINE") Ownable(msg.sender) {}

    receive() external payable {}

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTokenInfo(uint256 tokenId) public view returns (string memory uri, address owner) {
        owner = ownerOf(tokenId);
        uri = tokenURI(tokenId);
    }

    struct NFTInfo {
        uint256 tokenId;
        address owner;
        string uri;
    }

    function getAllMintedNFTs() public view returns (NFTInfo[] memory) {
        uint256 total = nextTokenId;
        NFTInfo[] memory result = new NFTInfo[](total);

        for (uint256 i = 0; i < total; i++) {
            result[i] = NFTInfo({
                tokenId: i,
                owner: ownerOf(i),
                uri: tokenURI(i)
            });
        }

        return result;
    }

}
