const CACHE_NAME = 'reflex-detail-cache-v1'; // Mude este número para forçar uma atualização (ex: v2, v3)
const urlsToCache = [
  '/',
  '/agendamento.html',
  '/index.html',
  '/meus-agendamentos.html',
  '/manifest.json',
  '/sw.js',
  'https://placehold.co/192x192/4f46e5/ffffff?text=RD',
  'https://placehold.co/512x512/4f46e5/ffffff?text=RD'
];

// Evento de Instalação: guarda os ficheiros da aplicação na cache.
self.addEventListener('install', event => {
  console.log('Service Worker: a instalar nova versão...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: A guardar novos ficheiros na cache');
        // addAll pode falhar se um dos ficheiros não for encontrado.
        // Para mais robustez, poderíamos usar cache.add() individualmente.
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Falha ao guardar ficheiros na cache durante a instalação.', error);
      })
  );
  // Força o novo service worker a ativar-se assim que a instalação terminar.
  self.skipWaiting();
});

// Evento de Ativação: limpa as caches antigas.
self.addEventListener('activate', event => {
  console.log('Service Worker: ativado.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName.startsWith('reflex-detail-cache-') && cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('Service Worker: a limpar cache antiga', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // Garante que o service worker assume o controlo da página imediatamente.
      return self.clients.claim();
    })
  );
});

// Evento Fetch: serve os ficheiros da cache primeiro (estratégia Cache-First).
self.addEventListener('fetch', event => {
  // Ignora pedidos que não sejam GET (ex: POST para o Firebase)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se encontrarmos na cache, retornamos a resposta da cache.
        if (cachedResponse) {
          return cachedResponse;
        }
        // Se não, vamos à rede.
        return fetch(event.request);
      })
  );
});
