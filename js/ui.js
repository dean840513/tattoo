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
    }