async function buy(listingId, price) {
  const marketplace = new ethers.Contract(window.marketplaceAddress, window.MARKETPLACE_ABI, signer);
  const totalPrice = ethers.utils.parseUnits(price, 18);

  showWalletOverlay();

  try {

    console.log("📦 调用参数：", {
      listingId,
      userAddress,
      quantity: 1,
      currency: window.tatTokenAddress,
      price: totalPrice.toString()
    });

    const tx = await marketplace.buyFromListing(
      listingId,
      userAddress,
      1,
      window.tatTokenAddress,
      totalPrice
    );
    await tx.wait();
    alert("✅ 购买成功！");
    await showTatBalance();
  } catch (err) {
    alert("❌ 购买失败：" + err.message);
  } finally {
    hideWalletOverlay();
  }
}

async function renderNFTs() {
  const loading = document.getElementById("nftLoading");
  const container = document.getElementById("nftGrid");

  loading.style.display = "block";
  container.innerHTML = "";

  try {
    // 从localStorage读取Listings缓存
    const cachedListings = localStorage.getItem("nft_listings_cache");
    if (!cachedListings) throw new Error("没有找到缓存的Listings数据");

    const listings = JSON.parse(cachedListings);

    for (const item of listings) {
      // 这里根据你之前逻辑，假设status==1才是上架状态
      if (item.status !== 1) continue;

      try {
        const metadataRaw = localStorage.getItem(`nft_metadata_cache_${item.listingId}`);
        if (!metadataRaw) throw new Error(`没有找到ListingID=${item.listingId}对应的Metadata缓存`);

        const metadataObj = JSON.parse(metadataRaw);
        const metadata = metadataObj.metadata || metadataObj; // 兼容老缓存格式

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${metadata.image}" alt="${metadata.name}" />
          <h3>${metadata.name}</h3>
          <p>${metadata.description}</p>
          <p>${ethers.utils.formatUnits(item.pricePerToken, 18)} TATTOO</p>
          <button class="primary-button">🛒 购买</button>
        `;

        // 点击整卡片或按钮跳转详情页
        card.onclick = function () {
          onNFTClick(item.listingId);
        };

        container.appendChild(card);
      } catch (err) {
        console.warn("部分商品加载失败:", err.message || err);
      }
    }
  } catch (err) {
    console.error("❌ 读取本地Listings缓存失败:", err.message || err);
    alert("⚠️ 商品列表加载失败，请稍后再试");
  } finally {
    loading.style.display = "none";
  }
}
