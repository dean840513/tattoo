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
    const response = await fetch('listings.json');
    if (!response.ok) throw new Error("Network response was not ok");
    const listings = await response.json();

    const container = document.getElementById("nftGrid");
    container.innerHTML = "";
    listings.forEach(function (nft) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${nft.image}" alt="${nft.name}" />
        <h3>${nft.name}</h3>
        <p>${nft.price} TATTOO</p>
        <button onclick="buy(${nft.id}, '${nft.price}')">立即购买</button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("读取 listings.json 失败：", err);
    alert("⚠️ 加载商品列表失败，请稍后再试");
  }
}