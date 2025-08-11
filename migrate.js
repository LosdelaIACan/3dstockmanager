// migrate.js (versión con 'import')

import admin from 'firebase-admin';
import { createRequire } from 'module';

// Necesario para importar un archivo JSON en ES Modules
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateUsers() {
  console.log('Iniciando migración de usuarios...');

  try {
    const listUsersResult = await admin.auth().listUsers(1000);

    for (const userRecord of listUsersResult.users) {
      const user = userRecord.toJSON();
      console.log(`Procesando usuario: ${user.email} (${user.uid})`);

      const orgQuery = await db.collection('organizations').where('ownerId', '==', user.uid).get();
      
      if (!orgQuery.empty) {
        console.log(` -> El usuario ya tiene una organización. Saltando.`);
        continue;
      }

      console.log(` -> Creando nueva organización...`);
      const orgRef = db.collection('organizations').doc();
      await orgRef.set({
        ownerId: user.uid,
        name: `${user.email}'s Organization`,
        members: [{ uid: user.uid, email: user.email, role: 'owner' }]
      });
      console.log(` -> Organización creada con ID: ${orgRef.id}`);

      const oldProjectsRef = db.collection('users').doc(user.uid).collection('projects');
      const oldProjectsSnapshot = await oldProjectsRef.get();

      if (oldProjectsSnapshot.empty) {
        console.log(` -> No se encontraron proyectos antiguos para migrar.`);
      } else {
        console.log(` -> Migrando ${oldProjectsSnapshot.size} proyectos antiguos...`);
        const newProjectsRef = orgRef.collection('projects');
        
        const batch = db.batch();
        oldProjectsSnapshot.forEach(doc => {
          const projectData = doc.data();
          const newProjectRef = newProjectsRef.doc(doc.id);
          batch.set(newProjectRef, projectData);
        });

        await batch.commit();
        console.log(` -> Proyectos migrados exitosamente.`);
      }
    }
    console.log('¡Migración completada!');
  } catch (error) {
    console.error('Ocurrió un error durante la migración:', error);
  }
}

migrateUsers();
