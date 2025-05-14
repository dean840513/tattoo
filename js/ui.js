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

function animateSwitch(hideIds = [], showIds = []) {
  // 将要隐藏的元素处理为淡出动画
  hideIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("active");
    el.classList.add("fade-out");
  });

  // 延迟与动画时间一致，再切换显示状态
  setTimeout(() => {
    hideIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = "none";
      el.classList.remove("fade-out");
    });

    showIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = "block";
      el.classList.add("view-container", "active");
    });
  }, 250); // 动画持续时间（ms），和 CSS 对应
}

