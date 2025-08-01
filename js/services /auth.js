/* E-Pra-Já v4: Serviço de Autenticação (auth.js) */
/* Localização: /js/services/auth.js */

// --- 1. IMPORTAÇÕES ---
// Importa os serviços de Auth e DB que configuramos no firebase-config.js
import { db, auth } from '../firebase-config.js';

// Importa todas as funções de Autenticação que vamos usar
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// Importa as funções do Firestore para buscar o perfil do usuário
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";


// --- 2. FUNÇÕES DE AUTENTICAÇÃO EXPORTADAS ---

/**
 * Autentica um usuário existente com e-mail e senha.
 * @param {string} email - O e-mail do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<UserCredential>} O objeto com as credenciais do usuário.
 */
export const loginUser = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Erro ao fazer login:", error.message);
    throw error; // Lança o erro para ser tratado no script que chamou
  }
};

/**
 * Desconecta o usuário atualmente logado.
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao fazer logout:", error.message);
    throw error;
  }
};

/**
 * Observa mudanças no estado de autenticação (login/logout).
 * @param {function} callback - Função a ser executada quando o estado muda.
 * Ela recebe o objeto 'user' (ou null) como argumento.
 * @returns {Unsubscribe} Uma função para cancelar o observador.
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Busca o perfil (role) de um usuário no Firestore.
 * @param {string} uid - O ID do usuário.
 * @returns {Promise<string|null>} A role do usuário ou null se não for encontrado.
 */
export const getUserRole = async (uid) => {
  try {
    if (!uid) return null;
    const userDocRef = doc(db, "utilizadores", uid);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data().role : null;
  } catch (error) {
    console.error("Erro ao buscar perfil do usuário:", error);
    throw error;
  }
};

/**
 * Envia um e-mail de redefinição de senha.
 * @param {string} email - O e-mail do usuário que solicitou a redefinição.
 * @returns {Promise<void>}
 */
export const sendPasswordReset = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição:", error);
        throw error;
    }
};

