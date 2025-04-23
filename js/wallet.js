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