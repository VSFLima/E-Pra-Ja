/* E-Pra-Já v4: Arquivo de Configuração do Firebase (firebase-config.js) */
/* Localização: /js/firebase-config.js */
/* Este arquivo é a "tomada de energia" principal que conecta seu site ao Firebase. */

// --- 1. IMPORTAÇÕES (CORRIGIDAS) ---
// As importações agora usam os links CDN completos, que funcionam em qualquer hospedagem.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

// --- 2. CONFIGURAÇÃO DO FIREBASE (COMPLETA E CORRIGIDA) ---
// Estas são as suas credenciais oficiais, agora com o appId correto.
const firebaseConfig = {
  apiKey: "AIzaSyCJE6X2-zdyHNQHRpvWwqigV06A8EqqJnU",
  authDomain: "e-pra-ja-pedidos.firebaseapp.com",
  projectId: "e-pra-ja-pedidos",
  storageBucket: "e-pra-ja-pedidos.appspot.com",
  messagingSenderId: "721284362464",
  appId: "1:721284362464:web:f6e2dd8045694c5d05e085"
};

// --- 3. INICIALIZAÇÃO DOS SERVIÇOS ---
// Inicializa a aplicação Firebase com as configurações fornecidas.
const app = initializeApp(firebaseConfig);

// Obtém e prepara os serviços para serem usados em todo o site.
const auth = getAuth(app); // Serviço de Autenticação (login, cadastro)
const db = getFirestore(app); // Serviço de Banco de Dados (Firestore)
const storage = getStorage(app); // Serviço de Armazenamento de Arquivos (para imagens)


// --- 4. EXPORTAÇÃO DOS MÓDULOS ---
// Exportamos as instâncias para que outros arquivos JS possam usá-las.
export { db, auth, storage };

