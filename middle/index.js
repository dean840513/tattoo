require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const express = require('express');
const cors = require('cors'); // ✅ 导入 cors 包
const app = express();

app.use(cors()); // ✅ 允许所有来源访问，开发用即可

app.use(express.json());

app.post('/redeem', async (req, res) => {
  try {
    const { user, uri, cost, deadline, nonce, signature } = req.body;

    // 验证 URI
    if (!uri.startsWith(process.env.TRUSTED_URI_PREFIX)) {
      return res.status(400).send("非法 URI");
    }

    const uriRes = await axios.get(uri);
    if (uriRes.status !== 200) {
      return res.status(400).send("URI 不存在");
    }

    // 验证签名
    const hash = ethers.solidityPackedKeccak256(
      ["address", "string", "uint256", "uint256", "uint256", "address"],
      [user, uri, cost, deadline, nonce, process.env.CONTRACT_ADDRESS]
    );
    const ethHash = ethers.keccak256(
      ethers.concat([
        ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
        ethers.getBytes(hash)
      ])
    );
    const signer = ethers.recoverAddress(ethHash, signature);
    if (signer.toLowerCase() !== user.toLowerCase()) {
      return res.status(400).send("签名无效");
    }

    // 链上验证
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const abi = [
      "function userNonce(address) view returns (uint256)",
      "function pointBalanceOf(address) view returns (uint256)",
      "function redeem(address,string,uint256,uint256,uint256,bytes) external"
    ];
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);
    const chainNonce = await contract.userNonce(user);
    if (Number(chainNonce) !== nonce) {
      return res.status(400).send("Nonce 不匹配");
    }

    const balance = await contract.pointBalanceOf(user);
    if (balance < cost) {
      return res.status(400).send("余额不足");
    }

    // ✅ 所有验证通过，返回验证成功信息
    // return res.json({
    // success: true,
    // verified: true,
    // message: "✅ 签名验证成功，可继续调用合约",
    // user,
    // uri,
    // cost,
    // deadline,
    // nonce
    // });


    // 调用合约（可选）
    try {
      const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
      const withSigner = contract.connect(wallet);

      const tx = await withSigner.redeem(user, uri, cost, deadline, nonce, signature);
      console.log("📤 交易已广播，Hash:", tx.hash);

      const receipt = await tx.wait();
      console.log("✅ 交易确认成功, 区块号:", receipt.blockNumber);

      res.json({
        success: true,
        message: "NFT 已成功铸造，积分已扣除",
        txHash: tx.hash, // ✅ 从 tx 中取交易哈希
        gasUsed: receipt.gasUsed.toString()
      });
    } catch (err) {
      console.error("❌ 合约调用失败:", err.message || err);
      res.status(500).json({
        success: false,
        message: "合约执行失败",
        error: err.message || String(err)
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || "Internal Error");
  }
});

app.listen(3000, () => console.log("🚀 服务运行在 http://localhost:3000/redeem"));
