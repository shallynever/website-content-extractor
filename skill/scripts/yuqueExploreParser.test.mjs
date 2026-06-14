import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import { parseYuqueExplore } from "./yuqueExploreParser.mjs";

function makeDocument(html) {
  return parseHTML(html).document;
}

test("extracts Yuque Explore headline feed entries", () => {
  const document = makeDocument(`
    <html>
      <head><title>逛逛 · 语雀</title></head>
      <body>
        <div class="Feed-module_feed_Hvu3f">
          <a class="Feed-module_uname_2c2pm" href="/yuque">月准</a>
          <a class="DocFeed-module_title_ZD4X5" href="/yuque/ai/pro-member-token">语雀专业会员支持试用MCP</a>
          <div class="DocFeed-module_desc_+QefW">语雀 API Token 功能现已向专业会员开放！</div>
          <div class="Feed-module_extra_fFOIZ">92 查看原文 速读本文</div>
        </div>
        <div class="Feed-module_feed_Hvu3f">
          <a class="Feed-module_uname_2c2pm" href="/alipaydeg9yfphnd">陈明明爱学习</a>
          <a class="DocFeed-module_title_ZD4X5" href="/alipaydeg9yfphnd/tavg5a/yuque-ai-ecosystem-final?singleDoc#">语雀 + AI：从文档工具到你的第二大脑</a>
          <div class="DocFeed-module_desc_+QefW">当前语雀 AI 生态项目 0.1 已经发布。</div>
          <div class="Feed-module_extra_fFOIZ">1683 查看原文 速读本文</div>
        </div>
      </body>
    </html>
  `);

  assert.deepEqual(parseYuqueExplore(document, {
    url: "https://www.yuque.com/dashboard/explore#headlines",
    currentUrl: "https://www.yuque.com/dashboard/explore#headlines"
  }), {
    status: "ok",
    url: "https://www.yuque.com/dashboard/explore#headlines",
    currentUrl: "https://www.yuque.com/dashboard/explore#headlines",
    title: "逛逛 · 语雀",
    listType: "yuque-explore-headlines",
    entries: [
      {
        rank: 1,
        author: "月准",
        title: "语雀专业会员支持试用MCP",
        url: "https://www.yuque.com/yuque/ai/pro-member-token",
        description: "语雀 API Token 功能现已向专业会员开放！",
        views: "92"
      },
      {
        rank: 2,
        author: "陈明明爱学习",
        title: "语雀 + AI：从文档工具到你的第二大脑",
        url: "https://www.yuque.com/alipaydeg9yfphnd/tavg5a/yuque-ai-ecosystem-final?singleDoc#",
        description: "当前语雀 AI 生态项目 0.1 已经发布。",
        views: "1683"
      }
    ],
    content: "1. 语雀专业会员支持试用MCP - 月准 - 92 views\n语雀 API Token 功能现已向专业会员开放！\n\n2. 语雀 + AI：从文档工具到你的第二大脑 - 陈明明爱学习 - 1683 views\n当前语雀 AI 生态项目 0.1 已经发布。"
  });
});

test("reports Yuque Explore pages without feed entries", () => {
  const document = makeDocument(`
    <html>
      <head><title>逛逛 · 语雀</title></head>
      <body><main>暂无内容</main></body>
    </html>
  `);

  assert.equal(parseYuqueExplore(document, {
    url: "https://www.yuque.com/dashboard/explore#headlines",
    currentUrl: "https://www.yuque.com/dashboard/explore#headlines"
  }).status, "unsupported_page");
});
