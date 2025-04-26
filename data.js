// 📦 统一管理商品列表数据（极简版，精简字段）
async function getListingsData() {
  const CACHE_KEY = "nft_full_cache";         // 缓存Key
  const CACHE_TIME_KEY = "nft_full_cache_time"; // 缓存时间Key
  const CACHE_VALID_TIME = 5 * 60 * 1000;       // 5分钟缓存有效期
  const now = Date.now();

  try {
    // 先检查缓存
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    if (cachedData && cachedTime && (now - parseInt(cachedTime)) < CACHE_VALID_TIME) {
      console.log("🛢️ 使用缓存的商品数据");
      return JSON.parse(cachedData);
    }

    console.log("🔄 缓存过期或不存在，拉取链上数据");

    const provider = new ethers.providers.JsonRpcProvider("https://polygon-mainnet.infura.io/v3/你的项目ID");
    const marketplace = new ethers.Contract(window.marketplaceAddress, [
      "function totalListings() view returns (uint256)",
      "function getAllValidListings(uint256 startId, uint256 endId) view returns (tuple(uint256 id, address seller, address assetContract, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, uint256 startTime, uint256 endTime, uint8 listingType, uint8 tokenType)[])"
    ], provider);

    const nftABI = ["function uri(uint256 tokenId) view returns (string)"];

    // 查询总Listing数
    const totalListings = await marketplace.totalListings();
    const maxId = totalListings.toNumber() - 1;

    console.log("📦 链上总Listing数量:", totalListings.toString());

    // 拉取所有有效Listing
    const listings = await marketplace.getAllValidListings(0, maxId);

    const fullData = []; // 存放每个 [listing + metadata]

    for (const listing of listings) {
      try {
        // 只提取必要字段
        const simpleListing = {
          listingId: listing.id?.toString() || listing.listingId?.toString() || "0",
          tokenId: listing.tokenId.toString(),
          quantity: listing.quantity.toString(),
          pricePerToken: listing.pricePerToken.toString(),
          status: listing.status
        };

        // 初始化NFT合约（因为assetContract统一，所以这里可以统一定义）
        const nftContract = new ethers.Contract(listing.assetContract, nftABI, provider);

        // 调用uri(tokenId)
        let tokenUri = await nftContract.uri(listing.tokenId);

        // 如果uri里有 {id} 占位符，替换掉
        if (tokenUri.includes("{id}")) {
          const hexId = ethers.BigNumber.from(listing.tokenId).toHexString().substring(2).padStart(64, '0');
          tokenUri = tokenUri.replace("{id}", hexId);
        }

        // fetch Metadata JSON
        const response = await fetch(convertIpfsUrl(tokenUri));
        if (!response.ok) throw new Error(`Metadata加载失败: ${tokenUri}`);
        const metadataRaw = await response.json();

        // 只提取必要字段
        const simpleMetadata = {
          name: metadataRaw.name || "",
          description: metadataRaw.description || "",
          image: convertIpfsUrl(metadataRaw.image),
          attributes: Array.isArray(metadataRaw.attributes) ? metadataRaw.attributes : []
        };

        // 合并 simpleListing + simpleMetadata
        fullData.push({
          listing: simpleListing,
          metadata: simpleMetadata
        });

      } catch (metaErr) {
        console.warn("⚠️ 某个NFT Metadata加载失败:", metaErr);
        // 即使单个失败，也不影响整个列表渲染
      }
    }

    console.log(`✅ 成功拉取并整理 ${fullData.length} 条商品数据`);

    // 保存完整缓存
    localStorage.setItem(CACHE_KEY, JSON.stringify(fullData));
    localStorage.setItem(CACHE_TIME_KEY, now.toString());

    return fullData;
  } catch (err) {
    console.error("❌ 获取商品数据失败:", err);
    return []; // 出错时返回空数组，保证前端不崩溃
  }
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
