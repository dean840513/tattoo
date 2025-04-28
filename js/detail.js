async function showDetail(listingId) {
  document.getElementById("nftOverlay").style.display = "flex";

  try {
    // 从 /cache/all_metadata.json 加载所有商品
    const response = await fetch("cache/all_metadata.json");
    if (!response.ok) throw new Error("无法加载 all_metadata.json");
    const allMetadata = await response.json();

    // 获取对应 listingId 的商品
    const item = allMetadata.find(x => x.listingId == listingId);
    if (!item) throw new Error(`未找到 listingId=${listingId} 的商品`);

    const price = ethers.utils.formatUnits(item.pricePerToken, 18); // 格式化价格

    // 更新页面上的商品信息
    document.getElementById("nftName").innerText = item.name;
    document.getElementById("nftDescription").innerText = item.description;
    document.getElementById("nftImage").src = resolveIPFS(item.image);
    document.getElementById("nftPrice").innerText = "价格：" + price + " TATTOO";

    document.getElementById("buyButton").setAttribute("data-listing-id", listingId);
    document.getElementById("buyButton").setAttribute("data-price", price);

    const attrHtml = (item.attributes || []).map(attr =>
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
