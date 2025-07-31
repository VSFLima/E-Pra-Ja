/* E-Pra-Já: Arquivo de Configuração do Firebase (firebase-config.js) */
/* Localização: /js/firebase-config.js */

// Importação das funções necessárias dos módulos do Firebase SDK
// Usaremos a versão modular (v9+) que é mais eficiente.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// As suas credenciais do Firebase, baseadas nas informações que você forneceu.
// É seguro ter estas informações no frontend, pois as Regras de Segurança
// do Firestore protegerão os seus dados.
const firebaseConfig = {
  apiKey: "AIzaSyCJE6X2-zdyHNQHRpvWwqigV06A8EqqJnU",
  authDomain: "e-pra-ja-pedidos.firebaseapp.com",
  projectId: "e-pra-ja-pedidos",
  storageBucket: "e-pra-ja-pedidos.appspot.com",
  messagingSenderId: "721284362464",
  // IMPORTANTE: O "appId" é específico para cada app web que você cria no Firebase.
  // Para encontrar o seu, vá em:
  // Configurações do Projeto > Geral > Seus apps > Configuração do SDK.
  // E cole o valor aqui.
  appId: "1:721284362464:web:COLE_SEU_APP_ID_AQUI"
};

// --- INICIALIZAÇÃO DOS SERVIÇOS ---

// Inicializa a aplicação Firebase com as configurações fornecidas.
const app = initializeApp(firebaseConfig);

// Obtém a instância do serviço de Autenticação.
// Usaremos esta variável para fazer login, registar, etc.
const auth = getAuth(app);

// Obtém a instância do serviço do Firestore (banco de dados).
// Usaremos esta variável para ler e escrever dados nos restaurantes, pedidos, etc.
const db = getFirestore(app);


// --- EXPORTAÇÃO DOS MÓDULOS ---

// Exportamos as instâncias 'auth' e 'db' para que outros arquivos JS
// no nosso projeto possam importá-las e usar os serviços do Firebase.
export { db, auth };

