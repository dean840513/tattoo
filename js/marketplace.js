async function buy(listingId, price) {
  const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
  const totalPrice = ethers.utils.parseUnits(price, 18);

  showWalletOverlay();

  try {
    const tx = await marketplace.buyFromListing(
      listingId,
      userAddress,
      1,
      tatTokenAddress,
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
  try {
    const response = await fetch("json/listings.json");
    if (!response.ok) throw new Error("无法加载主商品列表");
    const listings = await response.json();

    const container = document.getElementById("nftGrid");
    container.innerHTML = "";

    for (const item of listings) {
      if (!item.listed) continue;

      try {
        const metaResponse = await fetch(item.metadata_url);
        if (!metaResponse.ok) throw new Error(`无法加载 metadata: ${item.metadata_url}`);
        const metadata = await metaResponse.json();

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${metadata.image}" alt="${metadata.name}" />
          <h3>${metadata.name}</h3>
          <p>${metadata.description}</p>
          <p>${item.price} TATTOO</p>
          <button onclick="buy(${item.tokenId}, '${item.price}')">立即购买</button>
        `;
        container.appendChild(card);
      } catch (err) {
        console.warn("部分商品加载失败:", err);
      }
    }
  } catch (err) {
    console.error("❌ 加载 listings.json 失败:", err);
    alert("⚠️ 商品列表加载失败，请稍后再试");
  }
}