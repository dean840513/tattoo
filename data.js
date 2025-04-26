// 📦 统一管理商品列表数据（精简版 + hash变化检测）
async function getListingsData() {
  const CACHE_DATA_KEY = "nft_full_cache";             // 完整缓存
  const CACHE_TIME_KEY = "nft_full_cache_time";         // 缓存时间
  const CACHE_HASH_KEY = "nft_listings_cache_hash";     // listings哈希值
  const CACHE_VALID_TIME = 5 * 60 * 1000;               // 5分钟有效期
  const now = Date.now();

  const provider = new ethers.providers.JsonRpcProvider("https://polygon-mainnet.infura.io/v3/你的项目ID");
  const marketplace = new ethers.Contract(window.marketplaceAddress, [
    "function totalListings() view returns (uint256)",
    "function getAllValidListings(uint256 startId, uint256 endId) view returns (tuple(uint256 id, address seller, address assetContract, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, uint256 startTime, uint256 endTime, uint8 listingType, uint8 tokenType)[])"
  ], provider);

  const nftABI = ["function uri(uint256 tokenId) view returns (string)"];

  try {
    // 先检查缓存
    const cachedData = localStorage.getItem(CACHE_DATA_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const cachedHash = localStorage.getItem(CACHE_HASH_KEY);

    if (cachedData && cachedTime && (now - parseInt(cachedTime)) < CACHE_VALID_TIME) {
      console.log("🛢️ 使用缓存数据（未到超时）");
      return JSON.parse(cachedData);
    }

    console.log("🔄 超时，开始检查链上变化...");

    // 重新拉链上listing
    const totalListings = await marketplace.totalListings();
    const maxId = totalListings.toNumber() - 1;
    const listings = await marketplace.getAllValidListings(0, maxId);

    // 计算新的listing hash
    const newHash = await calculateHash(listings);

    if (cachedData && cachedHash && (newHash === cachedHash)) {
      console.log("🛢️ Hash一致，继续使用本地缓存");
      localStorage.setItem(CACHE_TIME_KEY, now.toString()); // 更新缓存时间
      return JSON.parse(cachedData);
    }

    console.log("⚡ Hash变化，重新拉取Metadata并更新缓存");

    const fullData = [];

    for (const listing of listings) {
      try {
        const simpleListing = {
          listingId: listing.id?.toString() || listing.listingId?.toString() || "0",
          tokenId: listing.tokenId.toString(),
          quantity: listing.quantity.toString(),
          pricePerToken: listing.pricePerToken.toString(),
          status: listing.status
        };

        // 初始化NFT合约（注意统一assetContract地址的话可以固定掉）
        const nftContract = new ethers.Contract(listing.assetContract, nftABI, provider);

        // 调用uri(tokenId)
        let tokenUri = await nftContract.uri(listing.tokenId);

        if (tokenUri.includes("{id}")) {
          const hexId = ethers.BigNumber.from(listing.tokenId).toHexString().substring(2).padStart(64, '0');
          tokenUri = tokenUri.replace("{id}", hexId);
        }

        // fetch metadata
        const response = await fetch(convertIpfsUrl(tokenUri));
        if (!response.ok) throw new Error(`Metadata加载失败: ${tokenUri}`);
        const metadataRaw = await response.json();

        const simpleMetadata = {
          name: metadataRaw.name || "",
          description: metadataRaw.description || "",
          image: convertIpfsUrl(metadataRaw.image),
          attributes: Array.isArray(metadataRaw.attributes) ? metadataRaw.attributes : []
        };

        fullData.push({
          listing: simpleListing,
          metadata: simpleMetadata
        });

      } catch (metaErr) {
        console.warn("⚠️ 某个NFT Metadata加载失败:", metaErr);
      }
    }

    console.log(`✅ 成功拉取并整理 ${fullData.length} 条商品数据`);

    // 保存缓存
    localStorage.setItem(CACHE_DATA_KEY, JSON.stringify(fullData));
    localStorage.setItem(CACHE_HASH_KEY, newHash);
    localStorage.setItem(CACHE_TIME_KEY, now.toString());

    return fullData;
  } catch (err) {
    console.error("❌ 获取商品完整数据失败:", err);
    return []; // 出错时返回空数组，保证前端不崩溃
  }
}

// 🔥 工具函数：计算SHA256 hash
async function calculateHash(data) {
  const encoder = new TextEncoder();
  const jsonStr = JSON.stringify(data);
  const bytes = encoder.encode(jsonStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 工具函数：处理IPFS链接
function convertIpfsUrl(url) {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  if (url.startsWith("/ipfs/")) {
    return "https://ipfs.io" + url;
  }
  return url;
}
