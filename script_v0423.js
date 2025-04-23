function showWalletOverlay() {
  document.getElementById("walletOverlay").style.display = "flex";
}

function hideWalletOverlay() {
  document.getElementById("walletOverlay").style.display = "none";
  const warning = document.getElementById("walletWarning");
  if (warning) warning.remove();
}


function closeMobileAlert() {
  document.getElementById("mobileAlert").style.display = "none";
}


function copyLink() {
  try {
    const input = document.getElementById("siteLink");
    input.select();
    input.setSelectionRange(0, 99999);
    document.execCommand("copy");
    alert("✅ 链接已复制，请前往 MetaMask App 打开浏览器粘贴访问！");
    window.location.href = "https://metamask.app.link/";
  } catch (err) {
    console.error("复制链接失败:", err);
    alert("❌ 复制失败，请手动复制链接");
  }
}

const marketplaceAddress = "0x82aC52E1138344486C61C85697E8814a10060b23";
const tatTokenAddress = "0xEd3D92C6023516F33E8CEF41C7a583E4Ba5F23ce";
// const tatTokenAddress = "0x60306F8038EC0108Cb9DBbb6dE945aC94B2f8ABF";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address owner) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const MARKETPLACE_ABI = [
  "function buyFromListing(uint256, address, uint256, address, uint256)"
];

let provider, signer, userAddress;

async function connectWallet() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!window.ethereum || !window.ethereum.isMetaMask) {
    if (isMobile) {
      document.getElementById("mobileAlert").style.display = "block";
      document.getElementById("siteLink").value = window.location.href;
      return;
    } else {
      alert("请先安装 MetaMask 插件！");
      window.location.href = "https://metamask.app.link/";
      return;
    }
  }

  showWalletOverlay();

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    
    document.getElementById("connectBtn").style.display = "none";
    document.getElementById("walletAddress").style.display = "inline";
    document.getElementById("walletAddress").innerText =
      "地址：" + userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

    await checkApproval();
  } catch (err) {
    alert("连接失败：" + err.message);
  } finally {
    hideWalletOverlay();
  }
}

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("approveBtn").onclick = approveTat;
renderNFTs();
function renderNFTs() {
  fetch('listings.json')
    .then(function (response) {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then(function (listings) {
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
    })
    .catch(function (err) {
      console.error("读取 listings.json 失败：", err);
      alert("⚠️ 加载商品列表失败，请稍后再试");
    });
})
.then(function (listings) {
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
})
.catch(function (err) {
  console.error("读取 listings.json 失败：", err);
});
}
