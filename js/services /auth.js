/* E-Pra-Já v2: Serviço de Autenticação (auth.js) */
/* Localização: /js/services/auth.js */

// --- 1. IMPORTAÇÕES ---
import { db, auth } from '../firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail // <-- NOVA IMPORTAÇÃO
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";


// --- 2. FUNÇÕES DE AUTENTICAÇÃO ---

/**
 * Registra um novo usuário no Firebase Auth e guarda seus dados
 * na coleção 'usuarios' do Firestore.
 * @param {string} email - O e-mail do usuário.
 * @param {string} password - A senha do usuário.
 * @param {object} additionalData - Dados adicionais para guardar, como nome e role.
 * @returns {Promise<UserCredential>} O objeto com as credenciais do usuário.
 */
export const registerUser = async (email, password, additionalData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDocRef = doc(db, "utilizadores", user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      ...additionalData
    });
    return userCredential;
  } catch (error) {
    console.error("Erro ao registrar usuário:", error.message);
    throw error;
  }
};

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
    throw error;
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
    const userDocRef = doc(db, "utilizadores", uid);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data().role : null;
  } catch (error) {
    console.error("Erro ao buscar perfil do usuário:", error);
    throw error;
  }
};

/**
 * (NOVA FUNÇÃO) Envia um e-mail de redefinição de senha.
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

