// Holodexページに注入されるコンテンツスクリプト
// デバッグ版：詳細なログを出力

console.log('[Holodex Chat Extension] スクリプト読み込み開始');
console.log('[Holodex Chat Extension] URL:', window.location.href);
console.log('[Holodex Chat Extension] readyState:', document.readyState);

class HolodexChatManager {
  constructor() {
    console.log('[HCM] コンストラクタ実行');
    this.videos = new Map();
    this.activeVideoIndex = 0;
    this.inactivityTimeout = 5000; // 5秒
    this.inactivityTimer = null;
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
    videoElements.forEach((video, i) => {
      console.log(`[HCM Debug] video[${i}]:`, {
        src: video.src,
        id: video.id,
        className: video.className
      });
    });

    // 特定のクラスやIDを持つ要素を検索
    const commonSelectors = [
      '.video-container',
      '.player',
      '[class*="video"]',
      '[class*="player"]',
      '[id*="video"]',
      '[id*="player"]'
    ];

    commonSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`[HCM Debug] "${selector}" 要素数:`, elements.length);
        }
      } catch (e) {
        // セレクタエラーは無視
      }
    });
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
        selector: 'iframe[src*="youtube.com"]',
        extract: (iframe) => this.extractVideoId(iframe.src)
      },
      // パターン2: YouTube埋め込みiframe (youtu.be)
      {
        name: 'YouTube iframe (youtu.be)',
        selector: 'iframe[src*="youtu.be"]',
        extract: (iframe) => this.extractVideoIdFromShortUrl(iframe.src)
      },
      // パターン3: データ属性
      {
        name: 'data-video-id',
        selector: '[data-video-id]',
        extract: (element) => element.getAttribute('data-video-id')
      },
      // パターン4: すべてのiframe
      {
        name: 'All iframes',
        selector: 'iframe',
        extract: (iframe) => this.extractVideoId(iframe.src)
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

  // 短縮URL (youtu.be) から動画IDを抽出
  extractVideoIdFromShortUrl(url) {
    if (!url) return null;
    const match = url.match(/youtu\.be\/([^?&]+)/);
    return match ? match[1] : null;
  }

  // 動画を登録し、UIを追加
  registerVideo(videoId, element, index) {
    console.log(`[HCM] registerVideo(): ${videoId}`);

    // 親コンテナを探す
    let container = element.closest('div');

    // コンテナが見つからない場合は、要素を直接ラップ
    if (!container) {
      console.warn(`[HCM] コンテナが見つかりません。要素を作成します`);
      container = document.createElement('div');
      container.className = 'holodex-chat-wrapper';
      element.parentNode?.insertBefore(container, element);
      container.appendChild(element);
    }

    console.log(`[HCM] コンテナ:`, container);

    const videoData = {
      videoId,
      iframe: element,
      container,
      chatOverlay: null,
      chatInput: null,
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

    // コンテナにスタイルを追加
    container.style.position = 'relative';
    container.classList.add('holodex-chat-container');
    container.dataset.videoId = videoId;

    // チャット入力欄を作成
    const chatInput = this.createChatInput(videoData);
    videoData.chatInput = chatInput;
    container.appendChild(chatInput);
    console.log(`[HCM] チャット入力欄追加: ${videoId}`);

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

    // ホバーイベント
    container.addEventListener('mouseenter', () => {
      console.log(`[HCM] マウスエンター: ${videoId}`);
      this.showChatInput(videoData);
    });

    container.addEventListener('mouseleave', () => {
      console.log(`[HCM] マウスリーブ: ${videoId}`);
      if (document.activeElement !== chatInput.querySelector('input')) {
        this.hideChatInput(videoData);
      }
    });

    console.log(`[HCM] UI作成完了: ${videoId}`);
  }

  // チャット入力欄を作成
  createChatInput(videoData) {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'holodex-chat-input-container';
    inputContainer.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'holodex-chat-input';
    input.placeholder = 'チャットを入力...';

    input.addEventListener('focus', () => {
      console.log(`[HCM] 入力欄フォーカス: ${videoData.videoId}`);
      this.clearInactivityTimer();
    });

    input.addEventListener('blur', () => {
      console.log(`[HCM] 入力欄ブラー: ${videoData.videoId}`);
      this.startInactivityTimer();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        console.log(`[HCM] Enterキー押下: ${videoData.videoId}`);
        this.sendChatMessage(videoData, input.value);
        input.value = '';
      }
    });

    inputContainer.appendChild(input);
    return inputContainer;
  }

  // トグルボタンを作成
  createToggleButton(videoData) {
    const button = document.createElement('button');
    button.className = 'holodex-chat-toggle-button';
    button.textContent = '💬';
    button.title = 'チャット表示切り替え';

    button.addEventListener('click', (e) => {
      e.stopPropagation();
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

    // YouTubeチャットiframeを作成
    const chatIframe = document.createElement('iframe');
    chatIframe.src = `https://www.youtube.com/live_chat?v=${videoData.videoId}&embed_domain=${window.location.hostname}`;
    chatIframe.className = 'holodex-chat-iframe';

    overlay.appendChild(chatIframe);
    return overlay;
  }

  // チャット入力欄を表示
  showChatInput(videoData) {
    videoData.chatInput.style.display = 'block';
    console.log(`[HCM] チャット入力欄表示: ${videoData.videoId}`);
  }

  // チャット入力欄を非表示
  hideChatInput(videoData) {
    videoData.chatInput.style.display = 'none';
    console.log(`[HCM] チャット入力欄非表示: ${videoData.videoId}`);
  }

  // チャットオーバーレイを切り替え
  toggleChatOverlay(videoData) {
    videoData.chatVisible = !videoData.chatVisible;
    videoData.chatOverlay.style.display = videoData.chatVisible ? 'block' : 'none';
    console.log(`[HCM] チャットオーバーレイ: ${videoData.chatVisible ? '表示' : '非表示'}`);

    chrome.runtime.sendMessage({
      action: 'updateChatVisibility',
      videoId: videoData.videoId,
      visible: videoData.chatVisible
    });
  }

  // チャットメッセージを送信
  sendChatMessage(videoData, message) {
    if (!message.trim()) return;
    console.log(`[HCM] チャット送信: ${videoData.videoId} - ${message}`);
  }

  // キーボードショートカットを設定
  setupKeyboardShortcuts() {
    console.log('[HCM] キーボードショートカット設定');

    document.addEventListener('keydown', (e) => {
      // tキーでチャット入力欄をアクティブ化
      if (e.key === 't' && !this.isInputElement(e.target)) {
        e.preventDefault();
        console.log('[HCM] tキー押下');
        this.activateCurrentChatInput();
      }

      // Tabキーで次の動画に切り替え
      if (e.key === 'Tab' && !this.isInputElement(e.target)) {
        e.preventDefault();
        console.log('[HCM] Tabキー押下');
        this.switchToNextVideo();
      }
    });
  }

  // 現在のチャット入力欄をアクティブ化
  activateCurrentChatInput() {
    const videos = Array.from(this.videos.values());
    console.log(`[HCM] activateCurrentChatInput() - 動画数: ${videos.length}`);

    if (videos.length === 0) {
      console.warn('[HCM] 動画が見つかりません');
      return;
    }

    const currentVideo = videos[this.activeVideoIndex % videos.length];
    const input = currentVideo.chatInput.querySelector('input');

    this.showChatInput(currentVideo);
    input.focus();
    this.startInactivityTimer();
  }

  // 次の動画に切り替え
  switchToNextVideo() {
    const videos = Array.from(this.videos.values());
    if (videos.length === 0) return;

    this.activeVideoIndex = (this.activeVideoIndex + 1) % videos.length;
    console.log(`[HCM] 動画切り替え: インデックス ${this.activeVideoIndex}`);
    this.activateCurrentChatInput();
  }

  // 入力要素かチェック
  isInputElement(element) {
    return element.tagName === 'INPUT' ||
           element.tagName === 'TEXTAREA' ||
           element.isContentEditable;
  }

  // 非アクティブタイマーを開始
  startInactivityTimer() {
    this.clearInactivityTimer();

    this.inactivityTimer = setTimeout(() => {
      console.log('[HCM] 非アクティブタイマー発動');
      const videos = Array.from(this.videos.values());
      videos.forEach(video => {
        this.hideChatInput(video);
      });
    }, this.inactivityTimeout);
  }

  // 非アクティブタイマーをクリア
  clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
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
