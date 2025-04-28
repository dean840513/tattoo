// fetch-nft-data.js

const fs = require('fs');
const { ethers } = require('ethers');
const fetch = require('node-fetch'); // 注意：需要安装 node-fetch
const { keccak256, toUtf8Bytes } = require("ethers");

// 📦 定义Provider
// Polygon
if (!process.env.INFURA_ID) throw new Error('INFURA_ID is not set');
const INFURA_ID = process.env.INFURA_ID;
const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_ID}`);
// Anvil
// const dataProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// 📦 定义你的Marketplace合约地址
// Polygon
const marketplaceAddress = "0x82aC52E1138344486C61C85697E8814a10060b23"; // <-- 记得改成你的地址！
// Anvil
// const marketplaceAddress = "0xBc65508443bE8008Cf5af3973CCeF97F1Ea8888d"; // <-- 记得改成你的地址！

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
  const json = JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  return keccak256(toUtf8Bytes(json));
}

// 📦 主要函数
async function main() {
  const CACHE_DIR = "./cache";
  const listingsFile = `${CACHE_DIR}/listings.json`;
  const listingsHashFile = `${CACHE_DIR}/listings_hash.txt`;

  if (!fs.existsSync(CACHE_DIR)) {
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
      return;
    }

    console.log("✅ Listings数据有变化，更新缓存");

    fs.writeFileSync(listingsFile, JSON.stringify(
      listings,
      (key, value) => typeof value === 'bigint' ? value.toString() : value,
      2
    ));
    fs.writeFileSync(listingsHashFile, latestHash);

    await fetchAllNFTMetadata(listings);
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

    return metadata;
  } catch (err) {
    console.error(`❌ 读取NFT Metadata失败: ${err.message || err}`);
    return null;
  }
}

// 📦 批量拉取
async function fetchAllNFTMetadata(listings) {
  const allMetadata = [];

  for (const item of listings) {
    const metadataFile = `./cache/metadata_${item.listingId}.json`;

    if (fs.existsSync(metadataFile)) {
      console.log(`🛢️ Metadata已存在，跳过 listingId=${item.listingId}`);
      const metadataRaw = fs.readFileSync(metadataFile, 'utf8');
      const metadata = JSON.parse(metadataRaw);
      allMetadata.push({
        listingId: item.listingId,
        tokenId: item.tokenId,
        assetContract: item.assetContract,
        pricePerToken: item.pricePerToken,
        name: metadata.name || "",
        description: metadata.description || "",
        image: metadata.image || "",
        attributes: metadata.attributes || []
      });
    } else {
      const metadata = await fetchNFTMetadata(item.assetContract, item.tokenId, item.listingId);
      if (metadata) {
        allMetadata.push({
          listingId: item.listingId,
          tokenId: item.tokenId,
          assetContract: item.assetContract,
          pricePerToken: item.pricePerToken,
          name: metadata.name || "",
          description: metadata.description || "",
          image: metadata.image || "",
          attributes: metadata.attributes || []
        });
      }
    }
  }

  fs.writeFileSync("./cache/all_metadata.json", JSON.stringify(
    allMetadata,
    (key, value) => typeof value === 'bigint' ? value.toString() : value,
    2
  ));

  console.log("🏁 所有NFT Metadata处理完成！✅ 已生成 all_metadata.json");
}

main();
