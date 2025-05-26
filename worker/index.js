import { ethers, parseUnits } from 'ethers';

//===============================  环境变量设置（推荐使用 Secrets 机制）=================================================================
const RPC_URL = 'http://127.0.0.1:8545'; // 或其他网络
const CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const ABI = [ // 精简 ABI 只保留 redeem 函数
  "function redeem(address user, uint256 tokenId, string uri, uint256 amount, uint256 cost, uint256 deadline, uint256 nonce, bytes signature)"
];
//===============================  event相关变量=============================================================================================
const TRANSFER_SINGLE_TOPIC = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'; // ERC1155 TransferSingle
const TRANSFER_BATCH_TOPIC = '0x4a39dc06d4c0dbc64b70b2970c0a8d4e67c4baf9c1f6c3c4917d0be1b2b3c0e2';
const DEPLOY_BLOCK = 0; // 修改为你的合约部署区块高度

//===============================  主函数 =====================================================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    const isDev = env.ENVIRONMENT === "dev";
    const allowOrigin = isDev ? "*" : "https://your-production-domain.com";

    function withCors(body, status = 200, contentType = "application/json", maxAge = 0) {
      return new Response(body, {
        status,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Cache-Control": `public, max-age=${maxAge}`,
          "Content-Type": `${contentType}; charset=utf-8`
        }
      });
    }


    if (method === "OPTIONS") return withCors(null, 204);

    // =============================== ✅ 写入商品（POST /write）=======================================================================
    if (url.pathname === "/write" && method === "POST") {
      let data;
      try {
        data = await request.json();
      } catch {
        return withCors("❌ 无效的 JSON 数据", 400, "text/plain");
      }

      if (!data.name) {
        return withCors("❌ 缺少 name 字段", 400, "text/plain");
      }

      // 检查是否已有相同 name
      const nameExists = await env.DB.prepare("SELECT 1 FROM products WHERE name = ?")
        .bind(data.name)
        .first();

      if (nameExists) {
        return withCors(`❌ 商品名称已存在：${data.name}`, 409, "text/plain");
      }

      // ======================================== 插入 ==============================================================================
      const insert = await env.DB.prepare(`
        INSERT INTO products (name, description, image, price, stock, attributes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        data.name,
        data.description || "",
        data.image || "",
        data.price || 0,
        data.stock || 0,
        JSON.stringify(data.attributes || [])
      ).run();

      return withCors(`✅ 新增商品成功，tokenId = ${insert.meta.last_row_id}`, 200, "text/plain");
    }

    // ============================ ✅ 读取商品（GET /read?tokenId=xxx） ==============================================================================
    if (url.pathname === "/read" && method === "GET") {
      const tokenId = url.searchParams.get("tokenId");
      if (!tokenId) return withCors("❌ 缺少 tokenId 参数", 400, "text/plain");

      const row = await env.DB.prepare("SELECT * FROM products WHERE tokenId = ?")
        .bind(tokenId)
        .first();

      if (!row) {
        return withCors(`❌ 未找到 tokenId=${tokenId}`, 404, "text/plain");
      }

      row.attributes = JSON.parse(row.attributes || "[]");
      console.log("读取" + tokenId);
      return withCors(JSON.stringify(row, null, 2), 200, "application/json", 30);
    }

    // ===============================✅ 更新商品（POST /update?tokenId=xxx）==============================================================================
    if (url.pathname === "/update" && method === "POST") {
      const tokenId = url.searchParams.get("tokenId");
      if (!tokenId) return withCors("❌ 缺少 tokenId 参数", 400, "text/plain");

      let data;
      try {
        data = await request.json();
      } catch {
        return withCors("❌ 无效 JSON 数据", 400, "text/plain");
      }

      // 先查是否存在
      const existing = await env.DB.prepare("SELECT * FROM products WHERE tokenId = ?")
        .bind(tokenId)
        .first();

      if (!existing) {
        return withCors(`❌ tokenId=${tokenId} 不存在`, 404, "text/plain");
      }

      // 判断 name 是否重复（换了重复名）
      if (data.name && data.name !== existing.name) {
        const nameConflict = await env.DB.prepare("SELECT 1 FROM products WHERE name = ?")
          .bind(data.name)
          .first();

        if (nameConflict) {
          return withCors(`❌ 商品名称已存在：${data.name}`, 409, "text/plain");
        }
      }

      // 构建动态 UPDATE 语句
      const fields = [];
      const values = [];

      if (data.name) {
        fields.push("name = ?");
        values.push(data.name);
      }
      if (data.description !== undefined) {
        fields.push("description = ?");
        values.push(data.description);
      }
      if (data.image !== undefined) {
        fields.push("image = ?");
        values.push(data.image);
      }
      if (data.price !== undefined) {
        fields.push("price = ?");
        values.push(data.price);
      }
      if (data.stock !== undefined) {
        fields.push("stock = ?");
        values.push(data.stock);
      }
      if (data.attributes !== undefined) {
        fields.push("attributes = ?");
        values.push(JSON.stringify(data.attributes));
      }

      if (fields.length === 0) {
        return withCors("❌ 没有需要更新的字段", 400, "text/plain");
      }

      values.push(tokenId); // tokenId 为 WHERE 参数

      const sql = `UPDATE products SET ${fields.join(", ")} WHERE tokenId = ?`;
      await env.DB.prepare(sql).bind(...values).run();

      return withCors(`✅ 已更新 tokenId=${tokenId}`);
    }

    // =========================✅ 商品列表（GET /list） ==============================================================================
    if (url.pathname === "/list" && method === "GET") {
      const rows = await env.DB
        .prepare("SELECT * FROM products WHERE status = 1 ORDER BY createdAt DESC")
        .all();

      const result = rows.results.map(r => ({
        ...r,
        attributes: JSON.parse(r.attributes || "[]")
      }));

      return withCors(JSON.stringify(result, null, 2), 200, "application/json", 300);
    }


    // =========================✅ 购买逻辑（BUY /buy） ==============================================================================
    if (url.pathname === "/buy" && method === "POST") {
      try {
        const body = await request.json();
        const {
          user,         // 用户地址
          tokenId,      // 商品 ID
          uri,          // NFT URI
          amount,       // 数量
          cost,         // 所需积分
          deadline,     // 签名截止时间
          nonce,        // 用户 nonce
          signature     // 用户签名
        } = body;

        // ========== 安全校验商品 ==========
        const row = await env.DB.prepare("SELECT * FROM products WHERE tokenId = ?")
          .bind(tokenId)
          .first();

        if (!row) {
          return withCors(JSON.stringify({ success: false, error: "商品不存在" }), 404);
        }

        if (row.status !== 1) {
          return withCors(JSON.stringify({ success: false, error: "商品未上架或已下架" }), 400);
        }

        if (parseInt(row.stock) < amount) {
          return withCors(JSON.stringify({ success: false, error: "库存不足" }), 400);
        }

        // Worker 比对最小单位
        const expectedCost = parseUnits(row.price.toString(), 6).toString(); // BigNumber → string

        if (parseInt(expectedCost) !== parseInt(cost)) {
          return withCors(JSON.stringify({ success: false, error: "价格信息不匹配" }), 400);
        }

        const expectedUri = `http://127.0.0.1:8787/products/${tokenId}`;
        if (uri !== expectedUri) {
          return withCors(JSON.stringify({ success: false, error: "URI 不一致" }), 400);
        }

        // ========== 发起合约交易 ==========
        const PRIVATE_KEY = env.PRIVATE_KEY;
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        const tx = await contract.redeem(
          user,
          tokenId,
          uri,
          amount,
          cost,
          deadline,
          nonce,
          signature
        );

        const receipt = await tx.wait();

        // ========== 链上成功后更新库存 ==========
        const newStock = parseInt(row.stock) - amount;
        await env.DB.prepare("UPDATE products SET stock = ? WHERE tokenId = ?")
          .bind(newStock, tokenId)
          .run();

        return withCors(JSON.stringify({ success: true, txHash: receipt.hash }));

      } catch (err) {
        console.error("❌ Worker error:", err);
        return withCors(JSON.stringify({
          success: false,
          error: err?.reason || err?.message || "unknown error",
          raw: err
        }), 500);
      }
    }


    // ==============================✅ 查询 TransferSingle 和 TransferBatch 日志（GET /logs）======================================================
    if (url.pathname === "/logs" && method === "GET") {
      try {
        // 读取最新区块高度
        const latestRes = await fetch(RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] })
        });
        const latestBlockHex = (await latestRes.json()).result;
        const latestBlock = parseInt(latestBlockHex, 16);

        // 获取上次处理区块高度（首次使用 DEPLOY_BLOCK）
        // const lastChecked = await env.NFT_LOG_KV.get("lastCheckedBlock");
        const lastChecked = 0;
        const fromBlock = lastChecked ? parseInt(lastChecked) + 1 : DEPLOY_BLOCK;


        if (fromBlock > latestBlock) {
          return withCors(JSON.stringify({ success: true, message: "No new blocks." }));
        }

        // 查询事件日志
        const logsRes = await fetch(RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "eth_getLogs",
            params: [{
              fromBlock: "0x" + fromBlock.toString(16),
              toBlock: "0x" + latestBlock.toString(16),
              address: CONTRACT_ADDRESS,
              topics: [[TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC]]
            }]
          })
        });

        const logData = await logsRes.json();
        const logs = logData.result;

        const events = logs.map(log => {
          const eventType = log.topics[0] === TRANSFER_SINGLE_TOPIC ? "single" : "batch";
          const blockNumber = parseInt(log.blockNumber, 16);
          const operator = "0x" + log.topics[1].slice(26);
          const from = "0x" + log.topics[2].slice(26);
          const to = "0x" + log.topics[3].slice(26);

          if (eventType === "single") {
            const data = log.data.slice(2);
            const tokenId = parseInt(data.slice(0, 64), 16);
            const amount = parseInt(data.slice(64, 128), 16);
            return { eventType, blockNumber, operator, from, to, tokenId, amount };
          } else {
            const data = log.data.slice(2);
            const offsetIds = parseInt(data.slice(0, 64), 16);
            const offsetAmounts = parseInt(data.slice(64, 128), 16);
            const count = (data.length - 128) / 128 / 2;

            const ids = [], amounts = [];
            for (let i = 0; i < count; i++) {
              ids.push(parseInt(data.slice(128 + i * 64, 128 + (i + 1) * 64), 16));
              amounts.push(parseInt(data.slice(128 + (count * 64) + i * 64, 128 + (count * 64) + (i + 1) * 64), 16));
            }

            return { eventType, blockNumber, operator, from, to, ids, amounts };

          }
        });

        // 更新 KV 中的 lastCheckedBlock
        // await env.NFT_LOG_KV.put("lastCheckedBlock", latestBlock.toString());

        return withCors(JSON.stringify({ success: true, logs: events }, null, 2));
      } catch (err) {
        return withCors(JSON.stringify({ success: false, error: err.message }), 500);
      }
    }

    // ✅ JSON 元数据接口：/json/{tokenId}.json =====================================================================
    if (url.pathname.startsWith("/products/") && method === "GET") {
      const match = url.pathname.match(/^\/products\/(\d+)$/);
      if (!match) {
        return withCors("❌ 请求路径格式错误", 400, "text/plain");
      }

      const tokenId = parseInt(match[1], 10);
      const row = await env.DB.prepare("SELECT * FROM products WHERE tokenId = ?")
        .bind(tokenId)
        .first();

      if (!row) {
        return withCors(`❌ 未找到 tokenId=${tokenId}`, 404, "text/plain");
      }

      const attributes = JSON.parse(row.attributes || "[]");

      const metadata = {
        name: row.name,
        description: row.description,
        image: row.image,
        attributes,
        tokenId,
        external_url: `http://localhost:8888/#nft/${tokenId}`
      };

      return withCors(JSON.stringify(metadata, null, 2), 200, "application/json");
    }

    // ========================== ✅ 新增：PayPal 支付后购买接口（POST /buyfrompaypal） ================================
    if (url.pathname === "/buyfrompaypal" && method === "POST") {
      try {
        const body = await request.json();
        const {
          orderId,      // PayPal 的订单号
          user,         // 钱包地址
          tokenId       // 商品 ID
        } = body;

        if (!orderId || !user || !tokenId) {
          return withCors(JSON.stringify({ success: false, error: "缺少必要字段" }), 400);
        }

        // 1️⃣ 查询商品
        const row = await env.DB.prepare("SELECT * FROM products WHERE tokenId = ?")
          .bind(tokenId)
          .first();

        if (!row) return withCors("❌ 商品不存在", 404);
        if (parseInt(row.stock) <= 0) return withCors("❌ 商品库存不足", 400);

        // 2️⃣ 调用 PayPal API 校验订单状态
        const PAYPAL_CLIENT_ID = env.PAYPAL_CLIENT_ID;
        const PAYPAL_SECRET = env.PAYPAL_SECRET;
        const authString = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`);

        const accessRes = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: "grant_type=client_credentials"
        });

        const accessToken = (await accessRes.json()).access_token;

        const orderRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        });

        const orderData = await orderRes.json();

        if (orderData.status !== "COMPLETED") {
          return withCors(JSON.stringify({ success: false, error: "PayPal 订单未完成" }), 400);
        }

        const customId = orderData.purchase_units?.[0]?.custom_id;
        if (!customId || customId.toLowerCase() !== user.toLowerCase()) {
          return withCors(JSON.stringify({ success: false, error: "用户地址不匹配" }), 400);
        }

        // 3️⃣ 发 NFT
        // const uri = `http://127.0.0.1:8787/products/${tokenId}`;
        // const amount = 1;
        // const deadline = Math.floor(Date.now() / 1000) + 3600;
        // const nonce = Date.now(); // 简化 nonce

        // const PRIVATE_KEY = env.PRIVATE_KEY;
        // const provider = new ethers.JsonRpcProvider(RPC_URL);
        // const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        // const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        // const cost = parseUnits(row.price.toString(), 6).toString();

        // const messageHash = await contract.getMessageHash(user, tokenId, uri, amount, cost, deadline, nonce);
        // const signature = await signer.signMessage(ethers.getBytes(messageHash));

        // const tx = await contract.redeem(
        //   user, tokenId, uri, amount, cost, deadline, nonce, signature
        // );
        // const receipt = await tx.wait();
        // ✅ 模拟成功发 NFT
        const receipt = { hash: "0xtesttxhash1234567890" };

        // 4️⃣ 更新库存
        const newStock = parseInt(row.stock) - 1;
        await env.DB.prepare("UPDATE products SET stock = ? WHERE tokenId = ?")
          .bind(newStock, tokenId)
          .run();

        return withCors(JSON.stringify({ success: true, txHash: receipt.hash }));

      } catch (err) {
        console.error("❌ /buyfrompaypal error:", err);
        return withCors(JSON.stringify({ success: false, error: err.message || err.toString() }), 500);
      }
    }



    // 默认提示========================================================================
    return withCors("请访问 /write、/read、/update、/list", 200, "text/plain");
  }
};
