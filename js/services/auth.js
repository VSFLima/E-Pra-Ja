/* E-Pra-Já v4: Serviço de Autenticação (auth.js) */
/* Localização: /js/services/auth.js */

// --- 1. IMPORTAÇÕES (CORRIGIDAS) ---
// Importa os serviços de Auth e DB que configuramos no firebase-config.js
import { db, auth } from '../firebase-config.js';

// As importações agora usam os links CDN completos, que funcionam em qualquer hospedagem.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";


// --- 2. FUNÇÕES DE AUTENTICAÇÃO EXPORTADAS ---

/**
 * (COMPLETO) Regista um novo utilizador no Firebase Auth e cria o seu
 * documento de dados no Firestore.
 * @param {string} email - O e-mail do utilizador.
 * @param {string} password - A senha do utilizador.
 * @param {object} additionalData - Dados para o documento 'utilizadores' (nome, cpf, role).
 * @returns {Promise<UserCredential>} O objeto com as credenciais do utilizador.
 */
export const registerUser = async (email, password, additionalData) => {
  try {
    // Cria o utilizador no serviço de Autenticação
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Cria o documento de dados na coleção 'utilizadores'
    const userDocRef = doc(db, "utilizadores", user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      ...additionalData
    });

    return userCredential;
  } catch (error) {
    console.error("Erro ao registar utilizador:", error.message);
    throw error;
  }
};

/**
 * Autentica um utilizador existente com e-mail e senha.
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
 * Desconecta o utilizador atualmente logado.
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error)
    console.error("Erro ao fazer logout:", error.message);
    throw error;
  }
};

/**
 * Observa mudanças no estado de autenticação (login/logout).
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Busca o perfil (role) de um utilizador no Firestore.
 */
export const getUserRole = async (uid) => {
  try {
    if (!uid) return null;
    const userDocRef = doc(db, "utilizadores", uid);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data().role : null;
  } catch (error) {
    console.error("Erro ao buscar perfil do utilizador:", error.message);
    throw error;
  }
};

/**
 * Envia um e-mail de redefinição de senha.
 */
export const sendPasswordReset = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição:", error.message);
        throw error;
    }
};

