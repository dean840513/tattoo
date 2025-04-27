async function showDetail(listingId) {
  document.getElementById("nftOverlay").style.display = "flex";

  try {
    const cachedListingsRaw = localStorage.getItem("nft_listings_cache");
    if (!cachedListingsRaw) throw new Error("没有找到本地Listings缓存");

    const listings = JSON.parse(cachedListingsRaw);

    const item = listings.find(x => x.listingId == listingId);
    if (!item) throw new Error("未找到 listingId=" + listingId + " 的上架记录");

    const tokenId = item.tokenId; // 取出真正的tokenId
    const price = ethers.utils.formatUnits(item.pricePerToken, 18);

    const metadataRaw = localStorage.getItem(`nft_metadata_cache_${listingId}`);
    if (!metadataRaw) throw new Error(`没有找到 listingId=${listingId} 的Metadata缓存`);

    const metadataObj = JSON.parse(metadataRaw);
    const metadata = metadataObj.metadata || metadataObj;

    // 后面显示内容就和原来一样了...
    document.getElementById("nftName").innerText = metadata.name;
    document.getElementById("nftDescription").innerText = metadata.description;
    document.getElementById("nftImage").src = metadata.image;
    document.getElementById("nftPrice").innerText = "价格：" + price + " TATTOO";

    document.getElementById("buyButton").setAttribute("data-listing-id", listingId);
    document.getElementById("buyButton").setAttribute("data-price", price);

    const attrHtml = (metadata.attributes || []).map(attr =>
      `<p>${attr.trait_type}: ${attr.value}</p>`
    ).join("");
    document.getElementById("nftAttributes").innerHTML = attrHtml;

    document.getElementById("nftDetailView").classList.add("active");
    await updateDetailButtons();
  } catch (err) {
    console.error("❌ NFT详情加载失败：", err.message || err);
    // alert("❌ 加载失败：" + err.message);
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
