const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configura tus credenciales de correo (asegúrate de haberlas establecido en Firebase)
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

const mailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailEmail,
        pass: gmailPassword,
    },
});

// Esta es la función que se dispara al crear un documento en la colección 'mail'
exports.sendWelcomeEmail = functions.firestore
  .document('mail/{docId}')
  .onCreate(async (snap, context) => {
    const mailData = snap.data();

    const mailOptions = {
      from: '"3D Print Manager" <noreply@your-project-id.firebaseapp.com>', // Puedes personalizar el remitente
      to: mailData.to,
      subject: mailData.message.subject,
      html: mailData.message.html,
    };

    try {
      await mailTransport.sendMail(mailOptions);
      console.log(`Correo de bienvenida enviado a: ${mailData.to}`);
      // Opcional: puedes eliminar el documento de la colección 'mail' después de enviarlo.
      // return snap.ref.delete();
      return null;
    } catch (error) {
      console.error("Hubo un error al enviar el correo:", error);
      return null;
    }
  });