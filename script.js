// ========== 文件: wallet.js ==========
marketplaceAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const MARKETPLACE_ABI = [
  "function redeem(uint256 tokenid)",
  "function pointBalanceOf(address user) view returns (uint256)",
  "function getAllList() view returns (tuple(string uri,uint256 cost,uint256 stock,uint8 status,address creator,uint256 createdAt)[])"
];

// Magic 初始化（记得替换为你自己的 public key）
// const magic = new Magic("pk_live_30B25ED651B53D8B", {
//   network: {
//     rpcUrl: "http://127.0.0.1:8545", // 或主网 https://polygon-rpc.com
//     chainId: 1337                    // 主网为 137
//   }
// });

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

    displayWalletAddress(userAddress);
    await showTatBalance();

  } catch (err) {
    alert("连接失败：" + err.message);
  } finally {
    hideWalletOverlay();
  }
}

async function connectWithMagic() {
  // 从本地恢复上次用过的邮箱


  // Magic 初始化（记得替换为你自己的 public key）
  const magic = new Magic("pk_live_30B25ED651B53D8B", {
    network: {
      rpcUrl: "http://127.0.0.1:8545", // 或主网 https://polygon-rpc.com
      chainId: 1337                    // 主网为 137
    }
  });


  const cachedEmail = localStorage.getItem("magicUserEmail") || "";
  const input = prompt("📧 请输入你的邮箱登录", cachedEmail);
  if (!input) return;

  const email = input.trim().toLowerCase();
  if (!email.includes("@")) {
    alert("请输入合法邮箱地址");
    return;
  }

  showWalletOverlay();

  try {
    const isLoggedIn = await magic.user.isLoggedIn();

    // isLoggedIn = false;

    if (!isLoggedIn) {
      // 首次登录或过期：发验证码
      await magic.auth.loginWithEmailOTP({ email });
    }

    // 登录成功，恢复 signer 和地址
    provider = new ethers.providers.Web3Provider(magic.rpcProvider);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    window.userAddress = userAddress;
    await showTatBalance();

    // 缓存邮箱
    localStorage.setItem("magicUserEmail", email);

    // UI 更新
    displayWalletAddress(userAddress);
  } catch (err) {
    console.error("❌ 登录失败:", err.message || err);
    alert("邮箱登录失败，请重试");
  } finally {
    hideWalletOverlay();
  }
}

async function showTatBalance() {
  try {
    const wineContract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
    const balance = await wineContract.pointBalanceOf(userAddress, { blockTag: "latest" });
    document.getElementById("tatBalance").innerText = `我的葡萄：${ethers.utils.formatUnits(balance, 6)} 🍇`;
    document.getElementById("tatBalance").style.display = "inline";
    document.getElementById("tatBalance").style.cursor = "pointer";
    document.getElementById("tatBalance").title = "点击刷新葡萄余额";
    document.getElementById("tatBalance").onclick = showTatBalance;
  } catch (err) {
    console.error("查询积分失败:", err);
    alert("⚠️ 获取积分失败，请稍后重试");
  }
}

/**
 * 显示用户地址
 */
function displayWalletAddress(address) {
  const addrElem = document.getElementById("walletAddress");
  addrElem.style.display = "inline";
  addrElem.innerText = "地址：" + address;
  addrElem.style.cursor = "pointer";
  addrElem.title = "点击复制钱包地址";

  addrElem.onclick = async function () {
    try {
      await navigator.clipboard.writeText(address);
      alert("✅ 已复制钱包地址到剪贴板");
    } catch (err) {
      console.error("❌ 复制失败:", err);
      alert("❌ 复制失败，请手动复制");
    }
  };

  document.getElementById("connectBtnMagic").style.display = "none";
  document.getElementById("connectBtn").style.display = "none";
}


// ========== 文件: ui.js ==========

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

// ========== 文件: marketplace.js ==========

// ✅ 新版 buy 函数，兼容后端 Worker 和合约 redeem
async function buy(tokenid) {
  if (!signer || !userAddress) {
    alert("⚠️ 请先连接钱包");
    return;
  }

  const isMagic = provider.provider && provider.provider.isMagic;

  if (isMagic) {
    const confirmed = window.confirm("⚠️ 请确认：本次购买将直接提交区块链交易。\n\n请仔细核对商品信息和价格，交易一旦发起将无法撤销。\n\n是否继续？");
    if (!confirmed) return;
  }

  showWalletOverlay();

  try {
    const res = await fetch(`http://127.0.0.1:8787/read?tokenId=${tokenid}`);
    if (!res.ok) throw new Error("商品信息加载失败");
    const item = await res.json();

    const deadline = Math.floor(Date.now() / 1000) + 600; // 10分钟过期

    // 获取 nonce
    const abi = ["function userNonce(address) view returns (uint256)"];
    const readContract = new ethers.Contract(marketplaceAddress, abi, provider);
    const nonce = await readContract.userNonce(userAddress, { blockTag: "latest" });
    console.log("nonce: " + nonce);

    item.uri = `http://127.0.0.1:8787/products/${item.tokenId}`;
    const costRaw = ethers.utils.parseUnits(item.price.toString(), 6); // BigNumber
    console.log(costRaw.toString());

    // 构造哈希并签名
    const hash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "string", "uint256", "uint256", "uint256", "uint256", "address"],
      [userAddress, tokenid, item.uri, 1, costRaw.toString(), deadline, nonce.toString(), marketplaceAddress]
    );
    const bytes = ethers.utils.arrayify(hash);
    const signature = await signer.signMessage(bytes);

    const payload = {
      user: userAddress,
      tokenId: tokenid,
      uri: item.uri,
      amount: 1,
      cost: costRaw.toString(),
      deadline,
      nonce: nonce.toString(),
      signature
    };

    const response = await fetch("http://127.0.0.1:8787/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("❌ 购买失败:", result);
      alert("❌ 购买失败: " + (result.error || "未知错误"));
      return;
    }

    alert("✅ 购买成功！交易哈希：" + result.txHash);
    // ✅ 等待链上确认再查询积分
    await provider.waitForTransaction(result.txHash);

    // ✅ 强制读取最新余额
    await showTatBalance();

    fetch(`http://127.0.0.1:8787/read?tokenId=${tokenid}`, { cache: "reload" });
    await showDetail(tokenid); // 再次调用详情页渲染逻辑
  } catch (err) {
    console.error("❌ 购买出错：", err);
    alert("❌ 购买失败：" + err.message);
  } finally {
    hideWalletOverlay();
  }
}


function resolveImageUrl(url) {
  try {
    // 尝试解析成 URL 对象（支持绝对路径）
    const parsedUrl = new URL(url);

    // 替换主机名和协议为当前页面的
    parsedUrl.protocol = location.protocol;
    parsedUrl.host = location.host;

    return parsedUrl.toString();
  } catch (err) {
    // 如果不是合法的 URL（如 IPFS 格式），再按特殊逻辑处理
    if (url.startsWith("ipfs://")) {
      return url.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    // fallback：相对路径 → 补全为当前域名
    return `${location.origin}/${url.replace(/^\/+/, '')}`;
  }
}

async function renderNFTs() {
  const loading = document.getElementById("nftLoading");
  const container = document.getElementById("nftGrid");

  loading.style.display = "block";
  container.innerHTML = "";

  try {
    const res = await fetch("http://127.0.0.1:8787/list");
    if (!res.ok) throw new Error("请求失败：" + res.statusText);
    const listings = await res.json();

    console.log("📦 从 D1 加载商品列表，共", listings.length, "项");

    for (let i = 0; i < listings.length; i++) {
      const item = listings[i];

      if (item.status !== 1) continue; // ✅ 只显示 status == 1 的商品

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <img src="${resolveImageUrl(item.image)}" alt="${item.name}" />
        <h3>${item.name}</h3>
        <p>${item.description || "暂无描述"}</p>
        <p>价格：${item.price} 🍇</p>
        <p>库存：${item.stock}</p>
        <button class="primary-button">🛒 购买</button>
      `;

      card.onclick = function () {
        onNFTClick(item.tokenId); // ✅ 改为 tokenId 作为唯一标识
      };

      container.appendChild(card);
    }
  } catch (err) {
    console.error("❌ 商品加载失败:", err.message || err);
    alert("⚠️ 无法加载商品数据，请稍后重试");
  } finally {
    loading.style.display = "none";
  }
}

// ========== 文件: detail.js ==========

async function showDetail(tokenId) {
  animateSwitch(["nftListView", "title"], ["nftOverlay"]);

  try {
    const res = await fetch(`http://127.0.0.1:8787/read?tokenId=${tokenId}`);
    if (!res.ok) throw new Error(`读取 tokenId=${tokenId} 失败`);

    const item = await res.json();

    if (item.status !== 1) {
      alert("❌ 该商品未上架或已下架");
      backToList();
      return;
    }

    document.getElementById("nftName").innerText = item.name || "未知名称";
    document.getElementById("nftDescription").innerText = item.description || "暂无描述";
    document.getElementById("nftImage").src = resolveImageUrl(item.image);
    document.getElementById("nftPrice").innerText = `价格：${item.price} 🍇`;

    const created = new Date(item.createdAt * 1000).toLocaleString();

    const attrHtml = (item.attributes || []).map(attr =>
      `<p>${attr.trait_type || attr.key}: ${attr.value}</p>`
    ).join("");

    document.getElementById("nftAttributes").innerHTML = `
      <p>库存：${item.stock}</p>
      <p>上架时间：${created}</p>
      ${attrHtml}
    `;

    document.getElementById("buyButton").setAttribute("data-token-id", tokenId);
  } catch (err) {
    console.error("❌ NFT详情加载失败：", err.message || err);
    backToList();
  }
}

function backToList() {
  history.pushState({}, "", "#");
  animateSwitch(["nftOverlay"], ["title", "nftListView"]);

}

function onNFTClick(tokenid) {
  history.pushState({ tokenid }, "", "#nft/" + tokenid);
  showDetail(tokenid);
}

function handleInitialLoad() {
  const match = location.hash.match(/^#nft\/(\d+)/);
  if (match) {
    showDetail(match[1]);
  } else {
    backToList();
  }
}

function handlePopState() {
  const match = location.hash.match(/^#nft\/(\d+)/);
  if (match) {
    showDetail(match[1]);
  } else {
    backToList();
  }
}

async function buyNFT() {
  const btn = document.getElementById("buyButton");
  const tokenid = btn.getAttribute("data-token-id");
  if (!signer) {
    alert("⚠️ 请先登陆");
    if (!signer) return;
  }

  if (!tokenid) {
    alert("⚠️ 无法读取购买信息！");
    return;
  }

  await buy(parseInt(tokenid));
}

window.addEventListener("DOMContentLoaded", handleInitialLoad);
window.addEventListener("popstate", handlePopState);


// ========== 文件: main.js ==========

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("connectBtnMagic").onclick = connectWithMagic;
renderNFTs(); 
