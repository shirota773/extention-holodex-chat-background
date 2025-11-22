// Holodexページに注入されるコンテンツスクリプト

class HolodexChatManager {
  constructor() {
    this.videos = new Map();
    this.activeVideoIndex = 0;
    this.inactivityTimeout = 5000; // 5秒
    this.inactivityTimer = null;

    this.init();
  }

  init() {
    this.observeVideos();
    this.setupKeyboardShortcuts();
    console.log('[Holodex Chat Manager] 初期化完了');
  }

  // 動画要素を監視
  observeVideos() {
    const observer = new MutationObserver(() => {
      this.detectVideos();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 初回検出
    this.detectVideos();
  }

  // Holodexの動画要素を検出
  detectVideos() {
    // Holodexは通常iframeでYouTube動画を埋め込む
    const videoContainers = document.querySelectorAll('iframe[src*="youtube.com"]');

    videoContainers.forEach((iframe, index) => {
      const videoId = this.extractVideoId(iframe.src);
      if (videoId && !this.videos.has(videoId)) {
        this.registerVideo(videoId, iframe, index);
      }
    });
  }

  // YouTube動画IDを抽出
  extractVideoId(url) {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }

  // 動画を登録し、UIを追加
  registerVideo(videoId, iframe, index) {
    const container = iframe.closest('div');
    if (!container) return;

    const videoData = {
      videoId,
      iframe,
      container,
      chatOverlay: null,
      chatInput: null,
      toggleButton: null,
      chatVisible: false,
      index
    };

    this.createVideoUI(videoData);
    this.videos.set(videoId, videoData);

    // バックグラウンドに登録
    chrome.runtime.sendMessage({
      action: 'registerVideo',
      videoId,
      tabId: chrome.runtime.id
    });
  }

  // 動画UIを作成
  createVideoUI(videoData) {
    const { container, videoId } = videoData;

    // コンテナにホバーイベント
    container.classList.add('holodex-chat-container');
    container.dataset.videoId = videoId;

    // チャット入力欄を作成
    const chatInput = this.createChatInput(videoData);
    videoData.chatInput = chatInput;
    container.appendChild(chatInput);

    // トグルボタンを作成
    const toggleButton = this.createToggleButton(videoData);
    videoData.toggleButton = toggleButton;
    container.appendChild(toggleButton);

    // チャットオーバーレイを作成
    const chatOverlay = this.createChatOverlay(videoData);
    videoData.chatOverlay = chatOverlay;
    container.appendChild(chatOverlay);

    // ホバーイベント
    container.addEventListener('mouseenter', () => {
      this.showChatInput(videoData);
    });

    container.addEventListener('mouseleave', () => {
      // チャット入力欄がアクティブでない場合のみ非表示
      if (document.activeElement !== chatInput.querySelector('input')) {
        this.hideChatInput(videoData);
      }
    });
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
      this.clearInactivityTimer();
    });

    input.addEventListener('blur', () => {
      this.startInactivityTimer();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
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

    button.addEventListener('click', () => {
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
  }

  // チャット入力欄を非表示
  hideChatInput(videoData) {
    videoData.chatInput.style.display = 'none';
  }

  // チャットオーバーレイを切り替え
  toggleChatOverlay(videoData) {
    videoData.chatVisible = !videoData.chatVisible;
    videoData.chatOverlay.style.display = videoData.chatVisible ? 'block' : 'none';

    chrome.runtime.sendMessage({
      action: 'updateChatVisibility',
      videoId: videoData.videoId,
      visible: videoData.chatVisible
    });
  }

  // チャットメッセージを送信
  sendChatMessage(videoData, message) {
    if (!message.trim()) return;

    // YouTubeチャットiframeにメッセージを送信
    // 注: 実際のメッセージ送信にはYouTube APIまたはiframe内のフォームを使用する必要があります
    console.log(`[Chat] ${videoData.videoId}: ${message}`);
  }

  // キーボードショートカットを設定
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // tキーでチャット入力欄をアクティブ化
      if (e.key === 't' && !this.isInputElement(e.target)) {
        e.preventDefault();
        this.activateCurrentChatInput();
      }

      // Tabキーで次の動画に切り替え
      if (e.key === 'Tab' && !this.isInputElement(e.target)) {
        e.preventDefault();
        this.switchToNextVideo();
      }
    });
  }

  // 現在のチャット入力欄をアクティブ化
  activateCurrentChatInput() {
    const videos = Array.from(this.videos.values());
    if (videos.length === 0) return;

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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new HolodexChatManager();
  });
} else {
  new HolodexChatManager();
}
