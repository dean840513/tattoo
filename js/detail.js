function showDetail(tokenId) {
    document.getElementById("nftListView").style.display = "none";
    document.getElementById("nftDetailView").style.display = "block";
  
    fetch("json/" + tokenId + ".json")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        document.getElementById("nftName").innerText = data.name;
        document.getElementById("nftImage").src = data.image;
        document.getElementById("nftPrice").innerText = "价格：" + data.price + " TAT";
  
        var attrHtml = (data.attributes || []).map(function (attr) {
          return "<p>" + attr.trait_type + ": " + attr.value + "</p>";
        }).join("");
        document.getElementById("nftAttributes").innerHTML = attrHtml;
  
        // 👉 保存 tokenId 和价格，供后续购买使用
        document.getElementById("buyButton").setAttribute("data-token-id", tokenId);
        document.getElementById("buyButton").setAttribute("data-price", data.price);
      });
  }
  
  function backToList() {
    history.pushState({}, "", "#");
    document.getElementById("nftDetailView").style.display = "none";
    document.getElementById("nftListView").style.display = "block";
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
  
  function buyNFT() {
    var tokenId = document.getElementById("buyButton").getAttribute("data-token-id");
    var price = document.getElementById("buyButton").getAttribute("data-price");
  
    if (!signer) {
      alert("请先连接钱包");
      return;
    }
  
    alert("执行购买逻辑: tokenId=" + tokenId + "，价格=" + price + " TAT");
    // 👉 可替换为合约调用逻辑
  }
  
  window.addEventListener("DOMContentLoaded", handleInitialLoad);
  window.addEventListener("popstate", handlePopState);
  