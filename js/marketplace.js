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
    alert("✅ 购买成功！请在MetaMask收藏品中查看");
    await showTatBalance();
  } catch (err) {
    alert("❌ 购买失败：" + err.message);
  } finally {
    hideWalletOverlay();
  }
}

function resolveIPFS(uri) {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/"); // 公共IPFS网关
  }
  return uri; // 如果不是ipfs协议，直接返回
}

async function renderNFTs() {
  const loading = document.getElementById("nftLoading");
  const container = document.getElementById("nftGrid");

  loading.style.display = "block";
  container.innerHTML = "";

  try {
    // 从 cache/listings.json 加载数据
    const response = await fetch("cache/listings.json");
    if (!response.ok) throw new Error("无法加载 Listings 数据");

    const listings = await response.json();
    console.log("🌟 Listings 数据：", listings);  // 打印 listings 数据，确认是否正确加载

    for (const item of listings) {
      console.log("商品状态：", item.status);  // 打印每个商品的 status，确认是否有 status = 1 的商品

      // 这里只渲染 status == 1 的商品
      if (item.status !== 1) continue;

      try {
        // 从 cache/metadata_${listingId}.json 加载商品的详细信息
        const metadataFile = `cache/metadata_${item.listingId}.json`;  // 获取 metadata 文件路径
        console.log("开始获取：cache/metadata_${item.listingId}.json");
        const metadataResponse = await fetch(metadataFile);
        if (!metadataResponse.ok) throw new Error(`无法加载 metadata_${item.listingId}.json`);

        const metadata = await metadataResponse.json();
        console.log("商品详情 metadata：", metadata);  // 打印每个商品的 metadata 数据

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${resolveIPFS(metadata.image)}" alt="${metadata.name}" />
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
    console.error("❌ 读取Listings数据失败:", err.message || err);
    alert("⚠️ 商品列表加载失败，请稍后再试");
  } finally {
    loading.style.display = "none";
  }
}

