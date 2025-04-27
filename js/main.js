document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("approveBtn").onclick = approveTat;

async function initializeApp() {
  try {
    console.log("🚀 正在初始化数据...");
    await loadAllNFTMetadata();   // 第一步：准备数据
    console.log("✅ 数据准备完毕，开始渲染NFT页面");
    await renderNFTs();            // 第二步：根据缓存数据渲染页面
  } catch (err) {
    console.error("❌ 初始化失败:", err.message || err);
    alert("⚠️ 页面初始化失败，请稍后再试");
  }
}

// 页面加载完成后执行初始化
window.addEventListener("load", initializeApp);
