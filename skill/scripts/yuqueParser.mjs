export function parseYuqueDocument(document, { url = "", currentUrl = "" } = {}) {
  const normalizeText = (value = "") => value
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  const firstText = (selectors) => {
    for (const selector of selectors) {
      const value = document.querySelector(selector)?.textContent?.trim();
      if (value) return value.replace(/\s+/g, " ");
    }
    return "";
  };
  const metaContent = (property) => (
    document.querySelector(`meta[property="${property}"]`)?.getAttribute("content") ||
    document.querySelector(`meta[name="${property}"]`)?.getAttribute("content") ||
    ""
  ).trim();
  const pageTitle = document.title || "";
  const bodyText = document.body?.innerText || document.body?.textContent || "";
  const combined = `${pageTitle}\n${bodyText}`;
  const needsVerification = [
    /401\s*-\s*Unauthorized/i,
    /Unauthorized/i,
    /登录/,
    /无权访问/,
    /权限/,
    /验证码/,
    /captcha/i
  ].some((pattern) => pattern.test(combined));

  if (needsVerification) {
    return {
      status: "needs_verification",
      url,
      currentUrl,
      title: pageTitle,
      reason: "Yuque requires login or permission for this document.",
      visibleTextSample: normalizeText(bodyText).slice(0, 1000)
    };
  }

  const contentRoot =
    document.querySelector(".lake-content") ||
    document.querySelector("[data-lake-card-root]") ||
    document.querySelector(".ne-viewer-body") ||
    document.querySelector(".doc-content") ||
    document.querySelector("article") ||
    document.querySelector("main");
  const content = normalizeText(contentRoot?.innerText || contentRoot?.textContent || "");

  if (!content) {
    return {
      status: "needs_verification",
      url,
      currentUrl,
      title: pageTitle,
      reason: "Yuque document content was not found. The page may still require login or permission.",
      visibleTextSample: normalizeText(bodyText).slice(0, 1000)
    };
  }

  return {
    status: "ok",
    url,
    currentUrl,
    title: firstText([".doc-title", ".lake-title", "h1"]) || metaContent("og:title") || pageTitle.trim(),
    content
  };
}
