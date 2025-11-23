// Holodexページに注入されるコンテンツスクリプト
// 本番版：デバッグログを削除

class HolodexChatManager {
  constructor() {
    this.videos = new Map();
    this.activeVideoIndex = 0;

    try {
      this.init();
    } catch (error) {
      console.error('[Holodex Chat] 初期化エラー:', error);
    }
  }

  init() {
    this.startDebugMonitoring();
    this.observeVideos();
    this.setupKeyboardShortcuts();
  }

  // デバッグモニタリング（ログなし版）
  startDebugMonitoring() {
    let checkCount = 0;
    const maxChecks = 6;

    const debugInterval = setInterval(() => {
      checkCount++;
      this.detectVideos();

      if (checkCount >= maxChecks) {
        clearInterval(debugInterval);
      }
    }, 5000);
  }

  // 動画要素を監視
  observeVideos() {
    if (!document.body) {
      setTimeout(() => this.observeVideos(), 100);
      return;
    }

    const observer = new MutationObserver(() => {
      this.detectVideos();
      this.updateUIPositions();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.detectVideos();

    window.addEventListener('resize', () => {
      this.updateUIPositions();
    });

    window.addEventListener('scroll', () => {
      this.updateUIPositions();
    }, { passive: true });
  }

  // Holodexの動画要素を検出
  detectVideos() {
    const patterns = [
      {
        name: 'YouTube iframe',
        selector: 'iframe[src*="youtube.com/embed"]',
        extract: (iframe) => this.extractVideoId(iframe.src)
      },
      {
        name: 'data-video-id',
        selector: '[data-video-id]',
        extract: (element) => element.getAttribute('data-video-id')
      }
    ];

    patterns.forEach(pattern => {
      try {
        const elements = document.querySelectorAll(pattern.selector);

        elements.forEach((element, index) => {
          const videoId = pattern.extract(element);

          if (videoId && !this.videos.has(videoId)) {
            this.registerVideo(videoId, element, index);
          }
        });
      } catch (error) {
        console.error('[Holodex Chat] 検出エラー:', error);
      }
    });
  }

  // YouTube動画IDを抽出
  extractVideoId(url) {
    if (!url) return null;

    let match = url.match(/[?&]v=([^&]+)/);
    if (match) return match[1];

    match = url.match(/\/embed\/([^?&]+)/);
    if (match) return match[1];

    match = url.match(/\/watch\/([^?&]+)/);
    if (match) return match[1];

    return null;
  }

  // 動画を登録し、UIを追加
  registerVideo(videoId, element, index) {
    const videoData = {
      videoId,
      element,
      chatOverlay: null,
      toggleButton: null,
      chatVisible: false,
      index
    };

    try {
      this.createVideoUI(videoData);
      this.videos.set(videoId, videoData);

      chrome.runtime.sendMessage({
        action: 'registerVideo',
        videoId,
        tabId: chrome.runtime.id
      });
    } catch (error) {
      console.error('[Holodex Chat] UI作成エラー:', error);
    }
  }

  // 動画UIを作成（body直下に配置）
  createVideoUI(videoData) {
    const { element, videoId } = videoData;

    // トグルボタンを作成（body直下）
    const toggleButton = this.createToggleButton(videoData);
    videoData.toggleButton = toggleButton;
    document.body.appendChild(toggleButton);

    // チャットオーバーレイを作成（body直下）
    const chatOverlay = this.createChatOverlay(videoData);
    videoData.chatOverlay = chatOverlay;
    document.body.appendChild(chatOverlay);

    // 動画要素にホバーイベント
    element.addEventListener('mouseenter', () => {
      toggleButton.style.display = 'flex';
      this.updateButtonPosition(videoData);
    });

    element.addEventListener('mouseleave', () => {
      if (!videoData.chatVisible) {
        setTimeout(() => {
          toggleButton.style.display = 'none';
        }, 1000);
      }
    });

    // 初期位置を設定
    this.updateButtonPosition(videoData);
    this.updateOverlayPosition(videoData);
  }

  // トグルボタンを作成
  createToggleButton(videoData) {
    const button = document.createElement('button');
    button.className = 'holodex-chat-toggle-button';
    button.textContent = '💬';
    button.title = 'チャット表示切り替え (tキー)';
    button.style.display = 'none';

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
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

    // iframeコンテナを作成（入力欄のみが見えるようにクリップ）
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'holodex-chat-iframe-container';

    // YouTubeチャットiframeを作成
    const chatIframe = document.createElement('iframe');
    chatIframe.src = `https://www.youtube.com/live_chat?v=${videoData.videoId}&embed_domain=${window.location.hostname}`;
    chatIframe.className = 'holodex-chat-iframe';
    chatIframe.allow = 'autoplay; encrypted-media';

    // iframe読み込み後に入力欄位置にスクロール
    chatIframe.addEventListener('load', () => {
      // iframeを下にスクロールして入力欄のみを表示
      // YouTubeチャットの入力欄は下部にあるため、上にマイナスマージンを設定
      chatIframe.style.marginTop = '-85%';
    });

    iframeContainer.appendChild(chatIframe);
    overlay.appendChild(iframeContainer);

    return overlay;
  }

  // ボタンの位置を更新
  updateButtonPosition(videoData) {
    const { element, toggleButton } = videoData;
    if (!element || !toggleButton) return;

    try {
      const rect = element.getBoundingClientRect();
      toggleButton.style.position = 'fixed';
      toggleButton.style.top = `${rect.top + 10}px`;
      toggleButton.style.left = `${rect.left + rect.width - 54}px`;
    } catch (error) {
      console.error('[Holodex Chat] ボタン位置更新エラー:', error);
    }
  }

  // オーバーレイの位置を更新
  updateOverlayPosition(videoData) {
    const { element, chatOverlay } = videoData;
    if (!element || !chatOverlay) return;

    try {
      const rect = element.getBoundingClientRect();
      chatOverlay.style.position = 'fixed';
      chatOverlay.style.top = `${rect.top}px`;
      chatOverlay.style.left = `${rect.left + rect.width - 400}px`;
      chatOverlay.style.height = `${rect.height}px`;
    } catch (error) {
      console.error('[Holodex Chat] オーバーレイ位置更新エラー:', error);
    }
  }

  // すべてのUI位置を更新
  updateUIPositions() {
    this.videos.forEach(videoData => {
      this.updateButtonPosition(videoData);
      this.updateOverlayPosition(videoData);
    });
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
    videoData.toggleButton.style.display = 'flex';
    this.updateOverlayPosition(videoData);

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

    chrome.runtime.sendMessage({
      action: 'updateChatVisibility',
      videoId: videoData.videoId,
      visible: false
    });
  }

  // キーボードショートカットを設定
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (this.isInputElement(e.target)) {
        return;
      }

      // tキーでチャットオーバーレイを表示/非表示
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        this.toggleCurrentChatOverlay();
      }

      // Tabキーで次の動画に切り替え
      if (e.key === 'Tab') {
        e.preventDefault();
        this.switchToNextVideo();
      }

      // Escキーでチャットを閉じる
      if (e.key === 'Escape') {
        this.hideAllChats();
      }
    });
  }

  // 現在のチャットオーバーレイを表示/非表示
  toggleCurrentChatOverlay() {
    const videos = Array.from(this.videos.values());

    if (videos.length === 0) {
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
function initializeExtension() {
  try {
    window.holodexChatManager = new HolodexChatManager();
  } catch (error) {
    console.error('[Holodex Chat] 初期化エラー:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}
