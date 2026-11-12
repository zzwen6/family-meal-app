package com.zzwen6.familymeal;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "FamilyMeal";
    private static final int PREFERRED_PORT = 18765;
    /** NanoHTTPD 默认 5 秒太短，上传 30MB 视频或拉媒体会不够。 */
    private static final int SOCKET_TIMEOUT_MS = 180_000;

    private WebView webView;
    private LocalProxyServer server;
    private String localBase;
    private ValueCallback<Uri[]> filePathCallback;

    private final ActivityResultLauncher<Intent> fileChooserLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (filePathCallback == null) return;
                Uri[] uris = WebChromeClient.FileChooserParams.parseResult(result.getResultCode(), result.getData());
                filePathCallback.onReceiveValue(uris);
                filePathCallback = null;
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.parseColor("#FFF8F1"));
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webview);
        configureWebView();
        startLocalServerAndLoad();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleBack();
            }
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
                return handleUrl(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                return handleUrl(Uri.parse(url));
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    showErrorPage("页面加载失败，请检查网络后重试");
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                }
                filePathCallback = callback;
                Intent intent;
                try {
                    intent = params != null ? params.createIntent() : new Intent(Intent.ACTION_GET_CONTENT);
                    if (intent.getAction() == null) {
                        intent.setAction(Intent.ACTION_GET_CONTENT);
                    }
                    if (intent.getType() == null) {
                        intent.setType("*/*");
                    }
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    fileChooserLauncher.launch(Intent.createChooser(intent, "选择文件"));
                    return true;
                } catch (Exception e) {
                    Log.w(TAG, "file chooser failed", e);
                    filePathCallback = null;
                    if (callback != null) callback.onReceiveValue(null);
                    return false;
                }
            }
        });
    }

    private boolean handleUrl(Uri uri) {
        String host = uri.getHost();
        String scheme = uri.getScheme();
        if (scheme == null) return false;
        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            if ("127.0.0.1".equals(host) || "localhost".equals(host)) {
                return false;
            }
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            Log.w(TAG, "no app to open " + uri);
        }
        return true;
    }

    private void startLocalServerAndLoad() {
        try {
            server = new LocalProxyServer(getAssets(), BuildConfig.API_UPSTREAM, PREFERRED_PORT);
            try {
                server.start(SOCKET_TIMEOUT_MS, true);
            } catch (IOException bindEx) {
                server = new LocalProxyServer(getAssets(), BuildConfig.API_UPSTREAM, 0);
                server.start(SOCKET_TIMEOUT_MS, true);
            }
            int port = server.getListeningPort();
            if (port <= 0) {
                throw new IOException("local proxy did not bind a port");
            }
            localBase = "http://127.0.0.1:" + port + "/";
            Log.i(TAG, "local proxy on " + localBase + " -> " + BuildConfig.API_UPSTREAM);
            webView.loadUrl(localBase);
        } catch (IOException e) {
            Log.e(TAG, "failed to start local proxy", e);
            showErrorPage("本地服务启动失败：" + e.getMessage());
        }
    }

    private void handleBack() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        if (webView == null) {
            finish();
            return;
        }
        String js = "(function(){"
                + "var h=location.hash||'';"
                + "var path=h.replace(/^#/,'').split('?')[0];"
                + "var root=!path||path==='/'||path==='/pages/index/index'||path==='/pages/index/index/';"
                + "if(!root){history.back();return 'back';}"
                + "return 'exit';"
                + "})()";
        webView.evaluateJavascript(js, value -> {
            if (value == null || "\"exit\"".equals(value) || "exit".equals(value)) {
                finish();
            }
        });
    }

    private void showErrorPage(String message) {
        String escaped = message
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
        String html = "<!DOCTYPE html><html><head><meta charset='utf-8'>"
                + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<title>家庭点餐</title>"
                + "<style>body{font-family:sans-serif;background:#F6F4F1;color:#2B2B2B;"
                + "display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}"
                + ".card{background:#fff;border-radius:16px;padding:28px 24px;margin:24px;max-width:360px;"
                + "box-shadow:0 4px 16px rgba(0,0,0,.04);text-align:center;}"
                + "h1{font-size:20px;margin:0 0 12px}p{color:#666;line-height:1.6}"
                + "button{margin-top:16px;background:#E6772E;color:#fff;border:0;border-radius:999px;"
                + "padding:10px 28px;font-size:16px}</style></head><body><div class='card'>"
                + "<h1>暂时打不开</h1><p>" + escaped + "</p>"
                + "<button onclick='location.replace(\"" + (localBase == null ? "/" : localBase) + "\")'>重试</button>"
                + "</div></body></html>";
        String encoded = android.util.Base64.encodeToString(
                html.getBytes(StandardCharsets.UTF_8),
                android.util.Base64.NO_PADDING | android.util.Base64.NO_WRAP);
        webView.loadUrl("data:text/html;base64," + encoded);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        if (server != null) {
            server.stop();
            server = null;
        }
        super.onDestroy();
    }
}
