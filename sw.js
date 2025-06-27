// Este é um Service Worker muito básico.
// Por enquanto, ele apenas regista a sua presença.
// No futuro, usaremos este ficheiro para cache de ficheiros (modo offline) e notificações push.

self.addEventListener('install', (event) => {
  console.log('Service Worker: a instalar...');
  // A ação de 'skipWaiting' força o novo service worker a ativar-se imediatamente.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: ativado e pronto para controlar a aplicação!');
  // Garante que o service worker assume o controlo da página imediatamente.
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Por agora, não faremos nada com os pedidos de rede.
  // Apenas deixamos que continuem normalmente.
  // No futuro, iremos intercetar estes pedidos para servir ficheiros da cache.
  return;
});
