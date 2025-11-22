// Holodexページに注入されるコンテンツスクリプト
// 改善版：YouTubeの元のチャット入力欄を使用

console.log('[Holodex Chat Extension] スクリプト読み込み開始');
console.log('[Holodex Chat Extension] URL:', window.location.href);
console.log('[Holodex Chat Extension] readyState:', document.readyState);

class HolodexChatManager {
  constructor() {
    console.log('[HCM] コンストラクタ実行');
    this.videos = new Map();
    this.activeVideoIndex = 0;
    this.debugMode = true;

    try {
      this.init();
    } catch (error) {
      console.error('[HCM] 初期化エラー:', error);
    }
  }

  init() {
    console.log('[HCM] 初期化開始');

    // ページ構造をログ出力
    this.logPageStructure();

    // 定期的にページ構造をチェック（デバッグ用）
    this.startDebugMonitoring();

    this.observeVideos();
    this.setupKeyboardShortcuts();

    console.log('[HCM] 初期化完了');
  }

  // デバッグ用：ページ構造をログ出力
  logPageStructure() {
    console.log('[HCM Debug] === ページ構造分析 ===');

    // すべてのiframeを検出
    const allIframes = document.querySelectorAll('iframe');
    console.log('[HCM Debug] 検出されたiframe数:', allIframes.length);
    allIframes.forEach((iframe, i) => {
      console.log(`[HCM Debug] iframe[${i}]:`, {
        src: iframe.src,
        id: iframe.id,
        className: iframe.className,
        parent: iframe.parentElement?.tagName
      });
    });

    // video要素も確認
    const videoElements = document.querySelectorAll('video');
    console.log('[HCM Debug] 検出されたvideo要素数:', videoElements.length);
  }

  // デバッグモニタリングを開始
  startDebugMonitoring() {
    // 5秒ごとにページ構造を再チェック
    let checkCount = 0;
    const maxChecks = 6; // 30秒間モニタリング

    const debugInterval = setInterval(() => {
      checkCount++;
      console.log(`[HCM Debug] 定期チェック #${checkCount}`);
      this.logPageStructure();
      this.detectVideos(); // 定期的に検出を試みる

      if (checkCount >= maxChecks) {
        clearInterval(debugInterval);
        console.log('[HCM Debug] モニタリング終了');
      }
    }, 5000);
  }

  // 動画要素を監視
  observeVideos() {
    console.log('[HCM] MutationObserver開始');

    // document.bodyが存在するか確認
    if (!document.body) {
      console.warn('[HCM] document.bodyがまだ存在しません。待機します...');
      setTimeout(() => this.observeVideos(), 100);
      return;
    }

    const observer = new MutationObserver((mutations) => {
      console.log('[HCM] DOM変更検出:', mutations.length, 'mutations');
      this.detectVideos();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 初回検出
    console.log('[HCM] 初回検出実行');
    this.detectVideos();
  }

  // Holodexの動画要素を検出
  detectVideos() {
    console.log('[HCM] detectVideos() 実行');

    // 複数のパターンで検出を試みる
    const patterns = [
      // パターン1: YouTube埋め込みiframe
      {
        name: 'YouTube iframe',
        selector: 'iframe[src*="youtube.com/embed"]',
        extract: (iframe) => this.extractVideoId(iframe.src)
      },
      // パターン2: data-video-id属性
      {
        name: 'data-video-id',
        selector: '[data-video-id]',
        extract: (element) => element.getAttribute('data-video-id')
      }
    ];

    let totalFound = 0;

    patterns.forEach(pattern => {
      try {
        const elements = document.querySelectorAll(pattern.selector);
        console.log(`[HCM] ${pattern.name}: ${elements.length}個の要素を検出`);

        elements.forEach((element, index) => {
          const videoId = pattern.extract(element);
          console.log(`[HCM] ${pattern.name}[${index}] videoId:`, videoId);

          if (videoId && !this.videos.has(videoId)) {
            console.log(`[HCM] 新しい動画を登録: ${videoId}`);
            this.registerVideo(videoId, element, totalFound);
            totalFound++;
          }
        });
      } catch (error) {
        console.error(`[HCM] ${pattern.name} 検出エラー:`, error);
      }
    });

    console.log(`[HCM] 合計 ${totalFound} 個の新しい動画を検出`);
    console.log(`[HCM] 現在管理中の動画数: ${this.videos.size}`);
  }

  // YouTube動画IDを抽出
  extractVideoId(url) {
    if (!url) return null;

    // パターン1: ?v=VIDEO_ID
    let match = url.match(/[?&]v=([^&]+)/);
    if (match) return match[1];

    // パターン2: /embed/VIDEO_ID
    match = url.match(/\/embed\/([^?&]+)/);
    if (match) return match[1];

    // パターン3: /watch/VIDEO_ID
    match = url.match(/\/watch\/([^?&]+)/);
    if (match) return match[1];

    return null;
  }

  // 動画を登録し、UIを追加
  registerVideo(videoId, element, index) {
    console.log(`[HCM] registerVideo(): ${videoId}`);

    // 親コンテナを探す
    let container = element.closest('div');

    // コンテナが見つからない場合は、要素を直接ラップ
    if (!container) {
      console.warn(`[HCM] コンテナが見つかりません。要素の親を使用します`);
      container = element.parentElement;
      if (!container) {
        console.error(`[HCM] 親要素が見つかりません。スキップします`);
        return;
      }
    }

    console.log(`[HCM] コンテナ:`, container);

    const videoData = {
      videoId,
      element,
      container,
      chatOverlay: null,
      toggleButton: null,
      chatVisible: false,
      index
    };

    try {
      this.createVideoUI(videoData);
      this.videos.set(videoId, videoData);
      console.log(`[HCM] 動画登録成功: ${videoId}`);

      // バックグラウンドに登録
      chrome.runtime.sendMessage({
        action: 'registerVideo',
        videoId,
        tabId: chrome.runtime.id
      }, (response) => {
        console.log('[HCM] バックグラウンド登録応答:', response);
      });
    } catch (error) {
      console.error(`[HCM] UI作成エラー (${videoId}):`, error);
    }
  }

  // 動画UIを作成
  createVideoUI(videoData) {
    console.log(`[HCM] createVideoUI(): ${videoData.videoId}`);
    const { container, videoId } = videoData;

    // コンテナが既にrelativeでない場合のみ設定
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.classList.add('holodex-chat-container');
    container.dataset.videoId = videoId;

    // トグルボタンを作成
    const toggleButton = this.createToggleButton(videoData);
    videoData.toggleButton = toggleButton;
    container.appendChild(toggleButton);
    console.log(`[HCM] トグルボタン追加: ${videoId}`);

    // チャットオーバーレイを作成
    const chatOverlay = this.createChatOverlay(videoData);
    videoData.chatOverlay = chatOverlay;
    container.appendChild(chatOverlay);
    console.log(`[HCM] チャットオーバーレイ追加: ${videoId}`);

    // ホバーでトグルボタンを表示
    let hoverTimeout;
    container.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      console.log(`[HCM] マウスエンター: ${videoId}`);
      toggleButton.style.opacity = '1';
    });

    container.addEventListener('mouseleave', () => {
      console.log(`[HCM] マウスリーブ: ${videoId}`);
      // チャットが表示されていない場合のみボタンを隠す
      if (!videoData.chatVisible) {
        hoverTimeout = setTimeout(() => {
          toggleButton.style.opacity = '0';
        }, 1000);
      }
    });

    console.log(`[HCM] UI作成完了: ${videoId}`);
  }

  // トグルボタンを作成
  createToggleButton(videoData) {
    const button = document.createElement('button');
    button.className = 'holodex-chat-toggle-button';
    button.textContent = '💬';
    button.title = 'チャット表示切り替え (tキー)';
    button.style.opacity = '0'; // 初期状態は非表示

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log(`[HCM] トグルボタンクリック: ${videoData.videoId}`);
      this.toggleChatOverlay(videoData);
    });

    return button;
  }

  // チャットオーバーレイを作成
  createChatOverlay(videoData) {
    const overlay = document.createElement('div');
    overlay.className = 'holodex-chat-overlay';
    overlay.style.display = 'none';

    // 閉じるボタンを追加
    const closeButton = document.createElement('button');
    closeButton.className = 'holodex-chat-close-button';
    closeButton.textContent = '×';
    closeButton.title = '閉じる (Esc)';
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideChatOverlay(videoData);
    });
    overlay.appendChild(closeButton);

    // YouTubeチャットiframeを作成
    const chatIframe = document.createElement('iframe');
    chatIframe.src = `https://www.youtube.com/live_chat?v=${videoData.videoId}&embed_domain=${window.location.hostname}`;
    chatIframe.className = 'holodex-chat-iframe';
    chatIframe.allow = 'autoplay; encrypted-media';

    overlay.appendChild(chatIframe);
    return overlay;
  }

  // チャットオーバーレイを切り替え
  toggleChatOverlay(videoData) {
    if (videoData.chatVisible) {
      this.hideChatOverlay(videoData);
    } else {
      this.showChatOverlay(videoData);
    }
  }

  // チャットオーバーレイを表示
  showChatOverlay(videoData) {
    // 他のすべてのチャットを非表示
    this.videos.forEach((data, id) => {
      if (id !== videoData.videoId && data.chatVisible) {
        this.hideChatOverlay(data);
      }
    });

    videoData.chatVisible = true;
    videoData.chatOverlay.style.display = 'flex';
    videoData.toggleButton.style.opacity = '1';
    console.log(`[HCM] チャットオーバーレイ表示: ${videoData.videoId}`);

    chrome.runtime.sendMessage({
      action: 'updateChatVisibility',
      videoId: videoData.videoId,
      visible: true
    });
  }

  // チャットオーバーレイを非表示
  hideChatOverlay(videoData) {
    videoData.chatVisible = false;
    videoData.chatOverlay.style.display = 'none';
    console.log(`[HCM] チャットオーバーレイ非表示: ${videoData.videoId}`);

    chrome.runtime.sendMessage({
      action: 'updateChatVisibility',
      videoId: videoData.videoId,
      visible: false
    });
  }

  // キーボードショートカットを設定
  setupKeyboardShortcuts() {
    console.log('[HCM] キーボードショートカット設定');

    document.addEventListener('keydown', (e) => {
      // 入力欄にフォーカスがある場合はショートカットを無効化
      if (this.isInputElement(e.target)) {
        return;
      }

      // tキーでチャットオーバーレイを表示/非表示
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        console.log('[HCM] tキー押下');
        this.toggleCurrentChatOverlay();
      }

      // Tabキーで次の動画に切り替え
      if (e.key === 'Tab') {
        e.preventDefault();
        console.log('[HCM] Tabキー押下');
        this.switchToNextVideo();
      }

      // Escキーでチャットを閉じる
      if (e.key === 'Escape') {
        console.log('[HCM] Escキー押下');
        this.hideAllChats();
      }
    });
  }

  // 現在のチャットオーバーレイを表示/非表示
  toggleCurrentChatOverlay() {
    const videos = Array.from(this.videos.values());
    console.log(`[HCM] toggleCurrentChatOverlay() - 動画数: ${videos.length}`);

    if (videos.length === 0) {
      console.warn('[HCM] 動画が見つかりません');
      return;
    }

    const currentVideo = videos[this.activeVideoIndex % videos.length];
    this.toggleChatOverlay(currentVideo);
  }

  // 次の動画に切り替え
  switchToNextVideo() {
    const videos = Array.from(this.videos.values());
    if (videos.length === 0) return;

    // 現在のチャットを非表示
    const currentVideo = videos[this.activeVideoIndex % videos.length];
    if (currentVideo.chatVisible) {
      this.hideChatOverlay(currentVideo);
    }

    // 次の動画に切り替え
    this.activeVideoIndex = (this.activeVideoIndex + 1) % videos.length;
    console.log(`[HCM] 動画切り替え: インデックス ${this.activeVideoIndex}`);

    // 新しい動画のチャットを表示
    const nextVideo = videos[this.activeVideoIndex % videos.length];
    this.showChatOverlay(nextVideo);
  }

  // すべてのチャットを非表示
  hideAllChats() {
    this.videos.forEach(videoData => {
      if (videoData.chatVisible) {
        this.hideChatOverlay(videoData);
      }
    });
  }

  // 入力要素かチェック
  isInputElement(element) {
    return element.tagName === 'INPUT' ||
           element.tagName === 'TEXTAREA' ||
           element.isContentEditable;
  }
}

// ページ読み込み時に初期化
console.log('[Holodex Chat Extension] 初期化準備');

function initializeExtension() {
  console.log('[Holodex Chat Extension] initializeExtension() 実行');
  try {
    window.holodexChatManager = new HolodexChatManager();
    console.log('[Holodex Chat Extension] HolodexChatManager インスタンス作成完了');
  } catch (error) {
    console.error('[Holodex Chat Extension] 初期化エラー:', error);
  }
}

if (document.readyState === 'loading') {
  console.log('[Holodex Chat Extension] DOMContentLoaded待機中...');
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  console.log('[Holodex Chat Extension] 即座に初期化');
  initializeExtension();
}

console.log('[Holodex Chat Extension] スクリプト読み込み完了');
