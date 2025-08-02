/* E-Pra-Já v4: Serviço de Autenticação (auth.js) */
/* Localização: /js/services/auth.js */

// --- 1. IMPORTAÇÕES ---
import { db, auth } from '../firebase-config.js';

import {
  createUserWithEmailAndPassword, // (ESSENCIAL) Função para criar usuários
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";


// --- 2. FUNÇÕES DE AUTENTICAÇÃO EXPORTADAS ---

/**
 * (NOVO E COMPLETO) Registra um novo usuário no Firebase Auth e cria seu
 * documento de dados no Firestore.
 * @param {string} email - O e-mail do usuário.
 * @param {string} password - A senha do usuário.
 * @param {object} additionalData - Dados para o documento 'utilizadores' (nome, cpf, role).
 * @returns {Promise<UserCredential>} O objeto com as credenciais do usuário.
 */
export const registerUser = async (email, password, additionalData) => {
  try {
    // Cria o usuário no serviço de Autenticação
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
    console.error("Erro ao registrar usuário:", error.message);
    throw error;
  }
};

/**
 * Autentica um usuário existente com e-mail e senha.
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
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Busca o perfil (role) de um usuário no Firestore.
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
 */
export const sendPasswordReset = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição:", error);
        throw error;
    }
};

