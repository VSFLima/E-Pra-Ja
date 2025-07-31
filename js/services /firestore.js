/* E-Pra-Já v4: Serviço de Interação com o Firestore (firestore.js) */
/* Localização: /js/services/firestore.js */

// --- 1. IMPORTAÇÕES ---
import { db } from './firebase-config.js';
import {
  doc, getDoc, getDocs, collection, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, setDoc, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. FUNÇÕES DE LEITURA (GET) ---

export const getRestauranteById = async (id) => {
    try {
        const docRef = doc(db, "restaurantes", id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) { console.error("Erro ao buscar restaurante:", error); throw error; }
};

export const getTodosRestaurantes = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "restaurantes"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { console.error("Erro ao buscar todos os restaurantes:", error); throw error; }
};

export const getTodosUtilizadores = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "utilizadores"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { console.error("Erro ao buscar todos os utilizadores:", error); throw error; }
};

// --- 3. FUNÇÕES DE GESTÃO DE RESTAURANTES (ADMIN) ---

export const criarRestaurantePeloAdmin = async (dadosRestaurante, dadosUsuario) => {
    // ... (Lógica para criar restaurante, requer criação manual do Auth)
};

export const atualizarRestaurantePeloAdmin = async (restauranteId, donoId, dadosRestaurante, dadosUsuario) => {
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, "restaurantes", restauranteId), dadosRestaurante);
        if (donoId) {
            batch.update(doc(db, "utilizadores", donoId), dadosUsuario);
        }
        await batch.commit();
    } catch (error) { console.error("Erro ao atualizar restaurante:", error); throw error; }
};

export const atualizarStatusRestaurante = async (restauranteId, novoStatus) => {
    try {
        await updateDoc(doc(db, "restaurantes", restauranteId), { status: novoStatus });
    } catch (error) { console.error("Erro ao atualizar status do restaurante:", error); throw error; }
};

export const apagarRestauranteCompleto = async (restauranteId) => {
    // IMPORTANTE: Esta função apaga apenas o documento principal.
    // Subcoleções (cardapio, pedidos) e imagens precisam ser apagadas via Cloud Function para uma limpeza completa.
    try {
        await deleteDoc(doc(db, "restaurantes", restauranteId));
    } catch (error) { console.error("Erro ao apagar restaurante:", error); throw error; }
};

// --- 4. FUNÇÕES DE GESTÃO DE USUÁRIOS ---

export const criarUsuarioEntregador = async (email, senha, nome, restauranteId) => {
    // IMPORTANTE: Requer a criação manual do login no Firebase Auth pelo gestor.
    try {
        const userDocRef = doc(collection(db, "utilizadores"));
        await setDoc(userDocRef, {
            email: email, nome: nome, role: "entregador",
            status: "ativo", restauranteId: restauranteId
        });
    } catch (error) { console.error("Erro ao criar entregador:", error); throw error; }
};

export const apagarUsuarioCompleto = async (userId) => {
    // IMPORTANTE: A exclusão do usuário no Firebase Auth deve ser feita manualmente.
    try {
        await deleteDoc(doc(db, "utilizadores", userId));
    } catch (error) { console.error("Erro ao apagar usuário:", error); throw error; }
};

export const atualizarStatusUsuario = async (userId, novoStatus) => {
    try {
        await updateDoc(doc(db, "utilizadores", userId), { status: novoStatus });
    } catch (error) { console.error("Erro ao atualizar status do usuário:", error); throw error; }
};

// --- 5. FUNÇÕES DE NEGÓCIO (COBRANÇA, MENSAGENS) ---

export const solicitarDesbloqueio = async (restauranteId) => {
    try {
        await updateDoc(doc(db, "restaurantes", restauranteId), { solicitouDesbloqueio: true });
    } catch (error) { console.error("Erro ao solicitar desbloqueio:", error); throw error; }
};

export const aprovarDesbloqueio = async (restauranteId) => {
    try {
        const novaData = new Date();
        novaData.setDate(novaData.getDate() + 30); // Libera por 30 dias
        await updateDoc(doc(db, "restaurantes", restauranteId), {
            accessValidUntil: Timestamp.fromDate(novaData),
            statusPagamento: 'pago',
            solicitouDesbloqueio: false
        });
    } catch (error) { console.error("Erro ao aprovar desbloqueio:", error); throw error; }
};

export const enviarMensagemGlobal = async (grupoAlvo, textoMensagem) => {
    try {
        await addDoc(collection(db, "mensagensGlobais"), {
            grupoAlvo: grupoAlvo,
            texto: textoMensagem,
            timestamp: Timestamp.now()
        });
    } catch (error) { console.error("Erro ao enviar mensagem:", error); throw error; }
};

// --- 6. FUNÇÕES EM TEMPO REAL (onSnapshot) ---

export const onPedidosUpdate = (restauranteId, callback) => {
  const q = query(collection(db, "restaurantes", restauranteId, "pedidos"));
  return onSnapshot(q, (snapshot) => {
    const pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    pedidos.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
    callback(pedidos);
  });
};

