// fetch-nft-data.js

const fs = require('fs');
const { ethers } = require('ethers');
const fetch = require('node-fetch'); // 注意：需要安装 node-fetch

// 📦 定义Provider
const dataProvider = new ethers.JsonRpcProvider(
  "https://polygon-mainnet.infura.io/v3/16dcd1224e3c45429d04fe6e9c7e788b"
);

// 📦 定义你的Marketplace合约地址
const marketplaceAddress = "0x82aC52E1138344486C61C85697E8814a10060b23"; // <-- 记得改成你的地址！

// 小工具函数
function toSafeString(val) {
  if (val?._isBigNumber) {
    return val.toString();
  }
  return val.toString();
}

function mapRawListing(raw) {
  return {
    listingId: toSafeString(raw[0]),
    tokenId: toSafeString(raw[1]),
    quantity: toSafeString(raw[2]),
    pricePerToken: toSafeString(raw[3]),
    startTimestamp: toSafeString(raw[4]),
    endTimestamp: toSafeString(raw[5]),
    listingCreator: (typeof raw[6] === "string") ? raw[6] : toSafeString(raw[6]),
    assetContract: (typeof raw[7] === "string") ? raw[7] : toSafeString(raw[7]),
    currency: (typeof raw[8] === "string") ? raw[8] : toSafeString(raw[8]),
    tokenType: raw[9],
    status: raw[10],
    reserved: raw[11]
  };
}

function computeHash(data) {
  const json = JSON.stringify(data);
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(json));
}

// 📦 主要函数
async function main() {
  const CACHE_DIR = "./cache";
  const listingsFile = `${CACHE_DIR}/listings.json`;
  const listingsHashFile = `${CACHE_DIR}/listings_hash.txt`;

  // 确保缓存目录存在
  if (!fs.existsSync(CACHE_DIR)){
    fs.mkdirSync(CACHE_DIR);
  }

  const marketplace = new ethers.Contract(marketplaceAddress, [
    "function totalListings() view returns (uint256)",
    "function getAllValidListings(uint256 startId, uint256 endId) view returns (tuple(" +
      "uint256 listingId," +
      "uint256 tokenId," +
      "uint256 quantity," +
      "uint256 pricePerToken," +
      "uint256 startTimestamp," +
      "uint256 endTimestamp," +
      "address listingCreator," +
      "address assetContract," +
      "address currency," +
      "uint8 tokenType," +
      "uint8 status," +
      "bool reserved" +
    ")[])"
  ], dataProvider);

  try {
    console.log("🔍 正在拉取链上Listings...");

    const totalListings = await marketplace.totalListings();
    const total = Number(totalListings);

    if (total === 0) {
      console.warn("⚠️ 当前链上没有任何Listing");
      fs.writeFileSync(listingsFile, JSON.stringify([]));
      return;
    }

    const maxId = total - 1;
    const rawListings = await marketplace.getAllValidListings(0, maxId);
    const listings = rawListings.map(mapRawListing);

    const latestHash = computeHash(listings);
    let oldHash = "";

    if (fs.existsSync(listingsHashFile)) {
      oldHash = fs.readFileSync(listingsHashFile, 'utf8');
    }

    if (latestHash === oldHash) {
      console.log("🛢️ Listings数据无变化，跳过更新");
    } else {
      console.log("✅ Listings数据有变化，更新缓存");

    fs.writeFileSync(listingsFile, JSON.stringify(
      listings,
      (key, value) => typeof value === 'bigint' ? value.toString() : value,
      2
    ));


      fs.writeFileSync(listingsHashFile, latestHash);

      await fetchAllNFTMetadata(listings);
    }
  } catch (err) {
    console.error("❌ 拉取Listings失败:", err.message || err);
  }
}

// 📦 拉取单个NFT Metadata
async function fetchNFTMetadata(nftContractAddress, tokenId, listingId) {
  const nftABI = [
    "function uri(uint256 tokenId) view returns (string)"
  ];
  const nftContract = new ethers.Contract(nftContractAddress, nftABI, dataProvider);

  try {
    console.log(`🔍 读取NFT Metadata: 合约=${nftContractAddress}, tokenId=${tokenId}`);

    let uri = await nftContract.uri(tokenId);

    // 处理IPFS链接
    if (uri.startsWith("ipfs://")) {
      uri = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    if (uri.includes("{id}")) {
      const hexId = ethers.BigNumber.from(tokenId).toHexString().substring(2).padStart(64, "0");
      uri = uri.replace("{id}", hexId);
    }

    console.log(`📄 Metadata链接: ${uri}`);

    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Metadata加载失败，状态码：${res.status}`);

    const metadata = await res.json();
    const metadataFile = `./cache/metadata_${listingId}.json`;
    fs.writeFileSync(metadataFile, JSON.stringify(
      metadata,
      (key, value) => typeof value === 'bigint' ? value.toString() : value,
      2
    ));


    console.log(`✅ Metadata保存成功：${metadataFile}`);
  } catch (err) {
    console.error(`❌ 读取NFT Metadata失败: ${err.message || err}`);
  }
}

// 📦 批量拉取
async function fetchAllNFTMetadata(listings) {
  for (const item of listings) {
    await fetchNFTMetadata(item.assetContract, item.tokenId, item.listingId);
  }
  console.log("🏁 所有NFT Metadata处理完成！");
}

main();
