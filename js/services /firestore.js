/* E-Pra-Já v3: Serviço de Interação com o Firestore (firestore.js) */
/* Localização: /js/services/firestore.js */

// --- 1. IMPORTAÇÕES ---
import { db, auth } from '../firebase-config.js';
import {
  doc, getDoc, getDocs, collection, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, setDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. FUNÇÕES DE LEITURA (GET) ---

export const getTodosRestaurantes = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "restaurantes"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { console.error("Erro ao buscar restaurantes:", error); throw error; }
};

export const getTodosUtilizadores = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "utilizadores"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { console.error("Erro ao buscar utilizadores:", error); throw error; }
};

// --- 3. FUNÇÕES DE ESCRITA E MANIPULAÇÃO (CRUD) ---

/**
 * (v3) Cria um novo usuário para um entregador.
 * IMPORTANTE: A criação de usuários no Auth a partir do cliente é uma simplificação para a v3.
 * A solução ideal e 100% segura para produção em larga escala é usar uma Cloud Function.
 */
export const criarUsuarioEntregador = async (email, senha, nome, restauranteId) => {
    // Simulação para a v3 sem Cloud Functions:
    // Esta abordagem requer que o GESTOR crie manualmente o login no painel do Firebase Auth.
    try {
        const userDocRef = doc(collection(db, "utilizadores")); // Cria um ID aleatório
        await setDoc(userDocRef, {
            email: email,
            nome: nome,
            role: "entregador",
            restauranteId: restauranteId
        });
        console.log(`Documento do entregador ${nome} criado. Lembre-se de criar o login para ${email} no painel do Firebase Auth.`);
    } catch (error) { console.error("Erro ao criar usuário entregador:", error); throw error; }
};

/**
 * (v3) Apaga o documento de um usuário no Firestore.
 * IMPORTANTE: A exclusão do usuário no Firebase Auth deve ser feita manualmente pelo gestor.
 */
export const apagarUsuarioCompleto = async (userId) => {
    try {
        await deleteDoc(doc(db, "utilizadores", userId));
        console.log(`Documento do usuário ${userId} apagado. Lembre-se de apagar o usuário no painel do Firebase Auth.`);
    } catch (error) { console.error("Erro ao apagar usuário:", error); throw error; }
};

/**
 * (NOVA FUNÇÃO v3) Salva uma cópia de um pedido no histórico do cliente.
 * @param {string} userId - O ID do cliente que fez o pedido.
 * @param {object} dadosPedido - O objeto completo do pedido.
 * @param {string} nomeRestaurante - O nome do restaurante onde o pedido foi feito.
 */
export const salvarPedidoNoHistoricoCliente = async (userId, dadosPedido, nomeRestaurante) => {
    if (!userId) return; // Não salva histórico para clientes não logados
    try {
        const historicoRef = collection(db, "utilizadores", userId, "historicoPedidos");
        // Cria uma cópia simplificada para o histórico
        const pedidoHistorico = {
            ...dadosPedido,
            nomeRestaurante: nomeRestaurante
        };
        await addDoc(historicoRef, pedidoHistorico);
    } catch (error) {
        console.error("Erro ao salvar pedido no histórico do cliente:", error);
        // Não lançamos o erro para não interromper o fluxo de checkout do restaurante.
    }
};

// --- 4. FUNÇÕES EM TEMPO REAL (onSnapshot) ---

/**
 * Escuta por novos pedidos em tempo real para um restaurante.
 */
export const onPedidosUpdate = (restauranteId, callback) => {
  const pedidosColRef = collection(db, "restaurantes", restauranteId, "pedidos");
  const q = query(pedidosColRef);

  return onSnapshot(q, (querySnapshot) => {
    const pedidos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    pedidos.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
    callback(pedidos);
  });
};

