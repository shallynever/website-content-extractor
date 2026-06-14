import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import { parseYuqueDocument } from "./yuqueParser.mjs";

function makeDocument(html) {
  return parseHTML(html).document;
}

test("reports Yuque unauthorized pages as needing verification", () => {
  const document = makeDocument(`
    <html>
      <head><title>401 - Unauthorized · 语雀</title></head>
      <body>
        <h1>401 - Unauthorized</h1>
        <div>Unauthorized</div>
      </body>
    </html>
  `);

  assert.deepEqual(parseYuqueDocument(document, {
    url: "https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz",
    currentUrl: "https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz"
  }), {
    status: "needs_verification",
    url: "https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz",
    currentUrl: "https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz",
    title: "401 - Unauthorized · 语雀",
    reason: "Yuque requires login or permission for this document.",
    visibleTextSample: "401 - Unauthorized\nUnauthorized"
  });
});

test("extracts Yuque document title and content from lake content pages", () => {
  const document = makeDocument(`
    <html>
      <head><title>项目文档 · 语雀</title></head>
      <body>
        <h1 class="doc-title">项目文档</h1>
        <div class="lake-content">
          <h2>背景</h2>
          <p>第一段正文。</p>
          <p>第二段正文。</p>
        </div>
      </body>
    </html>
  `);

  assert.deepEqual(parseYuqueDocument(document, {
    url: "https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz",
    currentUrl: "https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz"
  }), {
    status: "ok",
    url: "https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz",
    currentUrl: "https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz",
    title: "项目文档",
    content: "背景\n第一段正文。\n第二段正文。"
  });
});
