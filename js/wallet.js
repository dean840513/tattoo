// 判断环境
const hostname = window.location.hostname;
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');

if (isLocal) {
  console.log('🌟 本地环境');
  // Anvil
  const marketplaceAddress = "0xBc65508443bE8008Cf5af3973CCeF97F1Ea8888d";
  const tatTokenAddress = "0xE41c36a93D60cD01CE8D17EB93CD4579ac6288D0";
} else if (hostname.includes('github.io')) {
  console.log('🚀 GitHub Pages环境');
  //Polygon
  const marketplaceAddress = "0x82aC52E1138344486C61C85697E8814a10060b23";
  const tatTokenAddress = "0xEd3D92C6023516F33E8CEF41C7a583E4Ba5F23ce";
} else {
  console.log('🔍 其他环境（比如正式自定义域名部署）');
}

window.marketplaceAddress = marketplaceAddress;
window.tatTokenAddress = tatTokenAddress;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address owner) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const MARKETPLACE_ABI = [
  "function buyFromListing(uint256, address, uint256, address, uint256)"
];

window.MARKETPLACE_ABI = MARKETPLACE_ABI;

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
    window.userAddress = userAddress;

    document.getElementById("connectBtn").style.display = "none";
    document.getElementById("walletAddress").style.display = "inline";
    document.getElementById("walletAddress").innerText =
      "地址：" + userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
    
    await updateDetailButtons();
    await checkApproval();
  } catch (err) {
    alert("连接失败：" + err.message);
  } finally {
    hideWalletOverlay();
  }
}

async function showTatBalance() {
  try {
    const tat = new ethers.Contract(tatTokenAddress, ERC20_ABI, provider);
    const rawBalance = await tat.balanceOf(userAddress);
    const decimals = await tat.decimals();
    const balance = ethers.utils.formatUnits(rawBalance, decimals);
    document.getElementById("tatBalance").innerText = `余额：${parseFloat(balance).toFixed(4)} TATTOO`;
    document.getElementById("tatBalance").style.display = "inline";
  } catch (err) {
    console.error("查询余额失败:", err);
    alert("⚠️ 获取余额失败，请稍后重试");
  }
}

async function checkApproval() {
  const tat = new ethers.Contract(tatTokenAddress, ERC20_ABI, provider);
  const authChecking = document.getElementById("authChecking");
  const approveBtn = document.getElementById("approveBtn");
  const tatBalance = document.getElementById("tatBalance");

  authChecking.style.display = "inline";
  approveBtn.style.display = "none";
  tatBalance.style.display = "none";

  try {
    const allowance = await tat.allowance(userAddress, marketplaceAddress);
    const required = ethers.utils.parseUnits("1", 18);

    if (allowance.gte(required)) {
      approveBtn.style.display = "none";
      await showTatBalance();
    } else {
      approveBtn.style.display = "inline-block";
      tatBalance.style.display = "none";
    }
  } catch (err) {
    // console.error("授权检查失败:", err);
    alert("⚠️ 无法获取授权状态，请刷新页面重试" + err);
  } finally {
    authChecking.style.display = "none";
  }
}

async function approveTat() {
  const tat = new ethers.Contract(tatTokenAddress, ERC20_ABI, signer);
  const max = ethers.constants.MaxUint256;

  showWalletOverlay();

  const overlayBox = document.querySelector("#walletOverlay > div");
  if (overlayBox && !document.getElementById("walletWarning")) {
    const warning = document.createElement("p");
    warning.id = "walletWarning";
    warning.innerHTML = `
      ⚠️ MetaMask 可能会弹出风险提示，这是常规的代币授权操作。<br>
      本平台不会主动扣除你的任何资产，所有交易均需你手动确认。
    `;
    warning.style.marginTop = "0.8rem";
    warning.style.color = "#888";
    warning.style.fontSize = "0.9rem";
    warning.style.textAlign = "left";
    overlayBox.appendChild(warning);
  } 

  try {
    const tx = await tat.approve(marketplaceAddress, max);
    await tx.wait();
    alert("✅ 授权成功！");
    await updateDetailButtons();
    await checkApproval();    
  } catch (err) {
    alert("❌ 授权失败：" + err.message);
  } finally {
    hideWalletOverlay();
  }
}
