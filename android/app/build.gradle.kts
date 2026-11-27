import java.util.Properties

plugins {
    id("com.android.application")
}

val rootAppDir: File = rootProject.projectDir.parentFile

val keystoreProps = Properties()
val keystorePropsFile: File? = listOf(
    rootAppDir.resolve("dist-android/keystore.properties"),
    rootProject.projectDir.resolve("keystore.properties"),
).firstOrNull { it.isFile }
if (keystorePropsFile != null) {
    keystorePropsFile.inputStream().use { keystoreProps.load(it) }
}

fun envOrProp(env: String, prop: String): String? =
    System.getenv(env)?.takeIf { it.isNotBlank() }
        ?: keystoreProps.getProperty(prop)?.takeIf { it.isNotBlank() }

fun resolveStoreFile(storePath: String): File {
    val given = File(storePath)
    if (given.isAbsolute && given.isFile) return given
    keystorePropsFile?.parentFile?.resolve(storePath)?.takeIf { it.isFile }?.let { return it }
    rootAppDir.resolve("dist-android").resolve(storePath).takeIf { it.isFile }?.let { return it }
    rootProject.projectDir.resolve(storePath).takeIf { it.isFile }?.let { return it }
    return given
}

val apiUpstream = (project.findProperty("apiUpstream") as String?)?.takeIf { it.isNotBlank() }
    ?: "https://meal.six666.qzz.io"

val releaseStorePath = envOrProp("FAMILY_MEAL_STORE_FILE", "storeFile")
val releaseStorePassword = envOrProp("FAMILY_MEAL_STORE_PASSWORD", "storePassword")
val releaseKeyAlias = envOrProp("FAMILY_MEAL_KEY_ALIAS", "keyAlias")
val releaseKeyPassword = envOrProp("FAMILY_MEAL_KEY_PASSWORD", "keyPassword")
val hasReleaseSigning = listOf(releaseStorePath, releaseStorePassword, releaseKeyAlias, releaseKeyPassword)
    .all { it != null }

android {
    namespace = "com.zzwen6.familymeal"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.zzwen6.familymeal"
        minSdk = 24
        targetSdk = 34
        versionCode = 103
        versionName = "1.0.3"
        buildConfigField("String", "API_UPSTREAM", "\"$apiUpstream\"")
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = resolveStoreFile(releaseStorePath!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }
}

tasks.register<Exec>("buildH5") {
    workingDir = rootAppDir
    environment("VITE_API_BASE", "")
    commandLine("npm", "run", "build:h5")
    onlyIf { !project.hasProperty("skipH5") }
}

tasks.register<Sync>("copyH5Assets") {
    dependsOn("buildH5")
    from(rootAppDir.resolve("dist/build/h5"))
    into(layout.projectDirectory.dir("src/main/assets/www"))
    doLast {
        val index = layout.projectDirectory.file("src/main/assets/www/index.html").asFile
        if (!index.isFile) {
            throw GradleException(
                "未找到 H5 产物 index.html。请先在仓库根目录确认 npm run build:h5 输出到 dist/build/h5。"
            )
        }
    }
}

tasks.matching { it.name == "preBuild" }.configureEach {
    dependsOn("copyH5Assets")
}

tasks.matching { it.name == "assembleRelease" }.configureEach {
    doFirst {
        if (!hasReleaseSigning) {
            throw GradleException(
                "未找到 release 签名配置。请创建 dist-android/keystore.properties（不要提交到 Git），" +
                    "或设置环境变量 FAMILY_MEAL_STORE_FILE / FAMILY_MEAL_STORE_PASSWORD / " +
                    "FAMILY_MEAL_KEY_ALIAS / FAMILY_MEAL_KEY_PASSWORD。详见仓库 README。"
            )
        }
        val store = resolveStoreFile(releaseStorePath!!)
        if (!store.isFile) {
            throw GradleException("找不到签名证书: $store")
        }
    }
}

dependencies {
    // 1.8+ 的 kotlin-stdlib 已包含 jdk7/jdk8 扩展，用 BOM 避免与传递依赖冲突
    implementation(platform("org.jetbrains.kotlin:kotlin-bom:1.9.24"))
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("org.nanohttpd:nanohttpd:2.3.1")
}
