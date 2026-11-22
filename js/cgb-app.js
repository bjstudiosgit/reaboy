(function () {
  'use strict';

  // Reveal animations for .reveal elements
  const revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '50px' });
    revealElements.forEach((el) => observer.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('is-revealed'));
  }
  // Safety timeout: ensure everything reveals even if offscreen
  setTimeout(() => {
    revealElements.forEach((el) => el.classList.add('is-revealed'));
  }, 100);

  // Theme toggle persistence
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const savedTheme = localStorage.getItem('reaboy-theme') || 'classic';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'classic' ? 'dark' : 'classic';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('reaboy-theme', next);
    });
  }

  let allGames = [];
  let filteredGames = [];
  let currentPage = 1;
  const PAGE_SIZE = 50;

  const searchInput = document.getElementById('cgb-search-input');
  const catFilter = document.getElementById('cgb-category-filter');
  const levelFilter = document.getElementById('cgb-level-filter');
  const mapperFilter = document.getElementById('cgb-mapper-filter');
  const resetBtn = document.getElementById('cgb-reset-filters');
  const matchCount = document.getElementById('cgb-match-count');
  const tableBody = document.getElementById('cgb-table-body');
  const paginationInfo = document.getElementById('cgb-pagination-info');
  const prevBtn = document.getElementById('cgb-prev-page');
  const nextBtn = document.getElementById('cgb-next-page');

  const dialog = document.getElementById('shot-dialog');
  const dialogTitle = document.getElementById('shot-dialog-title');
  const dialogImg = document.getElementById('shot-dialog-img');
  const dialogMeta = document.getElementById('shot-dialog-meta');
  const dialogClose = document.getElementById('shot-dialog-close');

  if (dialogClose) {
    dialogClose.addEventListener('click', () => dialog.close());
  }

  fetch('assets/cgb_verified_games.json')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      allGames = data;
      applyFilters();
    })
    .catch((err) => {
      console.error('Failed to load CGB database:', err);
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:2rem; color:#ff6b6b;">Error loading compatibility database: ${err.message}</td></tr>`;
    });

  function applyFilters() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const cat = catFilter?.value || 'all';
    const lvl = levelFilter?.value || 'all';
    const mbc = mapperFilter?.value || 'all';

    filteredGames = allGames.filter((g) => {
      if (q) {
        const matchesQ =
          (g.title || '').toLowerCase().includes(q) ||
          (g.filename || '').toLowerCase().includes(q) ||
          (g.sha256 || '').toLowerCase().includes(q) ||
          (g.mapper || '').toLowerCase().includes(q);
        if (!matchesQ) return false;
      }

      if (cat !== 'all') {
        if (g.categoryBadge !== cat) return false;
      }

      if (lvl !== 'all') {
        if (g.level !== lvl) return false;
      }

      if (mbc !== 'all') {
        if (!g.mapper.toLowerCase().includes(mbc.toLowerCase())) return false;
      }

      return true;
    });

    currentPage = 1;
    renderTable();
  }

  function renderTable() {
    matchCount.textContent = filteredGames.length.toLocaleString();
    const totalPages = Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE));
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages} (${filteredGames.length} titles)`;

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredGames.slice(start, start + PAGE_SIZE);

    if (pageItems.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--text-muted);">No matching Game Boy Color titles found for the selected criteria.</td></tr>`;
      return;
    }

    tableBody.innerHTML = pageItems
      .map((g) => {
        const shotHtml = g.screenshot
          ? `<img src="${g.screenshot}" alt="${g.title}" loading="lazy" style="width:36px; height:32px; object-fit:cover; border-radius:2px; cursor:pointer; image-rendering:pixelated;" class="cgb-thumb" data-shot="${g.screenshot}" data-title="${escapeHtml(g.title)}" data-meta="${escapeHtml(g.filename)} · ${g.mapper} · ${g.effectiveMode} · ${g.fps} FPS">`
          : `<span style="font-size:0.7rem; color:var(--text-muted);">N/A</span>`;

        const catBadge =
          g.categoryBadge === 'Exclusive'
            ? `<span class="verdict-badge verdict-pass" style="font-size:0.7rem;">CGB Exclusive ($C0)</span>`
            : `<span class="verdict-badge" style="font-size:0.7rem; background:rgba(255,193,7,0.15); color:#ffd166;">Dual DMG/CGB ($80)</span>`;

        let lvlBadge = `<span class="verdict-badge" style="font-size:0.7rem;">${g.level.replace('Level', 'Lvl ')}</span>`;
        if (g.level.includes('ExtendedStability')) {
          lvlBadge = `<span class="verdict-badge verdict-pass" style="font-size:0.7rem; background:rgba(47,224,117,0.15); color:var(--gb-0);">Lvl 5: Extended</span>`;
        } else if (g.level.includes('GameplayVerified')) {
          lvlBadge = `<span class="verdict-badge" style="font-size:0.7rem; background:rgba(0,180,216,0.15); color:#00b4d8;">Lvl 4: Gameplay</span>`;
        } else if (g.level.includes('MenuFunctional')) {
          lvlBadge = `<span class="verdict-badge" style="font-size:0.7rem; background:rgba(255,193,7,0.15); color:#ffd166;">Lvl 3: Menu</span>`;
        }

        const isPlayable = g.classification === 'VerifiedPlayable';
        const statusBadge = isPlayable
          ? `<span class="verdict-badge verdict-pass" style="font-size:0.72rem;">PLAYABLE</span>`
          : g.classification === 'Boots'
          ? `<span class="verdict-badge" style="font-size:0.72rem; background:rgba(255,193,7,0.15); color:#ffd166;">BOOTS</span>`
          : `<span class="verdict-badge" style="font-size:0.72rem; background:rgba(255,107,107,0.15); color:#ff6b6b;">FAIL</span>`;

        return `
          <tr>
            <td style="text-align:center;">${shotHtml}</td>
            <td>
              <strong>${escapeHtml(g.title || g.filename)}</strong>
              <div style="font-size:0.72rem; color:var(--text-muted); font-family:var(--font-mono); margin-top:2px;">${escapeHtml(g.filename)}</div>
            </td>
            <td>${catBadge}</td>
            <td style="font-family:var(--font-mono); font-size:0.8rem;">${escapeHtml(g.mapper)}</td>
            <td style="font-size:0.8rem;">${g.sizeKb} KiB</td>
            <td><span class="verdict-badge" style="font-size:0.7rem;">${escapeHtml(g.effectiveMode)}</span></td>
            <td style="font-family:var(--font-mono); font-size:0.8rem;">${g.fps ? g.fps.toFixed(1) : '—'}</td>
            <td>${lvlBadge}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      })
      .join('');

    // Attach click listeners to thumbnails
    tableBody.querySelectorAll('.cgb-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        if (!dialog) return;
        dialogTitle.textContent = thumb.dataset.title;
        dialogImg.src = thumb.dataset.shot;
        dialogMeta.textContent = thumb.dataset.meta;
        dialog.showModal();
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  searchInput?.addEventListener('input', applyFilters);
  catFilter?.addEventListener('change', applyFilters);
  levelFilter?.addEventListener('change', applyFilters);
  mapperFilter?.addEventListener('change', applyFilters);
  resetBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (catFilter) catFilter.value = 'all';
    if (levelFilter) levelFilter.value = 'all';
    if (mapperFilter) mapperFilter.value = 'all';
    applyFilters();
  });

  prevBtn?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
      tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  nextBtn?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredGames.length / PAGE_SIZE);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
      tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
})();
