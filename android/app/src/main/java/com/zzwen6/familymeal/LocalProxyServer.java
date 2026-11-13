package com.zzwen6.familymeal;

import android.content.res.AssetManager;
import android.util.Log;

import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import fi.iki.elonen.NanoHTTPD;

/**
 * 只监听 127.0.0.1：一边提供打包进来的 H5 静态文件，一边把 /api 反代到上游 HTTPS API，
 * 让 WebView 同源请求，避开 CORS 和 file:// 限制。
 */
public class LocalProxyServer extends NanoHTTPD {
    private static final String TAG = "FamilyMealProxy";
    private static final String ASSET_ROOT = "www";

    private static final Set<String> HOP_BY_HOP = new HashSet<>(Arrays.asList(
            "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
            "te", "trailers", "trailer", "transfer-encoding", "upgrade", "proxy-connection"
    ));

    private final AssetManager assets;
    private final String upstream;

    public LocalProxyServer(AssetManager assets, String upstream, int port) {
        super("127.0.0.1", port);
        this.assets = assets;
        String trimmed = upstream == null ? "" : upstream.trim();
        if (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        this.upstream = trimmed;
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        if (uri == null) uri = "/";
        if (uri.startsWith("/api/") || uri.equals("/api")) {
            return proxy(session);
        }
        return serveStatic(uri);
    }

    private Response serveStatic(String uri) {
        String path = uri;
        int q = path.indexOf('?');
        if (q >= 0) path = path.substring(0, q);
        try {
            path = URLDecoder.decode(path, "UTF-8");
        } catch (Exception ignored) {
        }
        path = path.replace('\\', '/');
        if (path.isEmpty() || "/".equals(path)) {
            path = "/index.html";
        }
        if (path.startsWith("/")) path = path.substring(1);
        if (path.contains("..") || path.startsWith("/")) {
            return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain; charset=utf-8", "Forbidden");
        }

        String assetPath = ASSET_ROOT + "/" + path;
        InputStream in = openAsset(assetPath);
        if (in == null && !path.contains(".")) {
            in = openAsset(ASSET_ROOT + "/index.html");
            path = "index.html";
        }
        if (in == null) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain; charset=utf-8", "Not Found");
        }
        Response res = newChunkedResponse(Response.Status.OK, mimeOf(path), in);
        if ("index.html".equals(path)) {
            res.addHeader("Cache-Control", "no-cache");
        } else if (path.startsWith("assets/")) {
            res.addHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        return res;
    }

    private InputStream openAsset(String path) {
        try {
            return assets.open(path);
        } catch (IOException e) {
            return null;
        }
    }

    private Response proxy(IHTTPSession session) {
        HttpURLConnection conn = null;
        try {
            String path = session.getUri();
            String qs = session.getQueryParameterString();
            String url = upstream + path;
            if (qs != null && !qs.isEmpty()) {
                url += "?" + qs;
            }

            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(15_000);
            conn.setReadTimeout(180_000);
            conn.setUseCaches(false);
            conn.setRequestMethod(session.getMethod().name());

            Map<String, String> headers = session.getHeaders();
            for (Map.Entry<String, String> e : headers.entrySet()) {
                String name = e.getKey();
                if (name == null) continue;
                String lower = name.toLowerCase(Locale.ROOT);
                if (HOP_BY_HOP.contains(lower)
                        || "host".equals(lower)
                        // WebView 页面来自 http://127.0.0.1，经本地代理后对上游是同源调用；
                        // 转发 Origin 会被后端 CORS 当成未授权来源并返回 403。
                        || "origin".equals(lower)
                        || "referer".equals(lower)
                        || "content-length".equals(lower)
                        || "accept-encoding".equals(lower)
                        || "http-client-ip".equals(lower)
                        || "remote-addr".equals(lower)) {
                    continue;
                }
                conn.setRequestProperty(toHeaderCase(name), e.getValue());
            }

            long contentLength = 0;
            String cl = headers.get("content-length");
            if (cl != null && !cl.isEmpty()) {
                contentLength = Long.parseLong(cl.trim());
            }
            if (contentLength > 0) {
                conn.setDoOutput(true);
                conn.setFixedLengthStreamingMode(contentLength);
                try (OutputStream out = conn.getOutputStream()) {
                    copyLimited(session.getInputStream(), out, contentLength);
                }
            }

            int code = conn.getResponseCode();
            if (code < 0) code = 502;
            String mime = conn.getContentType();
            InputStream raw = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
            if (raw == null) raw = new ByteArrayInputStream(new byte[0]);

            final HttpURLConnection held = conn;
            conn = null; // 由包装流在 close 时断开
            InputStream wrapped = new FilterInputStream(raw) {
                @Override
                public void close() throws IOException {
                    try {
                        super.close();
                    } finally {
                        held.disconnect();
                    }
                }
            };

            Response res = newChunkedResponse(statusOf(code, held.getResponseMessage()), mime, wrapped);
            Map<String, List<String>> respHeaders = held.getHeaderFields();
            if (respHeaders != null) {
                for (Map.Entry<String, List<String>> e : respHeaders.entrySet()) {
                    String name = e.getKey();
                    if (name == null) continue;
                    String lower = name.toLowerCase(Locale.ROOT);
                    if (HOP_BY_HOP.contains(lower)
                            || "content-length".equals(lower)
                            || "content-type".equals(lower)) {
                        continue;
                    }
                    if (e.getValue() == null) continue;
                    for (String v : e.getValue()) {
                        if (v != null) res.addHeader(name, v);
                    }
                }
            }
            return res;
        } catch (Exception ex) {
            Log.w(TAG, "proxy failed: " + session.getUri(), ex);
            if (conn != null) conn.disconnect();
            String body = "{\"code\":\"BAD_GATEWAY\",\"message\":\"网络异常，连不上服务器\"}";
            return newFixedLengthResponse(statusOf(502, "Bad Gateway"),
                    "application/json; charset=utf-8", body);
        }
    }

    private static void copyLimited(InputStream in, OutputStream out, long n) throws IOException {
        byte[] buf = new byte[16 * 1024];
        long left = n;
        while (left > 0) {
            int want = (int) Math.min(buf.length, left);
            int read = in.read(buf, 0, want);
            if (read < 0) break;
            out.write(buf, 0, read);
            left -= read;
        }
        out.flush();
    }

    private static String toHeaderCase(String name) {
        String[] parts = name.split("-");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) sb.append('-');
            String p = parts[i];
            if (p.isEmpty()) continue;
            sb.append(Character.toUpperCase(p.charAt(0)));
            if (p.length() > 1) sb.append(p.substring(1));
        }
        return sb.toString();
    }

    private static Response.IStatus statusOf(int code, String message) {
        Response.Status known = Response.Status.lookup(code);
        if (known != null) return known;
        final String desc = (message == null || message.isEmpty())
                ? (code + " ")
                : (code + " " + message);
        return new Response.IStatus() {
            @Override
            public int getRequestStatus() {
                return code;
            }

            @Override
            public String getDescription() {
                return desc;
            }
        };
    }

    private static String mimeOf(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        int dot = lower.lastIndexOf('.');
        String ext = dot >= 0 ? lower.substring(dot) : "";
        switch (ext) {
            case ".html":
            case ".htm":
                return "text/html; charset=utf-8";
            case ".js":
            case ".mjs":
                return "application/javascript; charset=utf-8";
            case ".css":
                return "text/css; charset=utf-8";
            case ".json":
            case ".map":
                return "application/json";
            case ".svg":
                return "image/svg+xml";
            case ".png":
                return "image/png";
            case ".jpg":
            case ".jpeg":
                return "image/jpeg";
            case ".gif":
                return "image/gif";
            case ".webp":
                return "image/webp";
            case ".ico":
                return "image/x-icon";
            case ".woff":
                return "font/woff";
            case ".woff2":
                return "font/woff2";
            case ".ttf":
                return "font/ttf";
            case ".otf":
                return "font/otf";
            case ".wasm":
                return "application/wasm";
            case ".txt":
                return "text/plain; charset=utf-8";
            default:
                return "application/octet-stream";
        }
    }
}
