async function showDetail(listingId) {
  document.getElementById("nftOverlay").style.display = "flex";

  try {
    // 从 /cache/listings.json 加载所有商品
    const listingsResponse = await fetch("cache/listings.json");
    if (!listingsResponse.ok) throw new Error("无法加载 Listings 数据");
    const listings = await listingsResponse.json();

    // 获取对应的商品（通过 listingId）
    const item = listings.find(x => x.listingId == listingId);
    if (!item) throw new Error(`未找到 listingId=${listingId} 的商品`);

    // const tokenId = item.tokenId; // 获取 tokenId
    const price = ethers.utils.formatUnits(item.pricePerToken, 18); // 格式化价格

    // 根据 listingId 获取对应的 metadata 文件（metadata_${listingId}.json）
    const metadataFile = `cache/metadata_${listingId}.json`; // 假设文件放在 /cache/ 目录
    const response = await fetch(metadataFile);
    if (!response.ok) throw new Error(`无法加载 metadata 文件 ${metadataFile}`);

    const metadata = await response.json();

    // 更新页面上的商品信息
    document.getElementById("nftName").innerText = metadata.name;
    document.getElementById("nftDescription").innerText = metadata.description;
    document.getElementById("nftImage").src = resolveIPFS(metadata.image);
    document.getElementById("nftPrice").innerText = "价格：" + price + " TATTOO";

    // 设置购买按钮的相关属性
    document.getElementById("buyButton").setAttribute("data-listing-id", listingId);
    document.getElementById("buyButton").setAttribute("data-price", price);

    // 渲染属性
    const attrHtml = (metadata.attributes || []).map(attr =>
      `<p>${attr.trait_type}: ${attr.value}</p>`
    ).join("");
    document.getElementById("nftAttributes").innerHTML = attrHtml;

    document.getElementById("nftDetailView").classList.add("active");
    await updateDetailButtons();
  } catch (err) {
    console.error("❌ NFT详情加载失败：", err.message || err);
    backToList();
  }
}





function backToList() {
  history.pushState({}, "", "#");
  document.getElementById("nftDetailView").classList.remove("active");
  setTimeout(() => {
    document.getElementById("nftOverlay").style.display = "none";
  }, 250);
}

function onNFTClick(listingId) {
  history.pushState({ listingId: listingId }, "", "#nft/" + listingId);
  showDetail(listingId);
}

function handleInitialLoad() {
  var match = location.hash.match(/^#nft\/(\d+)/);
  if (match) {
    showDetail(match[1]);
  }
}

function handlePopState() {
  var match = location.hash.match(/^#nft\/(\d+)/);
  if (match) {
    showDetail(match[1]);
  } else {
    backToList();
  }
}

async function buyNFT() {
  var listingId = document.getElementById("buyButton").getAttribute("data-listing-id");
  var price = document.getElementById("buyButton").getAttribute("data-price");

  if (!signer) {
    await connectWallet();

    if (!signer) {
      return;
    }
  }

  if (!listingId || !price) {
    alert("⚠️ 无法读取购买信息！");
    return;
  }

  await buy(parseInt(listingId), price);
}



window.addEventListener("DOMContentLoaded", handleInitialLoad);
window.addEventListener("popstate", handlePopState);
document.getElementById("nftOverlay").addEventListener("click", function (e) {
  // 判断是否点击的正是遮罩本身，而不是 modal 内容
  if (e.target.id === "nftOverlay") {
    backToList(); // ✅ 关闭浮窗
  }
});
