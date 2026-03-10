const CONFIG = {
  jsonUrl: 'https://cdn.jsdelivr.net/gh/dannypalmeira/podcast-data@main/data/podcasts.json',
  coverPodcast: 'https://www.klasseuno.it/podcast/images/podcast-cover.jpg',
  audioBaseUrl: 'https://www.klasseuno.it/podcast/sociale/',
  podcastsPerPagina: 12,
};

let paginaAtuale = 1;
let currentlyPlayingAudio = null;
let intersectionObserver = null;
let sortedListaPodcast = [];

const podcastDiv = (podcast) => `
  <div class="pod row">
    <div class="grid">
      <div class="icon">
        <img src="${CONFIG.coverPodcast}" alt="Per in Sociale - Podcast icon" class="img-responsive"/>
      </div>
      <div class="info">
        <span class="data">${podcast.data}</span>
        <h2>${podcast.tit}<span class="sub-tit">${podcast.intervistato}</span></h2>
        <p>${podcast.descrizione}</p>
        <div class="podcast">
          <audio controls>
            <source class="pod-mp3" src="${CONFIG.audioBaseUrl}${podcast.audio}">
          </audio>
        </div>
      </div>
    </div>
    <div class="clear"><div class="space"></div></div>
  </div>`;

function renderPodcasts() {
  const $tabela = document.querySelector('#tabela');
  const inicio = (paginaAtuale - 1) * CONFIG.podcastsPerPagina;
  const fim = inicio + CONFIG.podcastsPerPagina;

  $tabela.innerHTML = sortedListaPodcast
    .slice(inicio, fim)
    .map(podcastDiv)
    .join('');

  $tabela.querySelectorAll('.podcast audio:not(.event-listener-added)').forEach((audio) => {
    audio.addEventListener('play', handleAudioPlay);
    audio.classList.add('event-listener-added');
  });

  if (intersectionObserver) intersectionObserver.disconnect();

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('show', entry.isIntersecting);
      });
    },
    { threshold: 0.2 }
  );

  $tabela.querySelectorAll('.row').forEach((row) => intersectionObserver.observe(row));
}

function renderPaginazione() {
  const $paginazione = document.querySelector('#paginazione');
  const numPagine = Math.ceil(sortedListaPodcast.length / CONFIG.podcastsPerPagina);
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

    let startPage = Math.max(2, paginaAtuale - 1);
    let endPage = Math.min(numPagine - 1, paginaAtuale + 1);

    if (paginaAtuale < 5) {
      endPage = Math.min(5, numPagine - 1);
    } else if (paginaAtuale > numPagine - 4) {
      startPage = Math.max(numPagine - 4, 2);
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<li class="pagina ${i === paginaAtuale ? 'active' : ''}" data-pagina="${i}">${i}</li>`;
    }

    if (paginaAtuale < numPagine - 3) html += `<li class="pagina disabled">...</li>`;

    html += `<li class="pagina" data-pagina="${numPagine}">${numPagine}</li>`;
  }

  if (paginaAtuale < numPagine) {
    html += `<li class="pagina" data-pagina="${paginaAtuale + 1}">&raquo;</li>`;
  }

  $paginazione.innerHTML = html;
}

function handleAudioPlay(event) {
  const audioAtivo = event.currentTarget;
  if (currentlyPlayingAudio && currentlyPlayingAudio !== audioAtivo) {
    currentlyPlayingAudio.pause();
  }
  currentlyPlayingAudio = audioAtivo;
}

function handlePaginaClick(event) {
  const target = event.target;
  if (!target.classList.contains('pagina') || target.classList.contains('disabled')) return;

  document.querySelector('.pagina.active')?.classList.remove('active');
  target.classList.add('active');

  paginaAtuale = parseInt(target.dataset.pagina);

  renderPodcasts();
  renderPaginazione();

  requestAnimationFrame(() => {
    document.getElementById('tabela').scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });
}

function renderLoading() {
  document.querySelector('#tabela').innerHTML = `
    <div class="loading">Caricamento podcast...</div>`;
}

function renderErro() {
  document.querySelector('#tabela').innerHTML = `
    <div class="error">Impossibile caricare i podcast. Riprova più tardi.</div>`;
}

async function init() {
  renderLoading();

  try {
    const response = await fetch(CONFIG.jsonUrl);

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const dati = await response.json();

    sortedListaPodcast = [...dati.listaPodcast].sort((a, b) => {
      const dateA = new Date(a.data.split('.').reverse().join('-'));
      const dateB = new Date(b.data.split('.').reverse().join('-'));
      return dateB - dateA;
    });

    renderPodcasts();
    renderPaginazione();
    document.querySelector('#paginazione').addEventListener('click', handlePaginaClick);

  } catch (err) {
    console.error('Errore nel caricamento del JSON:', err);
    renderErro();
  }
}

init();
