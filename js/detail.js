async function showDetail(listingId) {
  // document.getElementById("nftListView").style.display = "none";
  // document.getElementById("title").style.display = "none";
  // document.getElementById("nftOverlay").style.display = "block";

  animateSwitch(["nftListView", "title"], ["nftOverlay"]);


  try {
    const response = await fetch("cache/all_metadata.json");
    if (!response.ok) throw new Error("无法加载 all_metadata.json");
    const allMetadata = await response.json();

    const item = allMetadata.find(x => x.listingId == listingId);
    if (!item) throw new Error(`未找到 listingId=${listingId} 的商品`);

    const price = ethers.utils.formatUnits(item.pricePerToken, 18);

    document.getElementById("nftName").innerText = item.name;
    document.getElementById("nftDescription").innerText = item.description;
    document.getElementById("nftImage").src = resolveImageUrl(item.image);
    document.getElementById("nftPrice").innerText = "价格：" + price + " TATTOO";

    document.getElementById("buyButton").setAttribute("data-listing-id", listingId);
    document.getElementById("buyButton").setAttribute("data-price", price);

    const attrHtml = (item.attributes || []).map(attr =>
      `<p>${attr.trait_type}: ${attr.value}</p>`
    ).join("");
    document.getElementById("nftAttributes").innerHTML = attrHtml;

  } catch (err) {
    console.error("❌ NFT详情加载失败：", err.message || err);
    backToList();
  }
}

function backToList() {
  history.pushState({}, "", "#");
  animateSwitch(["nftOverlay"], ["title", "nftListView"]);

}

function onNFTClick(listingId) {
  history.pushState({ listingId }, "", "#nft/" + listingId);
  showDetail(listingId);
}

function handleInitialLoad() {
  const match = location.hash.match(/^#nft\/(\d+)/);
  if (match) {
    showDetail(match[1]);
  } else {
    backToList();
  }
}

function handlePopState() {
  const match = location.hash.match(/^#nft\/(\d+)/);
  if (match) {
    showDetail(match[1]);
  } else {
    backToList();
  }
}

async function buyNFT() {
  const btn = document.getElementById("buyButton");
  const listingId = btn.getAttribute("data-listing-id");
  const price = btn.getAttribute("data-price");

  if (!signer) {
    alert("⚠️ 请先登陆");
    if (!signer) return;
  }

  if (!listingId || !price) {
    alert("⚠️ 无法读取购买信息！");
    return;
  }

  await buy(parseInt(listingId), price);
}

window.addEventListener("DOMContentLoaded", handleInitialLoad);
window.addEventListener("popstate", handlePopState);
