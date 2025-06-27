const functions = require("firebase-functions");
const admin = require("firebase-admin");
const webpush = require("web-push");

admin.initializeApp();

const db = admin.firestore();

// Configuração do Web Push (VAPID Keys)
// IMPORTANTE: Substitua estas chaves pelas suas próprias chaves do Firebase.
// Vá em Project Settings > Cloud Messaging > Web configuration > Web Push certificates.
const vapidKeys = {
  publicKey: "BBYYAwUJ5dAVQPbzARM95HobLuDruO1pV1KH6VMd_j1AaURnDi5CHmSPvbPpuv90CsYQ36cJZZppGJvxmrZ4XMg",
  privateKey: "2Ij7evwZn_buJuHSTG0BBA9VA311jN6-4Lx6dLJgfZ0",
};

webpush.setVapidDetails(
  "mailto:gruporeflex.of@gmail.com", // Substitua pelo seu email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Função para enviar notificação quando um agendamento é CRIADO
exports.sendConfirmationOnCreate = functions.firestore
  .document("artifacts/{appId}/public/data/appointments/{appointmentId}")
  .onCreate(async (snap, context) => {
    const appointment = snap.data();
    const customerPhone = appointment.customer.phone;

    console.log(`Novo agendamento criado para ${customerPhone}. A enviar confirmação.`);

    const timeOptions = { hour: '2-digit', minute: '2-digit', timeZone: "America/Sao_Paulo" };
    const dateOptions = { day: '2-digit', month: 'long' };
    const appointmentTime = appointment.startTime.toDate().toLocaleTimeString('pt-BR', timeOptions);
    const appointmentDate = appointment.startTime.toDate().toLocaleDateString('pt-BR', dateOptions);

    const payload = JSON.stringify({
      title: "Agendamento Confirmado!",
      body: `Olá! O seu agendamento na Reflex Detail para ${appointmentDate} às ${appointmentTime} foi confirmado.`,
      icon: "https://placehold.co/192x192/4f46e5/ffffff?text=RD",
    });

    return sendNotificationToCustomer(customerPhone, payload);
  });


// Função agendada para ser executada todos os dias às 8h da manhã.
exports.sendAppointmentReminders = functions.pubsub.schedule("every day 08:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    console.log("A executar a verificação de lembretes de agendamento...");

    // Calcula a data de amanhã
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
    const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

    // Procura por agendamentos para amanhã
    const appointmentsRef = db.collectionGroup("appointments")
      .where("startTime", ">=", startOfTomorrow)
      .where("startTime", "<=", endOfTomorrow)
      .where("status", "==", "Agendado");
      
    const snapshot = await appointmentsRef.get();

    if (snapshot.empty) {
      console.log("Nenhum agendamento encontrado para amanhã.");
      return null;
    }

    const promises = [];

    snapshot.forEach(doc => {
      const appointment = doc.data();
      const customerPhone = appointment.customer.phone;

      console.log(`Encontrado agendamento para o cliente com telefone: ${customerPhone}`);

      const timeOptions = { hour: '2-digit', minute: '2-digit', timeZone: "America/Sao_Paulo" };
      const appointmentTime = appointment.startTime.toDate().toLocaleTimeString('pt-BR', timeOptions);

      const payload = JSON.stringify({
        title: "Lembrete de Agendamento - Reflex Detail",
        body: `Olá! O seu agendamento é amanhã às ${appointmentTime}. Esperamos por si!`,
        icon: "https://placehold.co/192x192/4f46e5/ffffff?text=RD",
      });
      
      promises.push(sendNotificationToCustomer(customerPhone, payload));
    });

    return Promise.all(promises);
  });


/**
 * Função auxiliar para enviar a notificação para um cliente específico.
 * @param {string} customerPhone O número de telefone do cliente.
 * @param {string} payload O conteúdo da notificação.
 * @returns {Promise}
 */
async function sendNotificationToCustomer(customerPhone, payload) {
  const subscriptionsRef = db.collection("pushSubscriptions").doc(customerPhone);
  const subDoc = await subscriptionsRef.get();

  if (subDoc.exists) {
    const subscription = subDoc.data();
    console.log(`A enviar notificação para: ${customerPhone}`);
    return webpush.sendNotification(subscription, payload)
      .catch(error => {
        console.error(`Erro ao enviar notificação para ${customerPhone}:`, error);
        if (error.statusCode === 410) {
          console.log("Subscrição expirada, a remover.");
          return subscriptionsRef.delete();
        }
      });
  } else {
    console.log(`Nenhuma subscrição de notificação encontrada para ${customerPhone}`);
    return null;
  }
}
