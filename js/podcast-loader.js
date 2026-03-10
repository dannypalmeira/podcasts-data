const CONFIG = {
  GITHUB_USER: 'dannypalmeira',
  GITHUB_REPO: 'podcasts-data',
  GITHUB_BRANCH: 'main',
  
  get CDN_URL() {
    return `https://cdn.jsdelivr.net/gh/${this.GITHUB_USER}/${this.GITHUB_REPO}@${this.GITHUB_BRANCH}/data/podcasts.json`;
  },
  
  CACHE_KEY: 'podcasts_cache',
  CACHE_DURATION: 60 * 60 * 1000, 
  PODCASTS_PER_PAGE: 12,
  TIMEOUT: 10000, 
};

const UI = {
  tableSelector: '#tabela',
  paginationSelector: '#paginacao',
  coverImage: '../../podcast/images/podcast-cover.jpg'
};


let appState = {
  podcasts: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  currentlyPlayingAudio: null
};


const intersectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('show', entry.isIntersecting);
    });
  },
  { threshold: 0.2 }
);


function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getFromCache() {
  try {
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > CONFIG.CACHE_DURATION;

    if (isExpired) {
      localStorage.removeItem(CONFIG.CACHE_KEY);
      console.log('⏰ Cache expirou');
      return null;
    }

    console.log('✅ Cache válido encontrado');
    return data;
  } catch (error) {
    console.error('❌ Erro ao ler cache:', error);
    localStorage.removeItem(CONFIG.CACHE_KEY);
    return null;
  }
}

function saveToCache(data) {
  try {
    localStorage.setItem(
      CONFIG.CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now()
      })
    );
    console.log('💾 Cache salvo com sucesso');
  } catch (error) {
    console.error('❌ Erro ao salvar cache:', error);
  }
}

async function fetchPodcasts(url) {
  console.log(`🌐 Carregando de: ${url}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'force-cache',
      signal: controller.signal
    });

    clearTimeout(timeout);

    const corsHeader = response.headers.get('Access-Control-Allow-Origin');
    console.log(`📋 CORS: ${corsHeader || 'não configurado'}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Resposta não é JSON válido');
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('JSON deve ser um array de podcasts');
    }

    if (data.length === 0) {
      throw new Error('Nenhum podcast encontrado no JSON');
    }

    console.log(`✅ ${data.length} podcasts carregados com sucesso`);
    return data;

  } catch (error) {
    console.error(`❌ Erro ao carregar JSON:`, error.message);
    throw error;
  }
}


function sortPodcasts(podcasts) {
  return podcasts
    .map((p) => ({
      ...p,
      dateObj: new Date(p.data.split('.').reverse().join('-'))
    }))
    .sort((a, b) => b.dateObj - a.dateObj) 
    .map(({ dateObj, ...rest }) => rest); 
}


function createPodcastElement(podcast) {
  return `
    <div class="row">
      <div class="grid">
        <div class="icon">
          <img 
            src="${escapeHtml(UI.coverImage)}" 
            alt="Podcast cover" 
            class="img-responsive"
            loading="lazy"
          />
        </div>
        <div class="info">
          <span class="data">${escapeHtml(podcast.data)}</span>
          <h2>
            ${escapeHtml(podcast.tit)}
            <span class="sub-tit">${escapeHtml(podcast.intervistato)}</span>
          </h2>
          <p>${escapeHtml(podcast.descrizione)}</p>
          <div class="podcast">
            <audio controls data-podcast-audio="true">
              <source 
                src="https://www.meusite.com/podcast/sociale/${escapeHtml(podcast.audio)}"
                type="audio/mpeg"
              />
              Seu navegador não suporta áudio.
            </audio>
          </div>
        </div>
      </div>
    </div>`;
}


function attachAudioListeners() {
  const audioElements = document.querySelectorAll('[data-podcast-audio="true"]');
  
  audioElements.forEach((audio) => {
    if (audio.dataset.listenerAttached === 'true') return;

    audio.addEventListener('play', (event) => {
      // Pausar outro áudio se estiver tocando
      if (appState.currentlyPlayingAudio && appState.currentlyPlayingAudio !== audio) {
        appState.currentlyPlayingAudio.pause();
      }
      appState.currentlyPlayingAudio = audio;
      console.log('🔊 Tocando áudio');
    });

    audio.dataset.listenerAttached = 'true';
  });
}

function renderPodcasts() {
  const $tabela = document.querySelector(UI.tableSelector);
  if (!$tabela) {
    console.error('❌ Elemento #tabela não encontrado');
    return;
  }

  const startIndex = (appState.currentPage - 1) * CONFIG.PODCASTS_PER_PAGE;
  const endIndex = startIndex + CONFIG.PODCASTS_PER_PAGE;
  const podcastsToShow = appState.podcasts.slice(startIndex, endIndex);


  $tabela.innerHTML = podcastsToShow
    .map((podcast) => createPodcastElement(podcast))
    .join('');


  document.querySelectorAll('.row').forEach((row) => {
    intersectionObserver.observe(row);
  });

  attachAudioListeners();

  console.log(`📄 Página ${appState.currentPage} renderizada`);
}

function renderPagination() {
  const $pagination = document.querySelector(UI.paginationSelector);
  if (!$pagination) {
    console.error('❌ Elemento #paginacao não encontrado');
    return;
  }

  const totalPages = Math.ceil(appState.podcasts.length / CONFIG.PODCASTS_PER_PAGE);

  if (totalPages <= 1) {
    $pagination.innerHTML = '';
    return;
  }

  let html = '';
  
  if (appState.currentPage > 1) {
    html += `<li class="pagina" data-page="${appState.currentPage - 1}">&laquo;</li>`;
  }

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      const activeClass = i === appState.currentPage ? 'active' : '';
      html += `<li class="pagina ${activeClass}" data-page="${i}">${i}</li>`;
    }
  } else {
    html += `<li class="pagina" data-page="1">1</li>`;

    if (appState.currentPage > 4) {
      html += `<li class="pagina disabled">...</li>`;
    }

    const startPage = Math.max(2, appState.currentPage - 1);
    const endPage = Math.min(totalPages - 1, appState.currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === appState.currentPage ? 'active' : '';
      html += `<li class="pagina ${activeClass}" data-page="${i}">${i}</li>`;
    }

    if (appState.currentPage < totalPages - 3) {
      html += `<li class="pagina disabled">...</li>`;
    }

    html += `<li class="pagina" data-page="${totalPages}">${totalPages}</li>`;
  }

  if (appState.currentPage < totalPages) {
    html += `<li class="pagina" data-page="${appState.currentPage + 1}">&raquo;</li>`;
  }

  $pagination.innerHTML = html;

  $pagination.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', handlePaginationClick);
  });

  console.log(`📑 Paginação renderizada (${totalPages} páginas)`);
}

function handlePaginationClick(event) {
  const page = parseInt(event.target.dataset.page, 10);

  if (isNaN(page)) return;

  appState.currentPage = page;

  document.querySelector(UI.tableSelector)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

  renderPodcasts();
  renderPagination();
}

function showLoading() {
  const $tabela = document.querySelector(UI.tableSelector);
  if (!$tabela) return;

  $tabela.innerHTML = `
    <div style="padding: 40px; text-align: center; color: #666;">
      <p style="font-size: 1.2em;">⏳ Carregando podcasts...</p>
      <div style="display: inline-block; width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </div>`;
}

function showError(error) {
  const $tabela = document.querySelector(UI.tableSelector);
  if (!$tabela) return;

  let errorMessage = '❌ Erro desconhecido';
  let suggestion = '';

  if (error.message.includes('404')) {
    errorMessage = '❌ Arquivo não encontrado (404)';
    suggestion = `
      <br/><strong>Verifique:</strong>
      <ul style="text-align: left; display: inline-block;">
        <li>Repositório é público?</li>
        <li>Arquivo está em: <code>/data/podcasts.json</code></li>
        <li>Branch correto: <code>${CONFIG.GITHUB_BRANCH}</code></li>
      </ul>`;
  } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
    errorMessage = '❌ Erro de conexão';
    suggestion = '<br/>Verifique sua internet ou tente novamente em alguns momentos.';
  } else if (error.message.includes('AbortError')) {
    errorMessage = '❌ Timeout: Requisição demorou muito';
    suggestion = '<br/>Tente novamente.';
  } else if (error.message.includes('JSON')) {
    errorMessage = '❌ Erro no formato do JSON';
    suggestion = '<br/>Verifique se o arquivo <code>/data/podcasts.json</code> é um array válido.';
  } else {
    errorMessage = `❌ ${error.message}`;
  }

  $tabela.innerHTML = `
    <div style="padding: 30px; text-align: center; background: #ffebee; border-radius: 8px; margin: 20px; color: #c62828;">
      <h3 style="margin: 0 0 15px 0;">${errorMessage}</h3>
      <p style="font-size: 0.95em; margin: 0 0 15px 0;">${suggestion}</p>
      
      <strong>URL do JSON:</strong>
      <div style="background: #fff; padding: 10px; border-radius: 4px; margin: 10px 0; word-break: break-all; font-family: monospace; font-size: 0.85em;">
        ${CONFIG.CDN_URL}
      </div>

      <button 
        onclick="location.reload()" 
        style="margin-top: 15px; padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em;">
        🔄 Recarregar Página
      </button>
    </div>`;
};

async function initializePodcasts() {
  console.log('🚀 Iniciando carregamento de podcasts');
  console.log(`📚 Repositório: ${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}`);
  console.log(`🌳 Branch: ${CONFIG.GITHUB_BRANCH}`);
  console.log(`🔗 URL: ${CONFIG.CDN_URL}`);

  appState.isLoading = true;
  showLoading();

  try {
    let podcasts = getFromCache();

    if (!podcasts) {
      console.log('📡 Nenhum cache disponível, carregando de jsDelivr...');
      podcasts = await fetchPodcasts(CONFIG.CDN_URL);
    }

    if (!Array.isArray(podcasts) || podcasts.length === 0) {
      throw new Error('Nenhum podcast encontrado');
    }

    podcasts = podcasts.map((p) => ({
      data: escapeHtml(p.data) || '',
      tit: escapeHtml(p.tit) || 'Sem título',
      intervistato: escapeHtml(p.intervistato) || '',
      descrizione: escapeHtml(p.descrizione) || '',
      audio: escapeHtml(p.audio) || ''
    }));

    appState.podcasts = sortPodcasts(podcasts);

    saveToCache(podcasts);

    appState.isLoading = false;
    appState.currentPage = 1;
    renderPodcasts();
    renderPagination();

    console.log(`✅ Sucesso! ${appState.podcasts.length} podcasts carregados`);

  } catch (error) {
    console.error('❌ Erro durante inicialização:', error);
    appState.isLoading = false;
    appState.error = error;
    showError(error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePodcasts);
} else {
  // DOM já foi carregado
  initializePodcasts();
}
