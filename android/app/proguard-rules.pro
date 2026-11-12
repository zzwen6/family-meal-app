# 当前 release 未开启混淆。若以后打开 minify，请保留 WebView / JavaScriptInterface。
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
