document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let allReleases = [];
  let selectedReleases = new Set(); // Stores Release IDs
  let currentFilterType = 'all';
  let searchQuery = '';

  // DOM Elements
  const container = document.getElementById('releases-container');
  const refreshBtn = document.getElementById('refresh-btn');
  const refreshIcon = document.getElementById('refresh-icon');
  const searchInput = document.getElementById('search-input');
  const metricsDashboard = document.getElementById('metrics-dashboard');
  const tweetTrigger = document.getElementById('tweet-trigger');
  const tweetDrawer = document.getElementById('tweet-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const closeDrawer = document.getElementById('close-drawer');
  const selectedCount = document.getElementById('selected-count');
  const clearSelectionBtn = document.getElementById('clear-selection-btn');
  const tweetTextarea = document.getElementById('tweet-textarea');
  const postTweetBtn = document.getElementById('post-tweet-btn');
  const charCounter = document.getElementById('char-counter');
  const progressCircle = document.getElementById('progress-circle');
  const progressCirclePath = document.getElementById('progress-bar-circle');
  
  const tweetFab = document.getElementById('tweet-fab');
  const fabBadge = document.getElementById('fab-badge');

  // Badge configuration maps
  const badgeConfig = {
    // Main types
    'Feature': { rgb: '16, 185, 129', color: 'var(--color-feature)' },
    'Announcement': { rgb: '59, 130, 246', color: 'var(--color-announcement)' },
    'Change': { rgb: '168, 85, 247', color: 'var(--color-change)' },
    'Breaking': { rgb: '249, 115, 22', color: 'var(--color-breaking)' },
    'Issue': { rgb: '239, 68, 68', color: 'var(--color-issue)' },
    'Update': { rgb: '20, 184, 166', color: 'var(--color-update)' },
    // Sub-categories
    'Gemini': { rgb: '139, 92, 246', color: '#a78bfa' }, // Light purple
    'AI': { rgb: '236, 72, 153', color: '#f472b6' }, // Pink
    'Security': { rgb: '244, 63, 94', color: '#fb7185' }, // Rose
    'Cost': { rgb: '234, 179, 8', color: '#fde047' }, // Yellow
    'Scaling': { rgb: '20, 184, 166', color: '#2dd4bf' }, // Teal
    'Driver': { rgb: '148, 163, 184', color: '#94a3b8' }, // Slate
    'Data Transfer': { rgb: '56, 189, 248', color: '#38bdf8' }, // Light blue
    'Graphs': { rgb: '34, 197, 94', color: '#4ade80' }, // Light green
    'Apache Iceberg': { rgb: '45, 212, 191', color: '#2dd4bf' },
    'Dataform': { rgb: '168, 85, 247', color: '#c084fc' },
    'AlloyDB': { rgb: '59, 130, 246', color: '#60a5fa' },
    'Colab': { rgb: '249, 115, 22', color: '#fb923c' },
    'UDF': { rgb: '14, 165, 233', color: '#38bdf8' }
  };


  // 1. Fetch Release Notes from API
  async function loadReleases(refresh = false) {
    try {
      setLoading(true);
      const response = await fetch(`/api/releases${refresh ? '?refresh=true' : ''}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        allReleases = data.releases;
        selectedReleases.clear();
        updateDashboardMetrics();
        renderReleases();
        updateTwitterDrawerUI();
      } else {
        showErrorState(data.message || 'Failed to fetch release notes.');
      }
    } catch (error) {
      console.error('Error loading releases:', error);
      showErrorState('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  }

  // 2. Set loading state UI
  function setLoading(isLoading) {
    if (isLoading) {
      refreshIcon.classList.add('spin');
      refreshBtn.disabled = true;
      container.classList.add('loading');
    } else {
      refreshIcon.classList.remove('spin');
      refreshBtn.disabled = false;
      container.classList.remove('loading');
    }
  }

  // 3. Show error state in releases container
  function showErrorState(msg) {
    container.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2005/svg" style="color: var(--color-issue);">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <h3>An error occurred</h3>
        <p>${msg}</p>
        <button class="btn-primary" style="margin-top: 1rem;" onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  // 4. Update stats cards
  function updateDashboardMetrics() {
    const counts = { all: allReleases.length, Feature: 0, Announcement: 0, Change: 0, Breaking: 0, Issue: 0 };
    
    allReleases.forEach(rel => {
      const type = rel.type;
      if (counts[type] !== undefined) {
        counts[type]++;
      } else {
        // Fallback for custom / unhandled types
        counts['Change']++;
      }
    });

    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.Feature;
    document.getElementById('count-announcement').textContent = counts.Announcement;
    document.getElementById('count-change').textContent = counts.Change;
    document.getElementById('count-breaking').textContent = counts.Breaking;
    document.getElementById('count-issue').textContent = counts.Issue;
  }

  // 5. Render Release Notes based on active search and type filters
  function renderReleases() {
    const filtered = allReleases.filter(rel => {
      const matchesType = currentFilterType === 'all' || rel.type === currentFilterType;
      const matchesSearch = searchQuery === '' || 
        rel.type.toLowerCase().includes(searchQuery) ||
        rel.date.toLowerCase().includes(searchQuery) ||
        rel.content_text.toLowerCase().includes(searchQuery);
      return matchesType && matchesSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2005/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <h3>No matching release notes found</h3>
          <p>Try refining your search terms or changing your filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    
    filtered.forEach(rel => {
      const config = badgeConfig[rel.type] || badgeConfig['Update'];
      const isSelected = selectedReleases.has(rel.id);
      
      const card = document.createElement('article');
      card.className = `release-card ${isSelected ? 'selected' : ''}`;
      card.style.setProperty('--card-color', config.color);
      card.style.setProperty('--badge-color-rgb', config.rgb);
      card.dataset.id = rel.id;

      // Map categories to smaller badges with custom colors
      const categoriesList = rel.categories || [rel.type];
      const badgesHtml = categoriesList.map(cat => {
        const catConfig = badgeConfig[cat] || badgeConfig['Update'] || { rgb: '107, 114, 128', color: 'var(--text-muted)' };
        return `<span class="type-badge" style="color: ${catConfig.color}; border-color: rgba(${catConfig.rgb}, 0.25); background: rgba(${catConfig.rgb}, 0.1);">${cat}</span>`;
      }).join('');
      
      card.innerHTML = `
        <div class="card-header">
          <span class="date-label">${rel.date}</span>
          <div class="select-indicator">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2005/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        <div class="badges-row">
          ${badgesHtml}
        </div>
        <div class="card-content">
          ${rel.content_html}
        </div>
        <div class="card-footer">
          <a href="${rel.link}" target="_blank" class="view-original-link">
            <span>View Docs</span>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2005/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </a>
          <button class="card-tweet-btn" title="Tweet about this specific release">
            <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2005/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </button>
        </div>
      `;

      
      // Select logic when clicking card (avoid triggers on links and buttons)
      card.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('.card-tweet-btn')) return;
        toggleReleaseSelection(rel.id);
      });

      // Direct Tweet button logic
      card.querySelector('.card-tweet-btn').addEventListener('click', () => {
        selectedReleases.clear();
        selectedReleases.add(rel.id);
        renderReleases();
        updateTwitterDrawerUI();
        openDrawer();
      });
      
      container.appendChild(card);
    });
  }

  // 6. Handle selection toggles
  function toggleReleaseSelection(id) {
    if (selectedReleases.has(id)) {
      selectedReleases.delete(id);
    } else {
      selectedReleases.add(id);
    }
    
    // Toggle active card class directly for speed
    const card = container.querySelector(`.release-card[data-id="${id}"]`);
    if (card) {
      card.classList.toggle('selected');
    }
    
    updateTwitterDrawerUI();
  }

  // 7. Update Twitter Drawer UI & Fabricated Draft Text
  function updateTwitterDrawerUI() {
    const count = selectedReleases.size;
    selectedCount.textContent = count;
    fabBadge.textContent = count;
    
    if (count > 0) {
      tweetTrigger.disabled = false;
      tweetFab.classList.add('visible');
    } else {
      tweetTrigger.disabled = true;
      tweetFab.classList.remove('visible');
    }
    
    generateDraftTweet();
  }

  // 8. Generate standard structured Tweet depending on selections
  function generateDraftTweet() {
    if (selectedReleases.size === 0) {
      tweetTextarea.value = '';
      updateCharCounter();
      return;
    }
    
    // Grab selected release objects
    const selected = allReleases.filter(r => selectedReleases.has(r.id));
    
    let draft = "";
    if (selected.length === 1) {
      const rel = selected[0];
      const cleanText = truncateString(rel.content_text, 140);
      draft = `📢 New BigQuery Update (${rel.date})\n\n${rel.type}: ${cleanText}\n\nRead more: ${rel.link}\n#BigQuery #GoogleCloud`;
    } else {
      draft = `📢 Latest Google BigQuery updates:\n\n`;
      selected.forEach(rel => {
        const titleLine = `• [${rel.date}] ${rel.type}: ${truncateString(rel.content_text, 50)}\n`;
        // Make sure we don't blow up draft size if many elements selected
        if (draft.length + titleLine.length < 200) {
          draft += titleLine;
        }
      });
      draft += `\nFind release logs here: ${selected[0].link}\n#BigQuery #Cloud`;
    }
    
    tweetTextarea.value = draft;
    updateCharCounter();
  }

  function truncateString(str, num) {
    if (str.length <= num) return str;
    return str.slice(0, num) + '...';
  }

  // 9. Manage character counters and visual circles
  function updateCharCounter() {
    const text = tweetTextarea.value;
    const len = text.length;
    const remaining = 280 - len;
    
    charCounter.textContent = remaining;
    
    // Circle SVG indicator progress
    const radius = 10;
    const circumference = 2 * Math.PI * radius; // 62.83
    const percentage = Math.min(len / 280, 1);
    const offset = circumference - (percentage * circumference);
    
    progressCirclePath.style.strokeDashoffset = offset;
    
    // UI indicator alerts
    progressCircle.className = 'progress-circle';
    charCounter.classList.remove('limit-exceeded');
    postTweetBtn.disabled = len === 0;
    
    if (remaining < 0) {
      progressCircle.classList.add('danger');
      charCounter.classList.add('limit-exceeded');
      postTweetBtn.disabled = true; // Twitter prevents tweeting too long text
    } else if (remaining < 30) {
      progressCircle.classList.add('warning');
    }
  }

  // 10. Open/Close Drawer functions
  function openDrawer() {
    tweetDrawer.classList.add('open');
    drawerBackdrop.classList.add('open');
  }

  function closeDrawerFunc() {
    tweetDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
  }

  // Event Listeners
  refreshBtn.addEventListener('click', () => loadReleases(true));
  
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderReleases();
  });

  // Filter selection cards
  metricsDashboard.addEventListener('click', (e) => {
    const card = e.target.closest('.metric-card');
    if (!card) return;
    
    // Toggle active state
    metricsDashboard.querySelectorAll('.metric-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    
    currentFilterType = card.dataset.type;
    renderReleases();
  });

  tweetTrigger.addEventListener('click', openDrawer);
  tweetFab.addEventListener('click', openDrawer);
  closeDrawer.addEventListener('click', closeDrawerFunc);
  drawerBackdrop.addEventListener('click', closeDrawerFunc);

  clearSelectionBtn.addEventListener('click', () => {
    selectedReleases.clear();
    container.querySelectorAll('.release-card').forEach(c => c.classList.remove('selected'));
    updateTwitterDrawerUI();
  });

  tweetTextarea.addEventListener('input', updateCharCounter);

  // Link out to X Twitter intent
  postTweetBtn.addEventListener('click', () => {
    const text = encodeURIComponent(tweetTextarea.value);
    const xUrl = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(xUrl, '_blank');
  });

  // Init application
  loadReleases();
});
