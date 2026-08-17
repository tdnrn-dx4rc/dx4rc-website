// スプレッドシートのCSV公開URL
const PORTFOLIO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTb8LAj2QVhzVsviugEqJ78QEtvqzT_QH5m-UMbB2z_KNnMQM_l-IaPdzdgmmNPlfKNbKeHFhibiZG/pub?gid=0&single=true&output=csv';

// GASのWebアプリURL
const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzqJ725NV-30PS6kh05E_x1MX85nf5nWrvau0JYhSUEFUWHdXXI53ODHN74RmGZWXsr/exec';

let allPortfolioItems = [];
let currentFilter = 'all';
let isAdmin = false;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const adminParam = urlParams.get('admin') === 'true';

  if (adminParam) {
    isAdmin = await authenticateAdmin();
    if (isAdmin) {
      const adminForm = document.getElementById('portfolioAdminForm');
      if (adminForm) adminForm.style.display = 'block';
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  setupPortfolioPost();
  setupSearchAndFilter();

  allPortfolioItems = await fetchPortfolioData();
  renderPortfolio(allPortfolioItems);
});

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

async function fetchPortfolioData() {
  if (!PORTFOLIO_CSV_URL || PORTFOLIO_CSV_URL.includes('...')) return [];
  try {
    const res = await fetch(`${PORTFOLIO_CSV_URL}&t=${Date.now()}`);
    if (!res.ok) throw new Error('Fetch failed');
    const text = await res.text();
    return parsePortfolioCSV(text);
  } catch (err) {
    console.warn('Portfolio CSVの取得に失敗しました:', err);
    return [];
  }
}

// カンマや改行・ダブルクォーテーションを正しくパースする関数
function parseCSVLine(line) {
  const result = [];
  let start = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      let val = line.substring(start, i).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      result.push(val);
      start = i + 1;
    }
  }
  let lastVal = line.substring(start).trim();
  if (lastVal.startsWith('"') && lastVal.endsWith('"')) {
    lastVal = lastVal.substring(1, lastVal.length - 1).replace(/""/g, '"');
  }
  result.push(lastVal);
  return result;
}

function parsePortfolioCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = parseCSVLine(lines[0]);
  const list = [];

  lines.slice(1).forEach(line => {
    if (!line.trim()) return;
    const values = parseCSVLine(line);
    const item = {};
    headers.forEach((h, idx) => {
      item[h] = values[idx] || '';
    });

    if (item.status !== 'deleted') {
      list.push(item);
    }
  });

  return list.reverse();
}

function renderPortfolio(items) {
  const container = document.getElementById('portfolioGrid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p style="color:var(--color-text-muted); text-align:center; grid-column:1/-1;">該当する成果品・アイデアはありません。</p>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const tags = item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const tagBadges = tags.map(t => `<span class="tag-badge" style="background:var(--color-bg); padding:2px 8px; border-radius:4px; font-size:0.75rem; color:var(--color-text-muted); margin-right:4px;">#${t}</span>`).join('');

    const statusBadge = item.status === 'wip' 
      ? `<span style="background:#feefc3; color:#b06000; font-size:0.75rem; font-weight:bold; padding:2px 8px; border-radius:12px;">WIP（試作中）</span>`
      : `<span style="background:#e6f4ea; color:#137333; font-size:0.75rem; font-weight:bold; padding:2px 8px; border-radius:12px;">LIVE</span>`;

    const deleteBtnHTML = isAdmin ? `
      <button onclick="deletePortfolioItem('${item.id}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; cursor:pointer; margin-left:8px;">
        🗑 削除
      </button>
    ` : '';

    // 画像が存在する場合のみ表示し、表示失敗時（onerror）は非表示にする
    const imageHTML = (item.image_url && item.image_url.startsWith('http')) 
      ? `<div style="width:100%; height:180px; overflow:hidden; border-radius:var(--radius); margin-bottom:1rem; background:#f1f5f9;">
          <img src="${item.image_url}" alt="" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'">
         </div>`
      : '';

    const adviceHTML = item.advice 
      ? `<div style="margin-top:1rem; padding:0.8rem 1rem; background:var(--color-bg); border-left:3px solid var(--color-primary); border-radius:4px; font-size:0.88rem; color:var(--color-text);">
          <strong style="color:var(--color-primary); display:block; margin-bottom:0.2rem;">💡 実装のアドバイス・コツ:</strong>
          <p style="margin:0; white-space:pre-wrap;">${item.advice}</p>
         </div>`
      : '';

    return `
      <article class="card portfolio-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:1.5rem; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius);">
        <div>
          ${imageHTML}
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <span style="font-size:0.8rem; font-weight:bold; color:var(--color-primary);">${item.category || 'アイデア'}</span>
            <div>
              ${statusBadge}
              ${deleteBtnHTML}
            </div>
          </div>
          <h3 style="font-size:1.2rem; margin-bottom:0.5rem;">${item.title}</h3>
          <p style="color:var(--color-text-muted); font-size:0.95rem; line-height:1.6; white-space:pre-wrap; margin-bottom:0.75rem;">${item.description}</p>
          ${adviceHTML}
        </div>
        <div style="margin-top:1rem; padding-top:0.5rem; border-top:1px solid var(--color-border);">
          ${tagBadges}
        </div>
      </article>
    `;
  }).join('');
}

async function deletePortfolioItem(id) {
  if (!id || !confirm(`ID: "${id}" の成果品を削除しますか？`)) return;

  try {
    await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_portfolio', id: id })
    });

    alert('削除マークを付けました。');
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    alert('削除処理に失敗しました。');
  }
}

function setupSearchAndFilter() {
  const searchInput = document.getElementById('searchInput');
  const filterButtons = document.querySelectorAll('.btn-filter');

  const applyFilters = () => {
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = allPortfolioItems.filter(item => {
      const matchKeyword = !keyword || 
        (item.title && item.title.toLowerCase().includes(keyword)) || 
        (item.description && item.description.toLowerCase().includes(keyword)) || 
        (item.tags && item.tags.toLowerCase().includes(keyword));

      const matchCategory = (currentFilter === 'all') || 
        (item.category && item.category.toLowerCase().includes(currentFilter)) || 
        (item.tags && item.tags.toLowerCase().includes(currentFilter));

      return matchKeyword && matchCategory;
    });

    renderPortfolio(filtered);
  };

  if (searchInput) searchInput.addEventListener('input', applyFilters);

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      applyFilters();
    });
  });
}

function setupPortfolioPost() {
  const form = document.getElementById('portfolioPostForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pfSubmitBtn');
    btn.disabled = true;
    btn.innerText = '送信・画像保存中...';

    const fileInput = document.getElementById('pfImageFile');
    const file = fileInput ? fileInput.files[0] : null;

    let imageData = '';
    let imageName = '';
    let imageType = '';

    if (file) {
      try {
        imageData = await convertFileToBase64(file);
        imageName = file.name;
        imageType = file.type;
      } catch (err) {
        alert('画像の読み込みに失敗しました。');
        btn.disabled = false;
        btn.innerText = 'アイデアを公開する';
        return;
      }
    }

    const selectedTags = Array.from(document.querySelectorAll('input[name="pfTag"]:checked'))
      .map(cb => cb.value)
      .join(', ');

    const payload = {
      action: 'add_portfolio',
      id: document.getElementById('pfId') ? document.getElementById('pfId').value.trim() : '',
      title: document.getElementById('pfTitle').value.trim(),
      category: document.getElementById('pfCategory').value.trim(),
      tags: selectedTags,
      description: document.getElementById('pfDescription').value.trim(),
      advice: document.getElementById('pfAdvice').value.trim(),
      status: document.getElementById('pfStatus') ? document.getElementById('pfStatus').value : 'live',
      image_data: imageData,
      image_name: imageName,
      image_type: imageType
    };

    try {
      await fetch(GAS_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      alert('登録が完了しました！');
      form.reset();
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      alert('送信に失敗しました。');
      btn.disabled = false;
      btn.innerText = 'アイデアを公開する';
    }
  });
}

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}