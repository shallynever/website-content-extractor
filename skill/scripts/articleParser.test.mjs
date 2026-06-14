import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import { detectVerificationPage, parseWechatArticle, renderMarkdown } from "./articleParser.mjs";
import { matchSiteProfile, PROFILE_ROOT } from "./siteProfiles.mjs";
import { join } from "node:path";

function makeDocument(html) {
  return parseHTML(html).document;
}

test("extracts article fields from a WeChat article document", () => {
  const document = makeDocument(`
    <html>
      <head><title>Browser Title</title></head>
      <body>
        <h1 id="activity-name">  文章标题  </h1>
        <span id="js_name">  示例公众号  </span>
        <em id="publish_time">2026-06-11</em>
        <div id="js_content">
          <p>第一段内容。</p>
          <p>第二段内容。</p>
        </div>
      </body>
    </html>
  `);

  assert.deepEqual(parseWechatArticle(document, {
    url: "https://mp.weixin.qq.com/s/example",
    currentUrl: "https://mp.weixin.qq.com/s/example"
  }), {
    status: "ok",
    url: "https://mp.weixin.qq.com/s/example",
    currentUrl: "https://mp.weixin.qq.com/s/example",
    title: "文章标题",
    account: "示例公众号",
    publishTime: "2026-06-11",
    content: "第一段内容。\n第二段内容。"
  });
});

test("detects WeChat verification pages", () => {
  assert.equal(
    detectVerificationPage({
      url: "https://mp.weixin.qq.com/mp/wappoc_appmsgcaptcha",
      title: "验证",
      bodyText: "环境异常 请完成验证码"
    }),
    true
  );
});

test("does not treat normal article text containing 验证 as a verification page", () => {
  const document = makeDocument(`
    <html>
      <head><title>Browser Title</title></head>
      <body>
        <h1 id="activity-name">  正常文章  </h1>
        <span id="js_name">  示例公众号  </span>
        <em id="publish_time">2026-06-14</em>
        <div id="js_content">
          <p>头部团队的工程数据已经验证了这一点。</p>
          <p>这是正常正文，不是安全验证页面。</p>
        </div>
      </body>
    </html>
  `);

  assert.equal(
    detectVerificationPage({
      url: "https://mp.weixin.qq.com/s/example",
      title: "正常文章",
      bodyText: "头部团队的工程数据已经验证了这一点。"
    }),
    false
  );
  assert.equal(
    parseWechatArticle(document, {
      url: "https://mp.weixin.qq.com/s/example",
      currentUrl: "https://mp.weixin.qq.com/s/example"
    }).status,
    "ok"
  );
});

test("prefers readable WeChat article DOM over verification keywords in the article body", () => {
  const document = makeDocument(`
    <html>
      <head><title>Browser Title</title></head>
      <body>
        <h1 id="activity-name">  安全测试文章  </h1>
        <span id="js_name">  示例公众号  </span>
        <em id="publish_time">2026-06-14</em>
        <div id="js_content">
          <p>这一段讨论验证码、captcha、环境异常这些词如何出现在正常文章里。</p>
          <p>只要正文 DOM 已经可读，就不应该被误判成人工验证页。</p>
        </div>
      </body>
    </html>
  `);

  assert.equal(
    parseWechatArticle(document, {
      url: "https://mp.weixin.qq.com/s/example",
      currentUrl: "https://mp.weixin.qq.com/s/example"
    }).status,
    "ok"
  );
});

test("matches WeChat Official Account URLs to the WeChat profile", () => {
  assert.deepEqual(matchSiteProfile("https://mp.weixin.qq.com/s/example"), {
    id: "wechat-official-account",
    displayName: "WeChat Official Account",
    extractorId: "wechat",
    chromeProfile: join(PROFILE_ROOT, "wechat-official-account"),
    verificationKind: "manual"
  });
});

test("matches GitHub URLs to the GitHub repository ranking profile", () => {
  assert.deepEqual(matchSiteProfile("https://github.com/topics/artificial-intelligence"), {
    id: "github-repository-ranking",
    displayName: "GitHub Repository Ranking",
    extractorId: "github-repository-ranking",
    chromeProfile: join(PROFILE_ROOT, "github"),
    verificationKind: "manual"
  });
});

test("matches Yuque document URLs to the Yuque profile", () => {
  assert.deepEqual(matchSiteProfile("https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz"), {
    id: "yuque-document",
    displayName: "Yuque Document",
    extractorId: "yuque-document",
    chromeProfile: join(PROFILE_ROOT, "yuque"),
    verificationKind: "manual"
  });
});

test("matches Yuque Explore URLs to the Yuque Explore profile", () => {
  assert.deepEqual(matchSiteProfile("https://www.yuque.com/dashboard/explore#headlines"), {
    id: "yuque-explore-headlines",
    displayName: "Yuque Explore Headlines",
    extractorId: "yuque-explore-headlines",
    chromeProfile: join(PROFILE_ROOT, "yuque"),
    verificationKind: "manual"
  });
});

test("reports unsupported websites without choosing a Chrome profile", () => {
  assert.equal(matchSiteProfile("https://example.com/openai/codex"), null);
});

test("renders markdown for successful extraction", () => {
  const markdown = renderMarkdown({
    status: "ok",
    url: "https://mp.weixin.qq.com/s/example",
    title: "文章标题",
    account: "示例公众号",
    publishTime: "2026-06-11",
    content: "正文"
  });

  assert.match(markdown, /^# 文章标题/);
  assert.match(markdown, /- Account: 示例公众号/);
  assert.match(markdown, /正文/);
});

test("renders generic markdown for unsupported websites", () => {
  const markdown = renderMarkdown({
    status: "unsupported_site",
    url: "https://github.com/openai/codex",
    reason: "No extractor is registered for this website yet."
  });

  assert.match(markdown, /^# Website Content Extraction/);
  assert.match(markdown, /Status: unsupported_site/);
  assert.match(markdown, /https:\/\/github.com\/openai\/codex/);
});

test("renders markdown for GitHub repository rankings", () => {
  const markdown = renderMarkdown({
    status: "ok",
    url: "https://github.com/topics/artificial-intelligence",
    title: "Artificial intelligence topic",
    siteName: "GitHub Repository Ranking",
    listType: "github-repository-ranking",
    repositories: [
      {
        rank: 1,
        fullName: "Significant-Gravitas/AutoGPT",
        url: "https://github.com/Significant-Gravitas/AutoGPT",
        description: "AutoGPT is the vision of accessible AI for everyone.",
        language: "Python",
        stars: "178k",
        forks: "46.2k",
        starsToday: "",
        topics: ["ai", "agents"]
      }
    ]
  });

  assert.match(markdown, /^# Artificial intelligence topic/);
  assert.match(markdown, /- Site: GitHub Repository Ranking/);
  assert.match(markdown, /## Repositories/);
  assert.match(markdown, /1\. \[Significant-Gravitas\/AutoGPT\]/);
  assert.match(markdown, /Stars: 178k/);
  assert.doesNotMatch(markdown, /Account: Unknown/);
});

test("renders markdown for Yuque documents without WeChat metadata", () => {
  const markdown = renderMarkdown({
    status: "ok",
    url: "https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz",
    title: "项目文档",
    siteName: "Yuque Document",
    content: "正文"
  });

  assert.match(markdown, /^# 项目文档/);
  assert.match(markdown, /- Site: Yuque Document/);
  assert.match(markdown, /正文/);
  assert.doesNotMatch(markdown, /Account: Unknown/);
  assert.doesNotMatch(markdown, /Published: Unknown/);
});

test("renders markdown for Yuque Explore headline entries", () => {
  const markdown = renderMarkdown({
    status: "ok",
    url: "https://www.yuque.com/dashboard/explore#headlines",
    title: "逛逛 · 语雀",
    siteName: "Yuque Explore Headlines",
    listType: "yuque-explore-headlines",
    entries: [
      {
        rank: 1,
        author: "月准",
        title: "语雀专业会员支持试用MCP",
        url: "https://www.yuque.com/yuque/ai/pro-member-token",
        description: "语雀 API Token 功能现已向专业会员开放！",
        views: "92"
      }
    ]
  });

  assert.match(markdown, /^# 逛逛 · 语雀/);
  assert.match(markdown, /## Headlines/);
  assert.match(markdown, /1\. \[语雀专业会员支持试用MCP\]/);
  assert.match(markdown, /Views: 92/);
});
