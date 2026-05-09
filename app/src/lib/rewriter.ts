import * as cheerio from "cheerio";
import { encodeProxyUrl } from "./utils";

const PROXY_BASE = "/api/proxy?url=";

/** Build the injected toolbar HTML */
function buildToolbar(currentUrl: string): string {
  return `
<div id="__onionsecure_toolbar__" style="
  position:fixed;top:0;left:0;right:0;z-index:2147483647;
  background:#1a1a2e;color:#e0e0e0;padding:6px 12px;
  display:flex;align-items:center;gap:8px;font-family:monospace;font-size:13px;
  box-shadow:0 2px 8px rgba(0,0,0,0.6);
">
  <span title="OnionSecure HTTPS Proxy" style="color:#7fff7f;font-weight:bold;white-space:nowrap;">🧅 OnionSecure</span>
  <span style="color:#7fff7f;font-size:11px;white-space:nowrap;">🔒 HTTPS</span>
  <form method="GET" action="/api/proxy" style="display:flex;flex:1;gap:6px;" onsubmit="__osNav(event,this)">
    <input
      name="url"
      type="text"
      value="${currentUrl.replace(/"/g, "&quot;")}"
      style="flex:1;background:#0d0d1a;color:#e0e0e0;border:1px solid #444;border-radius:4px;padding:3px 8px;font-size:13px;"
      spellcheck="false"
      autocomplete="off"
    />
    <button type="submit" style="background:#2a2a4a;color:#e0e0e0;border:1px solid #555;border-radius:4px;padding:3px 10px;cursor:pointer;">Go</button>
  </form>
  <a href="/" style="color:#aaa;text-decoration:none;font-size:11px;white-space:nowrap;">Home</a>
</div>
<div style="height:44px;"></div>
<script>
(function(){
  function __osProxyUrl(url){
    try{
      var u=new URL(url,window.location.href);
      if(u.protocol==='http:'||u.protocol==='https:'){
        return '/api/proxy?url='+btoa(u.toString()).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
      }
    }catch(e){}
    return url;
  }
  function __osNav(e,form){
    e.preventDefault();
    var raw=form.querySelector('input[name=url]').value.trim();
    if(!raw.match(/^https?:\\/\\//)){raw='http://'+raw;}
    var enc=btoa(raw).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
    window.location.href='/api/proxy?url='+enc;
  }
  window.__osNav=__osNav;
  // Intercept link clicks and form submissions at the top level
  document.addEventListener('click',function(e){
    var a=e.target.closest('a');
    if(!a||!a.href)return;
    var href=a.href;
    if(href.startsWith('/api/proxy'))return;
    if(href.match(/^https?:\\/\\//)){
      e.preventDefault();
      var enc=btoa(href).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
      window.location.href='/api/proxy?url='+enc;
    }
  },true);
  document.addEventListener('submit',function(e){
    var form=e.target;
    if(!form||form.id==='__onionsecure_toolbar__')return;
    // Let toolbar form handle itself
    var action=form.action||window.location.href;
    if(action.startsWith('/api/proxy'))return;
    e.preventDefault();
    var data=new FormData(form);
    var params=new URLSearchParams();
    data.forEach(function(v,k){params.append(k,v);});
    var finalUrl=action+(action.includes('?')?'&':'?')+params.toString();
    var enc=btoa(finalUrl).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
    window.location.href='/api/proxy?url='+enc;
  },true);
})();
</script>
`;
}

/** Rewrite all proxiable URLs in an attribute value */
function rewriteAttr(val: string | undefined, base: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("/api/proxy")
  ) {
    return val;
  }
  try {
    const resolved = new URL(trimmed, base).toString();
    return PROXY_BASE + encodeProxyUrl(resolved);
  } catch {
    return val;
  }
}

/** Rewrite url() references in CSS text */
export function rewriteCss(css: string, base: string): string {
  // Rewrite url('...') and url("...") and url(...)
  return css.replace(
    /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
    (_match, quote, href) => {
      const rewritten = rewriteAttr(href, base);
      return `url(${quote}${rewritten}${quote})`;
    }
  );
}

/** Rewrite @import "..." or @import url(...) in CSS */
function rewriteCssImports(css: string, base: string): string {
  return css.replace(
    /@import\s+(['"])([^'"]+)\1/gi,
    (_match, quote, href) => {
      const rewritten = rewriteAttr(href, base);
      return `@import ${quote}${rewritten}${quote}`;
    }
  );
}

/** Full CSS rewrite */
export function rewriteCssFull(css: string, base: string): string {
  return rewriteCssImports(rewriteCss(css, base), base);
}

/** Rewrite srcset attribute value */
function rewriteSrcset(srcset: string, base: string): string {
  return srcset
    .split(",")
    .map((part) => {
      const [url, ...rest] = part.trim().split(/\s+/);
      const rewritten = rewriteAttr(url, base);
      return [rewritten, ...rest].join(" ");
    })
    .join(", ");
}

/** Rewrite HTML content, injecting toolbar and rewriting all URLs */
export function rewriteHtml(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);

  // Remove any existing base tag to avoid confusion
  $("base").remove();

  // Inject toolbar at beginning of body
  $("body").prepend(buildToolbar(baseUrl));

  // Rewrite hrefs
  $("[href]").each((_i, el) => {
    const val = $(el).attr("href");
    if (val) $(el).attr("href", rewriteAttr(val, baseUrl));
  });

  // Rewrite src
  $("[src]").each((_i, el) => {
    const val = $(el).attr("src");
    if (val) $(el).attr("src", rewriteAttr(val, baseUrl));
  });

  // Rewrite action (forms)
  $("form[action]").each((_i, el) => {
    const val = $(el).attr("action");
    if (val) $(el).attr("action", rewriteAttr(val, baseUrl));
  });

  // Rewrite srcset
  $("[srcset]").each((_i, el) => {
    const val = $(el).attr("srcset");
    if (val) $(el).attr("srcset", rewriteSrcset(val, baseUrl));
  });

  // Rewrite data-src (lazy loading)
  $("[data-src]").each((_i, el) => {
    const val = $(el).attr("data-src");
    if (val) $(el).attr("data-src", rewriteAttr(val, baseUrl));
  });

  // Rewrite poster (video)
  $("[poster]").each((_i, el) => {
    const val = $(el).attr("poster");
    if (val) $(el).attr("poster", rewriteAttr(val, baseUrl));
  });

  // Rewrite inline style url() references
  $("[style]").each((_i, el) => {
    const val = $(el).attr("style");
    if (val) $(el).attr("style", rewriteCss(val, baseUrl));
  });

  // Rewrite <style> blocks
  $("style").each((_i, el) => {
    const content = $(el).html();
    if (content) $(el).html(rewriteCssFull(content, baseUrl));
  });

  // Rewrite meta refresh
  $('meta[http-equiv="refresh"]').each((_i, el) => {
    const content = $(el).attr("content");
    if (content) {
      const rewritten = content.replace(/url=(.+)/i, (_m, url) => {
        return `url=${rewriteAttr(url.trim(), baseUrl)}`;
      });
      $(el).attr("content", rewritten);
    }
  });

  // Remove CSP and other security headers that would block our injections
  $('meta[http-equiv="Content-Security-Policy"]').remove();
  $('meta[http-equiv="X-Frame-Options"]').remove();

  return $.html();
}
