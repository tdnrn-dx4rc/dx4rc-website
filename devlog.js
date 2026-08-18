/**
 * devlog.js
 * 開発ログ & つぶやきの動的描画・管理者認証・削除スクリプト
 */

// GAS（Google Apps Script）のWebアプリURL
const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzqJ725NV-30PS6kh05E_x1MX85nf5nWrvau0JYhSUEFUWHdXXI53ODHN74RmGZWXsr/exec';

let allDevlogs = [];
let isAdmin = false;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const adminParam = urlParams.get('admin') === 'true';

  // ?admin=true アクセス時にGAS通信認証を実施
  if (adminParam) {
    isAdmin = await authenticateAdmin();
    if (isAdmin) {
      const adminForm = document.getElementById('devlogAdminForm');
      if (adminForm) adminForm.style.display = 'block';
    } else {
      // 認証失敗時はURLから ?admin=true を削除
      history.replaceState(null, '', window.location.pathname);
    }
  }

  setupDevlogPost();

  // GASから最新ログデータを取得して描画
  allDevlogs = await fetchDevlogData();
  renderDevlogs(allDevlogs);
});

// スプレッドシート(GAS)と通信して管理者照合
async function authenticateAdmin() {
  if (sessionStorage.getItem('dx4rc_admin_authed') === 'true') {
    return true;
  }

  const inputPassword = prompt('🔒 管理者パスワードを入力してください:');
  if (!inputPassword) return false;

  try {
    const res = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'verify_admin',
        password: inputPassword
      })
    });

    const data = await res.json();

    if (data.status === 'success') {
      sessionStorage.setItem('dx4rc_admin_authed', 'true');
      alert('管理者モードでログインしました。');
      return true;
    } else {
      alert('パスワードが違います。');
      return false;
    }
  } catch (err) {
    alert('認証処理中に通信エラーが発生しました。');
    return false;
  }
}

// GAS (doGet) からログデータを取得
async function fetchDevlogData() {
  try {
    const res = await fetch(`${GAS_WEBHOOK_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Devlog データの取得に失敗しました:', err);
    return [];
  }
}

// ログの描画
function renderDevlogs(items) {
  const container = document.getElementById('devlogContainer') || document.getElementById('devlogGrid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p style="color:var(--color-text-muted); text-align:center; grid-column:1/-1;">ログメッセージはありません。</p>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const isSlack = item.type === 'micro' || item.type === 'slack';
    const badgeHTML = isSlack
      ? `<span style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; font-weight:bold; padding:2px 8px; border-radius:12px;">💬 つぶやき</span>`
      : `<span style="background:#f3e8ff; color:#6b21a8; font-size:0.75rem; font-weight:bold; padding:2px 8px; border-radius:12px;">📝 開発記録</span>`;

    const titleHTML = item.title ? `<h3 style="font-size:1.1rem; margin-top:0.4rem; margin-bottom:0.4rem;">${item.title}</h3>` : '';

    const timestampStr = item.date ? new Date(item.date).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

    const deleteBtnHTML = isAdmin ? `
      <button onclick="deleteDevlogItem('${item.date}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; cursor:pointer; margin-left:8px;">
        🗑 削除
      </button>
    ` : '';

    return `
      <article class="card" style="padding:1.25rem; margin-bottom:1rem; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <div style="display:flex; align-items:center;">
            ${badgeHTML}
            <span style="font-size:0.8rem; color:var(--color-text-muted); margin-left:8px;">${timestampStr}</span>
          </div>
          ${deleteBtnHTML}
        </div>
        ${titleHTML}
        <p style="color:var(--color-text); font-size:0.95rem; line-height:1.6; white-space:pre-wrap; margin:0;">${item.body || item.content || ''}</p>
      </article>
    `;
  }).join('');
}

// 開発ログの論理削除処理
async function deleteDevlogItem(timestamp) {
  if (!timestamp) {
    alert('タイムスタンプが取得できませんでした。');
    return;
  }

  if (!confirm('この投稿を削除しますか？')) {
    return;
  }

  try {
    await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete_devlog',
        timestamp: timestamp
      })
    });

    alert('削除完了しました。');
    window.location.reload();
  } catch (err) {
    alert('削除処理に失敗しました。');
  }
}

// PC管理者モード用 開発ログ投稿処理
function setupDevlogPost() {
  const form = document.getElementById('devlogPostForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('devlogSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerText = '送信中...';
    }

    const payload = {
      action: 'add_devlog',
      type: document.getElementById('dlType') ? document.getElementById('dlType').value : 'macro',
      title: document.getElementById('dlTitle') ? document.getElementById('dlTitle').value.trim() : '',
      body: document.getElementById('dlContent') ? document.getElementById('dlContent').value.trim() : ''
    };

    try {
      const res = await fetch(GAS_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert('ログを投稿しました！');
      form.reset();
      window.location.reload();
    } catch (err) {
      alert('送信に失敗しました。');
      if (btn) {
        btn.disabled = false;
        btn.innerText = '投稿する';
      }
    }
  });
}