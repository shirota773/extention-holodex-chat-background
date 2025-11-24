// バックグラウンドサービスワーカー
// 各動画のチャット状態を管理

const chatStates = new Map();

// X-Frame-Optionsヘッダーを削除してYouTubeチャットの埋め込みを可能にする
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Holodex Chat] 拡張機能インストール完了、declarativeNetRequestルール設定');

  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            header: 'X-Frame-Options',
            operation: 'remove'
          }
        ]
      },
      condition: {
        urlFilter: '*://www.youtube.com/live_chat*',
        resourceTypes: ['sub_frame']
      }
    }
  ];

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: rules
  }).then(() => {
    console.log('[Holodex Chat] declarativeNetRequestルール適用完了');
  }).catch((error) => {
    console.error('[Holodex Chat] declarativeNetRequestルール適用エラー:', error);
  });
});

// チャット状態の管理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'registerVideo':
      registerVideo(request.videoId, request.tabId);
      sendResponse({ success: true });
      break;

    case 'getChat':
      const chatState = chatStates.get(request.videoId);
      sendResponse({ chatState });
      break;

    case 'updateChatVisibility':
      updateChatVisibility(request.videoId, request.visible);
      sendResponse({ success: true });
      break;

    case 'removeVideo':
      chatStates.delete(request.videoId);
      sendResponse({ success: true });
      break;
  }
  return true;
});

function registerVideo(videoId, tabId) {
  if (!chatStates.has(videoId)) {
    chatStates.set(videoId, {
      videoId,
      tabId,
      visible: false,
      lastActivity: Date.now()
    });
  }
}

function updateChatVisibility(videoId, visible) {
  const state = chatStates.get(videoId);
  if (state) {
    state.visible = visible;
    state.lastActivity = Date.now();
  }
}

// 定期的に古いチャット状態をクリーンアップ
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30分

  for (const [videoId, state] of chatStates.entries()) {
    if (now - state.lastActivity > timeout) {
      chatStates.delete(videoId);
    }
  }
}, 5 * 60 * 1000); // 5分ごとにチェック
