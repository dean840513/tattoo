function toSafeString(val) {
  if (val?._isBigNumber) {
    return val.toString();
  }
  return val.toString();
}

function mapRawListing(raw) {
  return {
    listingId: toSafeString(raw[0]),         // uint256
    tokenId: toSafeString(raw[1]),            // uint256
    quantity: toSafeString(raw[2]),           // uint256
    pricePerToken: toSafeString(raw[3]),      // uint256
    startTimestamp: toSafeString(raw[4]),     // uint256
    endTimestamp: toSafeString(raw[5]),       // uint256
    listingCreator: (typeof raw[6] === "string") ? raw[6] : toSafeString(raw[6]), // address
    assetContract: (typeof raw[7] === "string") ? raw[7] : toSafeString(raw[7]),  // address
    currency: (typeof raw[8] === "string") ? raw[8] : toSafeString(raw[8]),       // address
    tokenType: raw[9],                        // uint8
    status: raw[10],                          // uint8
    reserved: raw[11]                         // bool
  };
}

// 依赖：ethers.js必须加载好
// 这个是辅助计算Hash的小函数
function computeHash(data) {
  const json = JSON.stringify(data);
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(json));
}

// 📦 带哈希缓存比对的 Listings 拉取函数
async function getListingsData() {
  const CACHE_KEY = "nft_listings_cache";
  const CACHE_TIME_KEY = "nft_listings_cache_time";
  const HASH_KEY = "nft_listings_cache_hash";
  const CACHE_VALID_TIME = 0 * 60 * 1000; // 5分钟
  const now = Date.now();

  const provider = new ethers.providers.JsonRpcProvider("https://polygon-mainnet.infura.io/v3/16dcd1224e3c45429d04fe6e9c7e788b"); // 本地Anvil
  const marketplace = new ethers.Contract(window.marketplaceAddress, [
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
  ], provider);

  try {
    // 先检查缓存是否还在有效期
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const cachedHash = localStorage.getItem(HASH_KEY);

    if (cachedData && cachedTime && (now - parseInt(cachedTime)) < CACHE_VALID_TIME) {
      console.log("🛢️ 使用缓存的Listings数据（时间未过期）");
      return JSON.parse(cachedData);
    }

    console.log("🔄 缓存超时或不存在，拉取链上Listings");

    const totalListings = await marketplace.totalListings();
    const total = totalListings.toNumber();
    if (total === 0) {
      console.warn("⚠️ 当前链上没有任何Listing");
      localStorage.setItem(CACHE_KEY, JSON.stringify([]));
      localStorage.setItem(CACHE_TIME_KEY, now.toString());
      localStorage.setItem(HASH_KEY, "");
      return [];
    }

    const maxId = total - 1;
    const rawListings = await marketplace.getAllValidListings(0, maxId);

    // 批量map成标准对象
    const listings = rawListings.map(mapRawListing);

    // 计算链上最新数据的Hash
    const latestHash = computeHash(listings);

    if (latestHash === cachedHash) {
      console.log("🛢️ Listings数据内容无变化，继续使用旧缓存");
      localStorage.setItem(CACHE_TIME_KEY, now.toString()); // 更新一下时间，延长缓存
      return JSON.parse(cachedData);
    }

    console.log("✅ Listings数据有变化，更新缓存");

    // 更新缓存
    localStorage.setItem(CACHE_KEY, JSON.stringify(listings));
    localStorage.setItem(CACHE_TIME_KEY, now.toString());
    localStorage.setItem(HASH_KEY, latestHash);

    // await loadAllNFTMetadata(listings);
    return listings;
  } catch (err) {
    console.error("❌ 拉取Listings失败:", err.message || err);
    return [];
  }
}

// 📦 读取单个NFT Metadata并缓存
async function fetchNFTMetadata(nftContractAddress, tokenId, listingId) {
  const CACHE_KEY = `nft_metadata_cache_${listingId}`;
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  const nftABI = [
    "function uri(uint256 tokenId) view returns (string)"
  ];
  const nftContract = new ethers.Contract(nftContractAddress, nftABI, provider);

  try {
    console.log(`🔍 正在读取NFT Metadata: 合约=${nftContractAddress}，tokenId=${tokenId}`);
    
    let uri = await nftContract.uri(tokenId);

    // 处理IPFS链接
    if (uri.startsWith("ipfs://")) {
      uri = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    if (uri.includes("{id}")) {
      const hexId = ethers.BigNumber.from(tokenId).toHexString().substring(2).padStart(64, "0");
      uri = uri.replace("{id}", hexId);
    }

    console.log("📄 NFT Metadata链接：", uri);

    const res = await fetch(uri);
    if (!res.ok) throw new Error("Metadata文件加载失败");

    const metadata = await res.json();
    console.log("✅ 成功拉取Metadata：", metadata);

    // 保存缓存 + 时间戳
    const saveData = {
      metadata: metadata,
      cacheTime: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(saveData));
  } catch (err) {
    console.error(`❌ 读取NFT失败: 合约=${nftContractAddress}, tokenId=${tokenId}`, err.message || err);
  }
}


// 📦 根据Listings批量加载所有NFT Metadata
async function loadAllNFTMetadata() {
  try {
    const listings = await getListingsData(); // 使用你缓存过或新拉的Listings数据
    const MAX_CACHE_AGE = 5 * 24 * 60 * 60 * 1000; // 5天，单位ms
    const now = Date.now();

    for (const item of listings) {
      const nftContractAddress = item.assetContract;
      const tokenId = item.tokenId;
      const listingId = item.listingId;
      const CACHE_KEY = `nft_metadata_cache_${listingId}`;

      const cachedDataRaw = localStorage.getItem(CACHE_KEY);

      if (cachedDataRaw) {
        const cachedData = JSON.parse(cachedDataRaw);
        const cacheTime = cachedData.cacheTime || 0;

        if (now - cacheTime < MAX_CACHE_AGE) {
          console.log(`🛢️ NFT Metadata缓存有效，跳过拉取：listingId ${listingId}`);
          continue; // 缓存还在有效期，不用重新拉
        } else {
          console.log(`⏰ NFT Metadata缓存过期，重新拉取：listingId ${listingId}`);
        }
      } else {
        console.log(`📦 NFT Metadata不存在，需要拉取：listingId ${listingId}`);
      }

      // 如果没有缓存，或者缓存过期了，重新拉取
      await fetchNFTMetadata(nftContractAddress, tokenId, listingId);
    }

    console.log("✅ 全部NFT Metadata处理完成！");
  } catch (err) {
    console.error("❌ 批量拉取NFT Metadata失败:", err.message || err);
  }
}

