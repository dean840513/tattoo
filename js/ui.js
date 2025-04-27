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

async function updateDetailButtons() {
  const connectBtn = document.getElementById("connectWalletBtn");
  const approveBtn = document.getElementById("approveBtnDetail");
  const buyBtn = document.getElementById("buyButton");

  // ❗确保三者全部先隐藏
  connectBtn.style.display = "none";
  approveBtn.style.display = "none";
  buyBtn.style.display = "none";

  // 1. 钱包未连接
  if (!window.userAddress || !signer) {
    connectBtn.style.display = "inline-block";
    return;
  }

  // 2. 钱包连接但未授权
  const tatContract = new ethers.Contract(window.tatTokenAddress, ERC20_ABI, signer);
  const allowance = await tatContract.allowance(window.userAddress, window.marketplaceAddress);  
  if (allowance.lt(ethers.utils.parseUnits("1", 18))) {
    approveBtn.style.display = "inline-block";
    return;
  }

  // 3. 已授权，显示购买按钮
  buyBtn.style.display = "inline-block";

  console.log("updateDetailButtons");
}