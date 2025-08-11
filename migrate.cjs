// migrate.cjs

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateData() {
  console.log('Iniciando migración de datos...');

  // --- PARTE 1: Migrar usuarios antiguos que no tienen organización ---
  const listUsersResult = await admin.auth().listUsers(1000);
  for (const userRecord of listUsersResult.users) {
    const user = userRecord.toJSON();
    const orgQuery = await db.collection('organizations').where('ownerId', '==', user.uid).get();
    if (orgQuery.empty) {
      console.log(`Creando organización para usuario antiguo: ${user.email}`);
      const orgRef = db.collection('organizations').doc();
      await orgRef.set({
        ownerId: user.uid,
        name: `${user.email}'s Organization`,
        members: [{ uid: user.uid, email: user.email, role: 'owner' }],
        memberUIDs: [user.uid] // Añadimos el campo clave
      });
    }
  }

  // --- PARTE 2: Asegurar que TODAS las organizaciones tengan el campo 'memberUIDs' ---
  console.log("Verificando y actualizando todas las organizaciones...");
  const allOrgsSnapshot = await db.collection('organizations').get();
  const batch = db.batch();

  allOrgsSnapshot.forEach(doc => {
    const orgData = doc.data();
    // Si no tiene el campo 'memberUIDs' o está mal formado
    if (!orgData.memberUIDs || !Array.isArray(orgData.memberUIDs)) {
      console.log(`Actualizando organización: ${doc.id}`);
      const uids = orgData.members.map(m => m.uid); // Extraemos los UIDs del array 'members'
      const orgRef = db.collection('organizations').doc(doc.id);
      batch.update(orgRef, { memberUIDs: uids });
    }
  });

  await batch.commit();
  console.log('¡Migración completada!');
}

migrateData();
