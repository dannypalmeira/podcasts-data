const CONFIG = {
  GITHUB_USER: 'dannypalmeira',
  GITHUB_REPO: 'podcasts-data',
  GITHUB_BRANCH: 'main',
  
  get CDN_URL() {
    return `https://cdn.jsdelivr.net/gh/${this.GITHUB_USER}/${this.GITHUB_REPO}@${this.GITHUB_BRANCH}/data/podcasts.json`;
  },
  
  get FALLBACK_URL() {
    return `https://cdn.jsdelivr.net/gh/${this.GITHUB_USER}/${this.GITHUB_REPO}@latest/data/podcasts.json`;
  },

  CACHE_KEY: 'podcasts_cache',
  CACHE_DURATION: 60 * 60 * 1000, 
  PODCASTS_PER_PAGE: 12,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

const UI = {
  tableSelector: '#tabela',
  paginationSelector: '#paginacao',
  coverImage: '../../podcast/images/podcast-cover.jpg'
};

let dati = {
  listaPodcast: [],
  isLoading: false,
  error: null
};

let paginaAtuale = 1;
let currentlyPlayingAudio = null;

const intersectionObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      entry.target.classList.toggle('show', entry.isIntersecting);
    });
  },
  { threshold: 0.2 }
);


function getCorsErrorMessage(error) {
  const message = error.message.toLowerCase();
  
  if (message.includes('cors')) {
    return `
      ❌ <strong>Erro de CORS</strong>
      <br/>O jsDelivr deveria permitir CORS automaticamente. 
      <br/>Verifique a URL do repositório GitHub.
    `;
  }
  
  if (message.includes('404') || message.includes('not found')) {
    return `
      ❌ <strong>Arquivo não encontrado</strong>
      <br/>Verifique:
      <br/>• Se o arquivo está em: <code>/data/podcasts.json</code>
      <br/>• Se o repositório é público
      <br/>• Se o branch é: <code>${CONFIG.GITHUB_BRANCH}</code>
    `;
  }
  
  if (message.includes('network') || message.includes('failed to fetch')) {
    return '❌ <strong>Erro de rede:</strong> Verifique sua conexão ou GitHub está offline';
  }
  
  return `❌ <strong>Erro:</strong> ${error.message}`;
}

function showError(message) {
  dati.error = message;
  const $tabela = document.querySelector(UI.tableSelector);
  if ($tabela) {
    $tabela.innerHTML = `
      <div class="error-message" style="padding: 20px; text-align: center; color: #d32f2f; background: #ffebee; border-radius: 4px; margin: 20px;">
        ${message}
        <br/><br/>
        <strong>URL tentada:</strong>
        <br/><code style="background: #f5f5f5; padding: 8px; border-radius: 4px; display: block; margin: 10px 0; word-break: break-all;">
          ${CONFIG.CDN_URL}
        </code>
        <br/>
        <button onclick="retryLoadPodcasts()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer; background: #2196F3; color: white; border: none; border-radius: 4px;">
          🔄 Tentar Novamente
        </button>
      </div>`;
  }
}

function showLoading() {
  dati.isLoading = true;
  const $tabela = document.querySelector(UI.tableSelector);
  if ($tabela) {
    $tabela.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <p>⏳ Carregando podcasts de jsDelivr...</p>
        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>`;
  }
}

async function fetchPodcastsWithRetry(url, attempt = 1) {
  console.log(`📡 Tentativa ${attempt}: Carregando de jsDelivr`);
  console.log(`   URL: ${url}`);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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
    console.log(`✅ CORS habilitado: ${corsHeader}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Resposta não é JSON válido');
    }

    const data = await response.json();

    if (!Array.isArray(data) && !Array.isArray(data.podcasts)) {
      throw new Error('Formato de JSON inválido');
    }

    console.log(`✅ Carregamento bem-sucedido! ${Array.isArray(data) ? data.length : data.podcasts.length} podcasts encontrados`);
    return Array.isArray(data) ? data : data.podcasts;

  } catch (error) {
    console.error(`❌ Tentativa ${attempt} falhou:`, error);

    if (attempt === 1 && url === CONFIG.CDN_URL) {
      console.log('🔄 Tentando URL de fallback (latest)...');
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      return fetchPodcastsWithRetry(CONFIG.FALLBACK_URL, 2);
    }

    throw error;
  }
}

async function loadPodcasts() {
  showLoading();

  try {
    let podcasts = getFromCache();
    if (podcasts) {
      console.log('💾 Usando podcasts em cache');
      dati.listaPodcast = sortPodcasts(podcasts);
      dati.isLoading = false;
      renderPodcasts();
      renderPaginacao();
      return;
    }

    podcasts = await fetchPodcastsWithRetry(CONFIG.CDN_URL);

    if (!Array.isArray(podcasts) || podcasts.length === 0) {
      throw new Error('Nenhum podcast encontrado');
    }

    podcasts = podcasts.map(p => ({
      data: p.data || '',
      tit: p.tit || 'Sem título',
      intervistato: p.intervistato || '',
      descrizione: p.descrizione || '',
      audio: p.audio || ''
    }));

    dati.listaPodcast = sortPodcasts(podcasts);
    saveToCache(podcasts);

    dati.isLoading = false;
    renderPodcasts();
    renderPaginacao();

    console.log(`✅ ${dati.listaPodcast.length} podcasts carregados com sucesso`);

  } catch (error) {
    console.error('❌ Erro ao carregar podcasts:', error);
    dati.isLoading = false;
    showError(getCorsErrorMessage(error));
  }
}

function retryLoadPodcasts() {
  localStorage.removeItem(CONFIG.CACHE_KEY);
  loadPodcasts();
}


function getFromCache() {
  const cached = localStorage.getItem(CONFIG.CACHE_KEY);
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CONFIG.CACHE_DURATION) {
      localStorage.removeItem(CONFIG.CACHE_KEY);
      return null;
    }
    console.log('💾 Cache válido encontrado');
    return data;
  } catch (error) {
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
    console.log('💾 Podcasts salvos em cache');
  } catch (error) {
    console.error('Erro ao salvar cache:', error);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const podcastDiv = (podcast) => `
  <div id="pod" class="row">
    <div class="grid">
      <div class="icon">
        <img src="${UI.coverImage}" alt="Podcast icon" class="img-responsive" loading="lazy"/>
      </div>
      <div class="info">
        <span class="data">${escapeHtml(podcast.data)}</span>
        <h2>
          ${escapeHtml(podcast.tit)}
          <span class="sub-tit">${escapeHtml(podcast.intervistato)}</span>
        </h2>
        <p>${escapeHtml(podcast.descrizione)}</p>
        <div class="podcast">
          <audio controls data-listeners-attached="false">
            <source class="pod-mp3" src="https://www.meusite.com/podcast/sociale/${escapeHtml(podcast.audio)}"/>
          </audio>
        </div>
      </div>
    </div>
  </div>`;

function sortPodcasts(podcasts) {
  return podcasts
    .map(p => ({
      ...p,
      dateObj: new Date(p.data.split('.').reverse().join('-'))
    }))
    .sort((a, b) => b.dateObj - a.dateObj)
    .map(({ dateObj, ...rest }) => rest);
}

function attachAudioListeners() {
  document.querySelectorAll('.podcast audio[data-listeners-attached="false"]').forEach(audio => {
    audio.addEventListener('play', handleAudioClick);
    audio.setAttribute('data-listeners-attached', 'true');
  });
}

function handleAudioClick(event) {
  const clickedAudio = event.currentTarget;
  if (clickedAudio instanceof HTMLAudioElement) {
    if (currentlyPlayingAudio && currentlyPlayingAudio !== clickedAudio) {
      currentlyPlayingAudio.pause();
    }
    currentlyPlayingAudio = clickedAudio;
  }
}

function renderPodcasts() {
  const $tabela = document.querySelector(UI.tableSelector);
  if (!$tabela) return;

  const podcastsInicio = (paginaAtuale - 1) * CONFIG.PODCASTS_PER_PAGE;
  const podcastsFinale = podcastsInicio + CONFIG.PODCASTS_PER_PAGE;

  $tabela.innerHTML = dati.listaPodcast
    .slice(podcastsInicio, podcastsFinale)
    .map(podcastDiv)
    .join('');

  document.querySelectorAll('.row').forEach(line => {
    intersectionObserver.observe(line);
  });

  attachAudioListeners();
}

function renderPaginacao() {
  const $paginacao = document.querySelector(UI.paginationSelector);
  if (!$paginacao) return;

  const numPagine = Math.ceil(dati.listaPodcast.length / CONFIG.PODCASTS_PER_PAGE);

  if (numPagine <= 1) {
    $paginacao.innerHTML = '';
    return;
  }

  let html = '';

  if (paginaAtuale > 1) {
    html += `<li class="pagina" data-pagina="${paginaAtuale - 1}">&laquo;</li>`;
  }

  if (numPagine <= 7) {
    for (let i = 1; i <= numPagine; i++) {
      html += `<li class="pagina ${i === paginaAtuale ? 'active' : ''}" data-pagina="${i}">${i}</li>`;
    }
  } else {
    html += `<li class="pagina" data-pagina="1">1</li>`;
    if (paginaAtuale > 4) html += `<li class="pagina disabled">...</li>`;

    const startPage = Math.max(2, Math.min(paginaAtuale - 1, numPagine - 5));
    const endPage = Math.min(numPagine - 1, Math.max(paginaAtuale + 1, 6));

    for (let i = startPage; i <= endPage; i++) {
      html += `<li class="pagina ${i === paginaAtuale ? 'active' : ''}" data-pagina="${i}">${i}</li>`;
    }

    if (paginaAtuale < numPagine - 3) html += `<li class="pagina disabled">...</li>`;
    html += `<li class="pagina" data-pagina="${numPagine}">${numPagine}</li>`;
  }

  if (paginaAtuale < numPagine) {
    html += `<li class="pagina" data-pagina="${paginaAtuale + 1}">&raquo;</li>`;
  }

  $paginacao.innerHTML = html;
}

function handlePaginaClick(event) {
  if (!event.target.classList.contains('pagina') || event.target.classList.contains('disabled')) return;

  const activePage = document.querySelector('.pagina.active');
  if (activePage) activePage.classList.remove('active');

  event.target.classList.add('active');
  paginaAtuale = parseInt(event.target.dataset.pagina, 10);

  document.querySelector(UI.tableSelector).scrollIntoView({ behavior: 'smooth', block: 'start' });

  renderPodcasts();
  renderPaginacao();
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando carregamento de podcasts');
  console.log(`📚 Repositório: ${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}`);
  console.log(`🔗 URL: ${CONFIG.CDN_URL}`);
  
  loadPodcasts();
  const paginacao = document.querySelector(UI.paginationSelector);
  if (paginacao) {
    paginacao.addEventListener('click', handlePaginaClick);
  }
});
