/**
 * devlog.js
 * 開発ログ & つぶやきの動的描画・管理者認証・削除スクリプト
 */

// スプレッドシートのCSV公開URL（devlogシート用）
const DEVLOG_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTb8LAj2QVhzVsviugEqJ78QEtvqzT_QH5m-UMbB2z_KNmMQM_I-laPdzdgmmNPlfKNbKeHFhibiZG/pub?gid=167591232&single=true&output=csv';

// GAS（Google Apps Script）のWebアプリURL（投稿・削除・認証用）
const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzqJ725NV-30PS6kh05E_x1MX85nf5nWrvau0JYhSUEFUWHdXXI53ODHN74RmGZWXsr/exec';

let allDevlogs = [];
let isAdmin = false;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const adminParam = urlParams.get('admin') === 'true';

  if (adminParam) {
    isAdmin = await authenticateAdmin();
    if (isAdmin) {
      const adminForm = document.getElementById('devlogAdminForm');
      if (adminForm) adminForm.style.display = 'block';
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  setupDevlogPost();

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

// CSVデータの取得（スプレッドシートから直接取得）
async function fetchDevlogData() {
  if (!DEVLOG_CSV_URL || DEVLOG_CSV_URL.includes('...')) {
    return [];
  }
  try {
    const res = await fetch(`${DEVLOG_CSV_URL}&t=${Date.now()}`);
    if (!res.ok) throw new Error('Fetch failed');
    const text = await res.text();
    return parseDevlogCSV(text);
  } catch (err) {
    console.warn('Devlog CSVの取得に失敗しました:', err);
    return [];
  }
}

// CSVパース処理 [A:timestamp, B:type, C:title, D:body]
function parseDevlogCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length <= 1) return [];

  const list = [];

  // ヘッダー行を除いて1行ずつ処理
  lines.slice(1).forEach(line => {
    // カンマ区切り（簡易パース）
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length < 2) return;

    const timestamp = values[0] || '';
    const type = values[1] || 'micro';
    const title = values[2] || '';
    const body = values[3] || values[2] || ''; // 列順補正

    list.push({
      timestamp: timestamp,
      type: type,
      title: title,
      body: body
    });
  });

  return list.reverse(); // 最新順
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

    const deleteBtnHTML = isAdmin ? `
      <button onclick="deleteDevlogItem('${item.timestamp}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; cursor:pointer; margin-left:8px;">
        🗑 削除
      </button>
    ` : '';

    return `
      <article class="card" style="padding:1.25rem; margin-bottom:1rem; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <div style="display:flex; align-items:center;">
            ${badgeHTML}
            <span style="font-size:0.8rem; color:var(--color-text-muted); margin-left:8px;">${item.timestamp}</span>
          </div>
          ${deleteBtnHTML}
        </div>
        ${titleHTML}
        <p style="color:var(--color-text); font-size:0.95rem; line-height:1.6; white-space:pre-wrap; margin:0;">${item.body}</p>
      </article>
    `;
  }).join('');
}

// 削除処理
async function deleteDevlogItem(timestamp) {
  if (!timestamp || !confirm('この投稿を削除しますか？')) return;

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

// 投稿処理
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
      await fetch(GAS_WEBHOOK_URL, {
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