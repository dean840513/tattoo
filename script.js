function showWalletOverlay() {
  document.getElementById("walletOverlay").style.display = "flex";
}

function hideWalletOverlay() {
  document.getElementById("walletOverlay").style.display = "none";
}


function closeMobileAlert() {
  document.getElementById("mobileAlert").style.display = "none";
}


function copyLink() {
  const input = document.getElementById("siteLink");
  input.select();
  input.setSelectionRange(0, 99999);
  document.execCommand("copy");
  alert("✅ 链接已复制，请前往 MetaMask App 打开浏览器粘贴访问！");
}

const marketplaceAddress = "0x82aC52E1138344486C61C85697E8814a10060b23";
const tatTokenAddress = "0xEd3D92C6023516F33E8CEF41C7a583E4Ba5F23ce";

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

function connectWallet() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
	document.getElementById("mobileAlert").style.display = "block";
	document.getElementById("siteLink").value = window.location.href;
	return;
  }

  if (!window.ethereum || !window.ethereum.isMetaMask) {
	alert("请先安装 MetaMask 插件！");
	return;
  }

  showWalletOverlay();

  window.ethereum.request({ method: "eth_requestAccounts" })
	.then(function () {
	  provider = new ethers.providers.Web3Provider(window.ethereum);
	  signer = provider.getSigner();

	  return signer.getAddress();
	})
	.then(function (address) {
	  userAddress = address;
	  document.getElementById("connectBtn").style.display = "none";
	  document.getElementById("walletAddress").style.display = "inline";
	  document.getElementById("walletAddress").innerText =
		"地址：" + userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
	  return checkApproval();
	})
	.catch(function (err) {
	  alert("连接失败：" + err.message);
	})
	.finally(function () {
	  hideWalletOverlay();
	});
}


async function showTatBalance() {
  const tat = new ethers.Contract(tatTokenAddress, ERC20_ABI, provider);
  const rawBalance = await tat.balanceOf(userAddress);
  const decimals = await tat.decimals();
  const balance = ethers.utils.formatUnits(rawBalance, decimals);
  document.getElementById("tatBalance").innerText = `余额：${parseFloat(balance).toFixed(4)} TATTOO`;
  document.getElementById("tatBalance").style.display = "inline";
}

async function checkApproval() {
  const tat = new ethers.Contract(tatTokenAddress, ERC20_ABI, provider);
  const authChecking = document.getElementById("authChecking");
  const approveBtn = document.getElementById("approveBtn");
  const tatBalance = document.getElementById("tatBalance");

  // 👇 正在检查
  authChecking.style.display = "inline";
  approveBtn.style.display = "none";
  tatBalance.style.display = "none";

  const allowance = await tat.allowance(userAddress, marketplaceAddress);
  const required = ethers.utils.parseUnits("1", 18);

  // 👇 检查结束
  authChecking.style.display = "none";

  if (allowance.gte(required)) {
	approveBtn.style.display = "none";
	await showTatBalance();
  } else {
	approveBtn.style.display = "inline-block";
	tatBalance.style.display = "none";
  }
}

async function approveTat() {
const tat = new ethers.Contract(tatTokenAddress, ERC20_ABI, signer);
const max = ethers.constants.MaxUint256;

showWalletOverlay();

tat.approve(marketplaceAddress, max)
.then(function (tx) {
  return tx.wait();
})
.then(function () {
  alert("✅ 授权成功！");
  return checkApproval();
})
.catch(function (err) {
  alert("❌ 授权失败：" + err.message);
})
.finally(function () {
  hideWalletOverlay();
});
}

async function buy(listingId, price) {
const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
const totalPrice = ethers.utils.parseUnits(price, 18);

showWalletOverlay();

marketplace.buyFromListing(
listingId,
userAddress,
1,
tatTokenAddress,
totalPrice
)
.then(function (tx) {
  return tx.wait();
})
.then(function () {
  alert("✅ 购买成功！");
  return showTatBalance();
})
.catch(function (err) {
  alert("❌ 购买失败：" + err.message);
})
.finally(function () {
  hideWalletOverlay();
});
}


document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("approveBtn").onclick = approveTat;
renderNFTs();
function renderNFTs() {
fetch('listings.json')
.then(function (response) {
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
});
}
