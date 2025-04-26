// 📦 统一管理商品列表数据
async function getListingsData() {
  const CACHE_KEY = "nft_listings_cache";
  const CACHE_TIME_KEY = "nft_listings_cache_time";
  const CACHE_VALID_TIME = 5 * 60 * 1000; // 5分钟
  const now = Date.now();

  try {
    // 先检查缓存
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    if (cachedData && cachedTime && (now - parseInt(cachedTime)) < CACHE_VALID_TIME) {
      console.log("🛢️ 使用缓存商品列表");
      return JSON.parse(cachedData);
    }

    console.log("🔄 缓存过期或不存在，拉取链上数据");

    const provider = new ethers.providers.JsonRpcProvider("https://polygon-mainnet.infura.io/v3/你的项目ID");
    const marketplace = new ethers.Contract(window.marketplaceAddress, [
      "function totalListings() view returns (uint256)",
      "function getAllValidListings(uint256 startId, uint256 endId) view returns (tuple(uint256 id, address seller, address assetContract, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, uint256 startTime, uint256 endTime, uint8 listingType, uint8 tokenType)[])"
    ], provider);

    // 查询最大ID
    const totalListings = await marketplace.totalListings();
    const maxId = totalListings.toNumber() - 1;

    console.log("📦 链上总Listing数量:", totalListings.toString());

    // 拉取所有有效Listing
    const listings = await marketplace.getAllValidListings(0, maxId);

    // 存缓存
    localStorage.setItem(CACHE_KEY, JSON.stringify(listings));
    localStorage.setItem(CACHE_TIME_KEY, now.toString());

    return listings;
  } catch (err) {
    console.error("❌ 获取商品数据失败:", err);
    return []; // 出错时返回空数组，保证前端不崩溃
  }
}
