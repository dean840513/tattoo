async function showDetail(tokenId) {
  document.getElementById("nftOverlay").style.display = "flex";
  try {
    // 加载 metadata
    const metaRes = await fetch("json/" + tokenId + ".json");
    if (!metaRes.ok) throw new Error("无法加载 NFT Metadata 文件：" + metaRes.status);
    const metadata = await metaRes.json();

    document.getElementById("nftName").innerText = metadata.name;
    document.getElementById("nftDescription").innerText = metadata.description;
    document.getElementById("nftImage").src = metadata.image;

    // 加载 listings
    const listRes = await fetch("json/listings.json");
    if (!listRes.ok) throw new Error("无法加载 listings.json 文件：" + listRes.status);
    const listings = await listRes.json();

    const item = listings.find(x => x.tokenId == tokenId && x.listed);
    if (!item) throw new Error("未找到 tokenId=" + tokenId + " 的上架记录");

    const price = item.price;
    document.getElementById("nftPrice").innerText = "价格：" + price + " TATTOO";

    document.getElementById("buyButton").setAttribute("data-token-id", tokenId);
    document.getElementById("buyButton").setAttribute("data-price", price);

    const attrHtml = (metadata.attributes || []).map(attr =>
      `<p>${attr.trait_type}: ${attr.value}</p>`
    ).join("");
    document.getElementById("nftAttributes").innerHTML = attrHtml;
    // ✅ 添加动画 class，让 modal 淡入 + 放大
    document.getElementById("nftDetailView").classList.add("active");
  } catch (err) {
    console.error("❌ NFT 详情加载失败：", err);
    alert("❌ 加载失败：" + err.message); // ✅ 直接弹窗给用户
    backToList(); // 可选：返回列表页
  }
}


function backToList() {
  history.pushState({}, "", "#");
  document.getElementById("nftDetailView").classList.remove("active");
  setTimeout(() => {
    document.getElementById("nftOverlay").style.display = "none";
  }, 250);
}

function onNFTClick(tokenId) {
  history.pushState({ tokenId: tokenId }, "", "#nft/" + tokenId);
  showDetail(tokenId);
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
  var tokenId = document.getElementById("buyButton").getAttribute("data-token-id");
  var price = document.getElementById("buyButton").getAttribute("data-price");

  if (!signer) {
    await connectWallet(); // ✅ 等待连接完成

    if (!signer) {
      // alert("⚠️ 钱包连接失败，无法继续购买");
      return;
    }
  }

  const listingId = parseInt(tokenId); // ✅ 如果你 listingId == tokenId，可直接用

  await buy(listingId, price); // ✅ 调用你写好的 buy() 函数
}


window.addEventListener("DOMContentLoaded", handleInitialLoad);
window.addEventListener("popstate", handlePopState);
document.getElementById("nftOverlay").addEventListener("click", function (e) {
  // 判断是否点击的正是遮罩本身，而不是 modal 内容
  if (e.target.id === "nftOverlay") {
    backToList(); // ✅ 关闭浮窗
  }
});
