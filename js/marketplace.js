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

function resolveImageUrl(url) {
  // 如果已经是完整公网地址，直接返回
  // if (url.startsWith("https://cdn.") || url.startsWith("https://ipfs.") || url.includes("github.io")) {
  //   return url;
  // }

  //ipfs
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/"); // 公共IPFS网关
  }  

  // 解析文件名（如：1.jpg）
  const filename = url.split("/").pop();

  // 自动替换为当前页面所在域名下的 jpg 文件夹路径
  return `${location.origin}/jpg/${filename}`;
}


async function renderNFTs() {
  const loading = document.getElementById("nftLoading");
  const container = document.getElementById("nftGrid");

  loading.style.display = "block";
  container.innerHTML = "";

  try {
    // 从 cache/all_metadata.json 加载所有商品信息
    const response = await fetch("cache/all_metadata.json");
    if (!response.ok) throw new Error("无法加载 all_metadata.json");

    const allMetadata = await response.json();
    console.log("🌟 全部商品数据：", allMetadata);

    for (const item of allMetadata) {
      try {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${resolveImageUrl(item.image)}" alt="${item.name}" />
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <p>${ethers.utils.formatUnits(item.pricePerToken, 18)} TATTOO</p>
          <button class="primary-button">🛒 购买</button>
        `;

        card.onclick = function () {
          onNFTClick(item.listingId);
        };

        container.appendChild(card);
      } catch (err) {
        console.warn("部分商品加载失败:", err.message || err);
      }
    }
  } catch (err) {
    console.error("❌ 读取商品数据失败:", err.message || err);
    alert("⚠️ 商品列表加载失败，请稍后再试");
  } finally {
    loading.style.display = "none";
  }
}

