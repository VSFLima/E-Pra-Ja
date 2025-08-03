/* E-Pra-Já v4: Serviço de Autenticação (auth.js) */
/* Localização: /js/services/auth.js */

// --- 1. IMPORTAÇÕES ---
import { db, auth } from '../firebase-config.js';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { doc, getDoc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// --- 2. FUNÇÕES DE AUTENTICAÇÃO EXPORTADAS ---

/**
 * (NOVO E COMPLETO) Registra um novo RESTAURANTE. Esta função é a única
 * responsável por todo o fluxo: cria o login, o documento do usuário e o
 * documento do restaurante em uma única operação segura.
 * @param {string} email - O e-mail do usuário.
 * @param {string} password - A senha do usuário.
 * @param {object} dadosUsuario - Dados para a coleção 'utilizadores'.
 * @param {object} dadosRestaurante - Dados para a coleção 'restaurantes'.
 * @returns {Promise<UserCredential>} O objeto com as credenciais do usuário.
 */
export const registerRestaurante = async (email, password, dadosUsuario, dadosRestaurante) => {
  try {
    // Passo 1: Cria o usuário no serviço de Autenticação
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Passo 2: Usa uma "writeBatch" para garantir que ambas as escritas no Firestore
    // aconteçam juntas, ou nenhuma delas acontece. Isso evita inconsistências.
    const batch = writeBatch(db);

    // Prepara a criação do documento na coleção 'utilizadores'
    const userDocRef = doc(db, "utilizadores", user.uid);
    batch.set(userDocRef, {
      email: user.email,
      ...dadosUsuario
    });

    // Prepara a criação do documento na coleção 'restaurantes'
    const restauranteDocRef = doc(db, "restaurantes", user.uid);
    batch.set(restauranteDocRef, {
      donoId: user.uid, // Garante que o donoId é o mesmo do usuário criado
      ...dadosRestaurante
    });

    // Passo 3: Executa a operação em lote
    await batch.commit();

    return userCredential;
  } catch (error) {
    console.error("Erro ao registrar restaurante:", error.message);
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
    console.error("Erro ao buscar perfil do usuário:", error.message);
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

