# ─────────────────────────────────────────────────────────────────────────────
# Running Para Cojos — Android APK build image
#
# Build the APK locally:
#
#   docker build -t running-para-cojos-builder .
#   docker run --rm \
#     -e GOOGLE_MAPS_API_KEY=AIza... \
#     -v "$(pwd)/output:/app/RunningParaCojos/android/app/build/outputs/apk" \
#     running-para-cojos-builder
#
# The debug APK will be at:
#   output/debug/app-debug.apk
# ─────────────────────────────────────────────────────────────────────────────

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    # Node
    NODE_VERSION=20 \
    # Java
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    # Android SDK
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    # Build tools / platform versions for RN 0.81 / Expo SDK 54
    ANDROID_BUILD_TOOLS_VERSION=35.0.0 \
    ANDROID_PLATFORM_VERSION=35 \
    # Gradle cache inside container
    GRADLE_USER_HOME=/root/.gradle

ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/build-tools/${ANDROID_BUILD_TOOLS_VERSION}:${PATH}"

# ── System deps ───────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    unzip \
    git \
    openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js (via NodeSource) ──────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Android command-line tools ────────────────────────────────────────────────
RUN mkdir -p "${ANDROID_HOME}/cmdline-tools" \
    && curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" \
         -o /tmp/cmdline-tools.zip \
    && unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools-raw \
    && mv /tmp/cmdline-tools-raw/cmdline-tools "${ANDROID_HOME}/cmdline-tools/latest" \
    && rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools-raw

# Accept licenses & install required SDK packages
RUN yes | sdkmanager --licenses > /dev/null 2>&1 \
    && sdkmanager \
        "platform-tools" \
        "platforms;android-${ANDROID_PLATFORM_VERSION}" \
        "build-tools;${ANDROID_BUILD_TOOLS_VERSION}"

# ── Copy project sources ──────────────────────────────────────────────────────
WORKDIR /app
COPY RunningParaCojos/ ./RunningParaCojos/

WORKDIR /app/RunningParaCojos

# ── Install JS dependencies ───────────────────────────────────────────────────
RUN npm ci --ignore-scripts

# ── Generate native Android project ──────────────────────────────────────────
# GOOGLE_MAPS_API_KEY can be passed via --build-arg or -e at runtime
ARG GOOGLE_MAPS_API_KEY=""
ENV GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}

RUN npx expo prebuild --platform android --no-install --clean

# ── Build debug APK ───────────────────────────────────────────────────────────
WORKDIR /app/RunningParaCojos/android
RUN chmod +x gradlew && ./gradlew assembleDebug --no-daemon --stacktrace

# ── Default command: show APK location ───────────────────────────────────────
CMD ["find", "/app/RunningParaCojos/android/app/build/outputs/apk", "-name", "*.apk"]
