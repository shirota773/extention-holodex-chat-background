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

  // YouTubeからチャンネルIDを取得（oembed API使用）
  async fetchChannelId(videoId) {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (!response.ok) {
        console.error(`[Holodex Chat] ${videoId}: oEmbed API失敗`);
        return null;
      }
      const data = await response.json();

      // author_urlからチャンネルIDを抽出
      // 例: "https://www.youtube.com/@ChannelName" または "https://www.youtube.com/channel/UCxxxxx"
      const authorUrl = data.author_url;
      if (authorUrl) {
        const channelMatch = authorUrl.match(/\/channel\/([^\/\?]+)/);
        if (channelMatch) {
          console.log(`[Holodex Chat] ${videoId}: チャンネルID取得成功: ${channelMatch[1]}`);
          return channelMatch[1];
        }

        // @ハンドル形式の場合、残念ながらチャンネルIDは取得できない
        // この場合は別の方法が必要
        console.log(`[Holodex Chat] ${videoId}: author_urlがハンドル形式: ${authorUrl}`);
        return null;
      }

      return null;
    } catch (error) {
      console.error(`[Holodex Chat] ${videoId}: チャンネルID取得エラー:`, error);
      return null;
    }
  }

  // Continuationトークンを生成（簡易版）
  generateContinuationToken(videoId, channelId) {
    try {
      // Base64url エンコード用ヘルパー
      const base64urlEncode = (bytes) => {
        const base64 = btoa(String.fromCharCode.apply(null, bytes));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      };

      // Varintエンコード
      const encodeVarint = (num) => {
        const result = [];
        while (num > 127) {
          result.push((num & 127) | 128);
          num >>>= 7;
        }
        result.push(num);
        return result;
      };

      // フィールドヘッダー
      const fieldHeader = (fieldNum, wireType) => {
        return encodeVarint((fieldNum << 3) | wireType);
      };

      // 文字列フィールド
      const stringField = (fieldNum, str) => {
        const bytes = new TextEncoder().encode(str);
        return [...fieldHeader(fieldNum, 2), ...encodeVarint(bytes.length), ...Array.from(bytes)];
      };

      // varintフィールド
      const varintField = (fieldNum, value) => {
        return [...fieldHeader(fieldNum, 0), ...encodeVarint(value)];
      };

      // 埋め込みメッセージフィールド
      const messageField = (fieldNum, messageBytes) => {
        return [...fieldHeader(fieldNum, 2), ...encodeVarint(messageBytes.length), ...messageBytes];
      };

      // チャンネル+動画IDの内部メッセージ
      const cvPair = [
        ...stringField(1, channelId),
        ...stringField(3, videoId)
      ];

      // メイン構造
      const message = [
        ...messageField(3, cvPair),
        ...varintField(8, 1),
        ...messageField(11, varintField(2, 0)), // seekMs = 0
        ...messageField(14, varintField(1, 1)), // chatType = 1
        ...varintField(15, 1)
      ];

      // field 156074452 でラップ
      const wrapped = messageField(156074452, message);

      const token = base64urlEncode(wrapped);
      console.log(`[Holodex Chat] ${videoId}: continuationトークン生成: ${token.substring(0, 30)}...`);
      return token;
    } catch (error) {
      console.error(`[Holodex Chat] ${videoId}: トークン生成エラー:`, error);
      return null;
    }
  }

  // 動画を登録し、UIを追加
  registerVideo(videoId, element, index) {
    console.log(`[Holodex Chat] 動画を登録: ${videoId} (index: ${index})`);

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

      console.log(`[Holodex Chat] 動画登録完了: ${videoId}, 総動画数: ${this.videos.size}`);

      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'registerVideo',
          videoId,
          tabId: chrome.runtime.id
        });
      }
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

    // iframeコンテナを作成
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'holodex-chat-iframe-container';

    // YouTubeチャットiframeを作成 - 自動フォールバック機能付き
    const baseUrl = window.location.hostname;
    const liveUrl = `https://www.youtube.com/live_chat?v=${videoData.videoId}&embed_domain=${baseUrl}`;
    const replayUrl = `https://www.youtube.com/live_chat_replay?v=${videoData.videoId}&embed_domain=${baseUrl}`;

    console.log(`[Holodex Chat] Video ID: ${videoData.videoId}`);

    // デフォルトはlive_chatを使用（ライブ配信に対応）
    // アーカイブの場合は自動的にreplayにフォールバック
    const primaryUrl = liveUrl;
    const fallbackUrl = replayUrl;

    const chatIframe = document.createElement('iframe');
    chatIframe.className = 'holodex-chat-iframe';
    chatIframe.allow = 'autoplay; encrypted-media';
    chatIframe.src = primaryUrl;

    console.log(`[Holodex Chat] ${videoData.videoId}: 初回試行 - ライブチャットURL: ${primaryUrl}`);

    // フォールバック処理用のタイマー
    let loadCheckTimer = null;
    let hasTriedFallback = false;

    const tryFallback = async () => {
      if (!hasTriedFallback) {
        hasTriedFallback = true;
        console.log(`[Holodex Chat] ${videoData.videoId}: フォールバック試行 - アーカイブチャット取得開始`);

        // チャンネルIDを取得
        const channelId = await this.fetchChannelId(videoData.videoId);

        if (channelId) {
          // Continuationトークン生成
          const continuation = this.generateContinuationToken(videoData.videoId, channelId);

          if (continuation) {
            // 完全なアーカイブチャットURL
            const archiveUrl = `https://www.youtube.com/live_chat_replay?v=${videoData.videoId}&embed_domain=${baseUrl}&c=${channelId}&continuation=${continuation}`;
            console.log(`[Holodex Chat] ${videoData.videoId}: アーカイブURL生成成功`);
            chatIframe.src = archiveUrl;
          } else {
            // continuationなしで試行
            const archiveUrl = `https://www.youtube.com/live_chat_replay?v=${videoData.videoId}&embed_domain=${baseUrl}&c=${channelId}`;
            console.log(`[Holodex Chat] ${videoData.videoId}: アーカイブURL（continuation無し）`);
            chatIframe.src = archiveUrl;
          }
        } else {
          // チャンネルID取得失敗時、通常のリプレイURLで試行
          console.log(`[Holodex Chat] ${videoData.videoId}: チャンネルID取得失敗、基本リプレイURL使用`);
          chatIframe.src = fallbackUrl;
        }
      }
    };

    // iframe読み込み完了イベント
    chatIframe.addEventListener('load', () => {
      // タイマーをクリア
      if (loadCheckTimer) {
        clearTimeout(loadCheckTimer);
        loadCheckTimer = null;
      }

      // 読み込み成功を確認（2秒後にチェック）
      setTimeout(() => {
        try {
          // iframeのコンテンツが空または読み込みエラーの場合、フォールバックを試行
          const iframeDoc = chatIframe.contentDocument || chatIframe.contentWindow?.document;

          // アクセスできない場合（CORS）も、念のため少し待ってからフォールバック判定
          if (!iframeDoc) {
            console.log(`[Holodex Chat] ${videoData.videoId}: CORS保護により内容確認不可、2秒後にフォールバック判定`);
            // CORS保護の場合、さらに2秒待ってからフォールバックを試行
            setTimeout(() => {
              if (!hasTriedFallback) {
                console.log(`[Holodex Chat] ${videoData.videoId}: アーカイブの可能性あり、フォールバック試行`);
                tryFallback();
              }
            }, 2000);
            return;
          }

          // ドキュメントが空の場合はフォールバック
          const bodyText = iframeDoc.body?.innerText || '';
          if (bodyText.length < 50 && !hasTriedFallback) {
            console.log(`[Holodex Chat] ${videoData.videoId}: コンテンツが不十分、フォールバック試行`);
            tryFallback();
          } else {
            console.log(`[Holodex Chat] ${videoData.videoId}: チャット読み込み成功`);
          }
        } catch (e) {
          // CORS エラーの場合も、念のためフォールバックを試行
          console.log(`[Holodex Chat] ${videoData.videoId}: CORS保護、2秒後にフォールバック判定`);
          setTimeout(() => {
            if (!hasTriedFallback) {
              console.log(`[Holodex Chat] ${videoData.videoId}: アーカイブの可能性あり、フォールバック試行`);
              tryFallback();
            }
          }, 2000);
        }
      }, 2000);
    });

    // iframeエラーイベント
    chatIframe.addEventListener('error', (e) => {
      console.error(`[Holodex Chat] ${videoData.videoId}: iframeエラー、フォールバック試行`, e);
      tryFallback();
    });

    // 6秒経っても読み込みが完了しない場合、フォールバックを試行
    loadCheckTimer = setTimeout(() => {
      if (!hasTriedFallback) {
        console.log(`[Holodex Chat] ${videoData.videoId}: タイムアウト（6秒）、フォールバック試行`);
        tryFallback();
      }
    }, 6000);

    iframeContainer.appendChild(chatIframe);
    overlay.appendChild(iframeContainer);

    // videoDataにiframeを保存
    videoData.chatIframe = chatIframe;
    videoData.liveUrl = liveUrl;
    videoData.replayUrl = replayUrl;
    videoData.loadCheckTimer = loadCheckTimer;

    return overlay;
  }

  // チャットURLを取得（ライブ/アーカイブを判定）
  async getChatUrl(videoId) {
    const baseUrl = window.location.hostname;

    const liveUrl = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${baseUrl}`;
    const replayUrl = `https://www.youtube.com/live_chat_replay?v=${videoId}&embed_domain=${baseUrl}`;

    try {
      // ページ内の要素から判定を試みる
      const isLive = this.checkIfVideoIsLive(videoId);
      const selectedUrl = isLive ? liveUrl : replayUrl;

      console.log(`[Holodex Chat] Video ${videoId}: ${isLive ? 'LIVE' : 'ARCHIVE'} - Using ${selectedUrl}`);
      return selectedUrl;
    } catch (error) {
      console.error('[Holodex Chat] URL判定エラー:', error);
      // デフォルトはアーカイブチャット（replayUrl）
      return replayUrl;
    }
  }

  // 動画がライブ配信中かチェック
  checkIfVideoIsLive(videoId) {
    // Holodexページ内の要素からライブ状態を判定

    // 1. iframe要素のURLをチェック
    const iframes = document.querySelectorAll('iframe[src*="youtube.com"]');
    for (const iframe of iframes) {
      const src = iframe.src;
      if (src.includes(videoId)) {
        if (src.includes('/live/')) {
          console.log(`[Holodex Chat] ${videoId}: LIVE detected from iframe URL (${src})`);
          return true;
        }
        console.log(`[Holodex Chat] ${videoId}: iframe found but not /live/ (${src})`);
      }
    }

    // 2. ページ内の動画情報をチェック
    const videoElements = document.querySelectorAll(`[data-video-id="${videoId}"]`);
    for (const element of videoElements) {
      const dataStatus = element.getAttribute('data-status');
      const hasLiveClass = element.classList.contains('live');
      const hasLiveParent = element.closest('[class*="live"]') !== null;

      console.log(`[Holodex Chat] ${videoId}: data-status="${dataStatus}", hasLiveClass=${hasLiveClass}, hasLiveParent=${hasLiveParent}`);

      if (dataStatus === 'live' || hasLiveClass || hasLiveParent) {
        console.log(`[Holodex Chat] ${videoId}: LIVE detected from element attributes`);
        return true;
      }
    }

    // 3. LIVEバッジの存在をチェック（より厳密に）
    const liveBadges = document.querySelectorAll('.badge-live, .live-badge, [class*="LiveBadge"]');
    if (liveBadges.length > 0) {
      console.log(`[Holodex Chat] ${videoId}: LIVE detected from ${liveBadges.length} badges`);
      return true;
    }

    // 4. ページURLをチェック
    const url = window.location.href;
    if (url.includes('/watch') && !url.includes('type=stream')) {
      console.log(`[Holodex Chat] ${videoId}: ARCHIVE detected from URL pattern (${url})`);
      return false;
    }

    // デフォルトはアーカイブとして扱う（チャットリプレイを試す）
    console.log(`[Holodex Chat] ${videoId}: Defaulting to ARCHIVE (no indicators found)`);
    return false;
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
    console.log(`[Holodex Chat] チャットオーバーレイを表示: ${videoData.videoId}`);

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

    console.log(`[Holodex Chat] チャットオーバーレイ表示完了: ${videoData.videoId}`);

    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'updateChatVisibility',
        videoId: videoData.videoId,
        visible: true
      });
    }
  }

  // チャットオーバーレイを非表示
  hideChatOverlay(videoData) {
    videoData.chatVisible = false;
    videoData.chatOverlay.style.display = 'none';

    // タイマーのクリーンアップ
    if (videoData.loadCheckTimer) {
      clearTimeout(videoData.loadCheckTimer);
      videoData.loadCheckTimer = null;
    }

    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'updateChatVisibility',
        videoId: videoData.videoId,
        visible: false
      });
    }
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
  console.log('[Holodex Chat] ========================================');
  console.log('[Holodex Chat] 拡張機能の初期化を開始');
  console.log('[Holodex Chat] ページURL:', window.location.href);
  console.log('[Holodex Chat] ホスト名:', window.location.hostname);
  console.log('[Holodex Chat] ========================================');

  try {
    window.holodexChatManager = new HolodexChatManager();
    console.log('[Holodex Chat] HolodexChatManager初期化完了');
  } catch (error) {
    console.error('[Holodex Chat] 初期化エラー:', error);
  }
}

if (document.readyState === 'loading') {
  console.log('[Holodex Chat] DOMContentLoadedを待機中...');
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  console.log('[Holodex Chat] DOMは既に読み込み済み、即座に初期化');
  initializeExtension();
}
