export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // 可选：根据环境变量判断是否允许全部跨域
    const isDev = env.ENVIRONMENT === "dev"; // 在 wrangler.toml 中配置 ENVIRONMENT = "dev"
    const allowOrigin = isDev ? "*" : "https://your-production-domain.com";

    function withCors(body, status = 200, contentType = "application/json") {
      return new Response(body, {
        status,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Content-Type": contentType
        }
      });
    }

    // ✅ 处理 CORS 预检请求
    if (method === "OPTIONS") {
      return withCors(null, 204);
    }

    // ✅ 写入商品数据（POST /write?productId=xxx）
    if (url.pathname === "/write" && method === "POST") {
      const productId = url.searchParams.get("productId");
      if (!productId) {
        return withCors("❌ 缺少 productId 参数", 400, "text/plain");
      }

      let body;
      try {
        body = await request.json();
        console.log(body);
      } catch (err) {
        return withCors("❌ 无效的 JSON 数据", 400, "text/plain");
      }

      const key = `product:${productId}`;
      await env.MY_KV.put(key, JSON.stringify(body));
      console.log("已保存：", key);

      // 写入商品本体后
      const index = await env.MY_KV.get("product:index", { type: "json" }) || [];
      if (!index.includes(productId)) {
        index.push(productId);
        await env.MY_KV.put("product:index", JSON.stringify(index));
      }

      return withCors(`✅ 已保存商品：${key}`, 200, "text/plain");
    }

    // ✅ 读取商品数据（GET /read?productId=xxx）
    if (url.pathname === "/read" && method === "GET") {
      const productId = url.searchParams.get("productId");
      if (!productId) {
        return withCors("❌ 缺少 productId 参数", 400, "text/plain");
      }

      const key = `product:${productId}`;
      const data = await env.MY_KV.get(key, { type: "json" });

      console.log("Worker executed at", new Date().toISOString());

      if (!data) {
        return withCors(`❌ 未找到商品 ${productId}`, 404, "text/plain");
      }

      return new Response(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=600",
          "Access-Control-Allow-Origin": allowOrigin
        }
      });
    }

    if (url.pathname === "/list" && method === "GET") {
      const index = await env.MY_KV.get("product:index", { type: "json" }) || [];

      const result = [];
      for (const id of index) {
        const data = await env.MY_KV.get(`product:${id}`, { type: "json" });
        // console.log(data);
        if (data) {
          result.push({ productId: id, ...data });
        }
      }

      return withCors(JSON.stringify(result, null, 2), 200, "application/json");
    }


    // ✅ 默认响应
    return withCors("请访问 /write 或 /read", 200, "text/plain");
  }
};
