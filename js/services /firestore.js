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

export const getHistoricoEntregador = async (entregadorId) => {
    let todasAsEntregas = [];
    try {
        const restaurantesSnapshot = await getDocs(collection(db, "restaurantes"));
        for (const restauranteDoc of restaurantesSnapshot.docs) {
            const restauranteId = restauranteDoc.id;
            const pedidosRef = collection(db, "restaurantes", restauranteId, "pedidos");
            const q = query(pedidosRef, where("entregadorId", "==", entregadorId), where("status", "==", "Entregue"));
            const pedidosSnapshot = await getDocs(q);
            pedidosSnapshot.forEach(pedidoDoc => {
                todasAsEntregas.push({ id: pedidoDoc.id, ...pedidoDoc.data() });
            });
        }
        return todasAsEntregas.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    } catch (error) {
        console.error("Erro ao buscar histórico do entregador:", error);
        throw error;
    }
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

export const apagarRestauranteCompleto = async (restauranteId) => {
    try {
        await deleteDoc(doc(db, "restaurantes", restauranteId));
    } catch (error) { console.error("Erro ao apagar restaurante:", error); throw error; }
};

export const atualizarStatusRestaurante = async (restauranteId, novoStatus) => {
    try {
        await updateDoc(doc(db, "restaurantes", restauranteId), { status: novoStatus });
    } catch (error) { console.error("Erro ao atualizar status do restaurante:", error); throw error; }
};

// --- 4. FUNÇÕES DE GESTÃO DE USUÁRIOS ---

export const criarUsuarioEntregador = async (email, nome, restauranteId) => {
    try {
        const userDocRef = doc(collection(db, "utilizadores"));
        await setDoc(userDocRef, {
            email: email, nome: nome, role: "entregador",
            status: "ativo", restauranteId: restauranteId
        });
    } catch (error) { console.error("Erro ao criar entregador:", error); throw error; }
};

export const apagarUsuarioCompleto = async (userId) => {
    try {
        await deleteDoc(doc(db, "utilizadores", userId));
    } catch (error) { console.error("Erro ao apagar usuário:", error); throw error; }
};

export const atualizarStatusUsuario = async (userId, novoStatus) => {
    try {
        await updateDoc(doc(db, "utilizadores", userId), { status: novoStatus });
    } catch (error) { console.error("Erro ao atualizar status do usuário:", error); throw error; }
};

// --- 5. FUNÇÕES DE GESTÃO DE CARDÁPIO E PEDIDOS ---

export const salvarItemCardapio = async (restauranteId, itemId, itemData) => {
    try {
        const cardapioRef = collection(db, "restaurantes", restauranteId, "cardapio");
        if (itemId) {
            await updateDoc(doc(cardapioRef, itemId), itemData);
        } else {
            await addDoc(cardapioRef, itemData);
        }
    } catch (error) { console.error("Erro ao salvar item do cardápio:", error); throw error; }
};

export const apagarItemCardapio = async (restauranteId, itemId) => {
    try {
        await deleteDoc(doc(db, "restaurantes", restauranteId, "cardapio", itemId));
    } catch (error) { console.error("Erro ao apagar item do cardápio:", error); throw error; }
};

export const criarPedido = async (restauranteId, dadosPedido) => {
    try {
        return await addDoc(collection(db, "restaurantes", restauranteId, "pedidos"), dadosPedido);
    } catch (error) { console.error("Erro ao criar pedido:", error); throw error; }
};

export const atualizarStatusPedido = async (restauranteId, pedidoId, novoStatus) => {
    try {
        await updateDoc(doc(db, "restaurantes", restauranteId, "pedidos", pedidoId), { status: novoStatus });
    } catch (error) { console.error("Erro ao atualizar status do pedido:", error); throw error; }
};

export const atribuirEntregadorPedido = async (restauranteId, pedidoId, entregadorId, taxaEntrega) => {
    try {
        await updateDoc(doc(db, "restaurantes", restauranteId, "pedidos", pedidoId), {
            entregadorId: entregadorId,
            taxaDeEntrega: taxaEntrega,
            status: "Saiu para entrega"
        });
    } catch (error) { console.error("Erro ao atribuir entregador:", error); throw error; }
};

// --- 6. FUNÇÕES DE NEGÓCIO (COBRANÇA, MENSAGENS, ASSINATURA) ---

export const solicitarDesbloqueio = async (restauranteId) => {
    try {
        await updateDoc(doc(db, "restaurantes", restauranteId), { solicitouDesbloqueio: true });
    } catch (error) { console.error("Erro ao solicitar desbloqueio:", error); throw error; }
};

export const aprovarDesbloqueio = async (restauranteId) => {
    try {
        const novaData = new Date();
        novaData.setDate(novaData.getDate() + 30);
        await updateDoc(doc(db, "restaurantes", restauranteId), {
            accessValidUntil: Timestamp.fromDate(novaData),
            statusPagamento: 'pago',
            solicitouDesbloqueio: false
        });
    } catch (error) { console.error("Erro ao aprovar desbloqueio:", error); throw error; }
};

export const concederAcessoManual = async (restauranteId, dias) => {
    try {
        const novaData = new Date();
        if (dias >= 36500) {
            novaData.setFullYear(novaData.getFullYear() + 100);
        } else {
            novaData.setDate(novaData.getDate() + dias);
        }
        await updateDoc(doc(db, "restaurantes", restauranteId), {
            accessValidUntil: Timestamp.fromDate(novaData),
            statusPagamento: 'pago'
        });
    } catch (error) { console.error("Erro ao conceder acesso manual:", error); throw error; }
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

export const salvarPedidoNoHistoricoCliente = async (userId, dadosPedido, nomeRestaurante) => {
    if (!userId) return;
    try {
        const historicoRef = collection(db, "utilizadores", userId, "historicoPedidos");
        await addDoc(historicoRef, { ...dadosPedido, nomeRestaurante: nomeRestaurante });
    } catch (error) { console.error("Erro ao salvar no histórico:", error); }
};

