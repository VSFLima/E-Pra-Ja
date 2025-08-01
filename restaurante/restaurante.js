/* E-Pra-Já v4: Script do Painel do Restaurante (restaurante.js) */
/* Localização: /restaurante/restaurante.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { 
    criarUsuarioEntregador, 
    apagarUsuarioCompleto, 
    solicitarDesbloqueio,
    salvarItemCardapio,
    apagarItemCardapio,
    atualizarStatusPedido,
    atribuirEntregadorPedido
} from '../js/services/firestore.js'; 
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const nomeRestauranteEl = document.getElementById('nome-restaurante');
const btnLogout = document.getElementById('btn-logout');
const mainContent = document.querySelector('.main-content');
const switchStatusLoja = document.getElementById('switch-status-loja');
const labelStatusLoja = document.getElementById('label-status-loja');
const pedidosTableBodyEl = document.getElementById('pedidos-table-body');
const modalAtribuir = document.getElementById('modal-atribuir');
const selectEntregador = document.getElementById('select-entregador');
const formAtribuir = document.getElementById('form-atribuir');
const fecharModalAtribuirBtn = document.getElementById('fechar-modal-atribuir-btn');
const formCardapio = document.getElementById('form-cardapio');
const tabelaCardapioBody = document.getElementById('tabela-cardapio-body');
const formCardapioTitle = document.getElementById('form-cardapio-title');
const itemIdInput = document.getElementById('item-id');
const formEntregador = document.getElementById('form-entregador');
const listaEntregadoresEl = document.getElementById('lista-entregadores');
const billingPopup = document.getElementById('billing-popup');
const btnJaPaguei = document.getElementById('btn-ja-paguei');
const linkEnviarComprovante = document.getElementById('link-enviar-comprovante');
const managerMessagePopup = document.getElementById('manager-message-popup');
const managerMessageText = document.getElementById('manager-message-text');
const btnFecharMensagem = document.getElementById('btn-fechar-mensagem');

// --- 3. ESTADO DA APLICAÇÃO ---
let meuRestauranteId = null;
let restauranteData = {};
let entregadoresDisponiveis = [];
let pedidoParaAtribuir = null;
let mensagensExibidas = new Set();

// --- 4. FUNÇÕES DE LÓGICA DE NEGÓCIO (Cobrança, Mensagens, Status) ---
function verificarAssinatura(restData) {
    if (!restData.accessValidUntil) return;
    const hoje = new Date();
    const dataValidade = restData.accessValidUntil.toDate();

    if (hoje > dataValidade) {
        mainContent.style.filter = 'blur(5px)';
        billingPopup.classList.add('visible');
        if (restData.solicitouDesbloqueio) {
            btnJaPaguei.textContent = 'Aguardando Confirmação do Gestor';
            btnJaPaguei.disabled = true;
        } else {
            btnJaPaguei.textContent = 'Já paguei, liberar meu acesso por confiança';
            btnJaPaguei.disabled = false;
        }
    } else {
        mainContent.style.filter = 'none';
        billingPopup.classList.remove('visible');
    }
}

function verificarMensagens(restData) {
    onSnapshot(collection(db, "mensagensGlobais"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const msgId = change.doc.id;
            if (change.type === "added" && !mensagensExibidas.has(msgId)) {
                const msg = change.doc.data();
                if (msg.grupoAlvo === 'todos' || msg.grupoAlvo === restData.statusPagamento || msg.grupoAlvo === restData.status) {
                    managerMessageText.textContent = msg.texto;
                    managerMessagePopup.classList.add('visible');
                    mensagensExibidas.add(msgId);
                }
            }
        });
    });
}

// --- 5. FUNÇÕES DE RENDERIZAÇÃO ---
function renderizarPedidos(pedidos) { /* ... (código completo mantido) ... */ }
function renderizarTabelaCardapio(itens) { /* ... (código completo mantido) ... */ }
function renderizarEntregadores(entregadores) { /* ... (código completo mantido) ... */ }

// --- 6. LISTENERS DE EVENTOS (COMPLETOS E FUNCIONAIS) ---

mainContent.addEventListener('click', async (e) => {
    const target = e.target;
    const pedidoId = target.closest('tr')?.dataset.pedidoId;
    const itemId = target.closest('tr')?.dataset.itemId;
    const entregadorId = target.closest('li')?.dataset.entregadorId;

    if (target.classList.contains('btn-atribuir')) {
        pedidoParaAtribuir = pedidoId;
        modalAtribuir.classList.add('visible');
    }
    if (target.classList.contains('btn-editar-item')) {
        const itemRef = doc(db, "restaurantes", meuRestauranteId, "cardapio", itemId);
        const docSnap = await getDoc(itemRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            formCardapio.nome.value = data.nome;
            formCardapio.descricao.value = data.descricao;
            formCardapio.preco.value = data.preco;
            formCardapio.categoria.value = data.categoria;
            formCardapio.disponivel.checked = data.disponivel;
            itemIdInput.value = itemId;
            formCardapioTitle.textContent = 'Editando Item';
            window.scrollTo(0, document.getElementById('cardapio').offsetTop);
        }
    }
    if (target.classList.contains('btn-apagar-item')) {
        if (confirm('Tem certeza que deseja apagar este item?')) {
            await apagarItemCardapio(meuRestauranteId, itemId);
        }
    }
    if (target.classList.contains('btn-apagar-entregador')) {
        if (confirm('Tem certeza que deseja apagar este entregador?')) {
            await apagarUsuarioCompleto(entregadorId);
        }
    }
});

mainContent.addEventListener('change', async (e) => {
    const target = e.target;
    if (target.classList.contains('status-select')) {
        await atualizarStatusPedido(meuRestauranteId, target.dataset.pedidoId, target.value);
    }
    if (target.classList.contains('disponibilidade-switch')) {
        await updateDoc(doc(db, "restaurantes", meuRestauranteId, "cardapio", target.dataset.itemId), { disponivel: target.checked });
    }
});

formCardapio.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = itemIdInput.value;
    let itemData = {
        nome: formCardapio.nome.value,
        descricao: formCardapio.descricao.value,
        preco: parseFloat(formCardapio.preco.value),
        categoria: formCardapio.categoria.value,
        disponivel: formCardapio.disponivel.checked,
    };
    await salvarItemCardapio(meuRestauranteId, id, itemData);
    formCardapio.reset();
    itemIdInput.value = '';
    formCardapioTitle.textContent = 'Adicionar Novo Item';
});

formEntregador.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = formEntregador.nomeEntregador.value;
    const email = formEntregador.emailEntregador.value;
    if (!nome || !email) { alert('Preencha todos os campos.'); return; }
    try {
        await criarUsuarioEntregador(email, nome, meuRestauranteId);
        alert(`Entregador ${nome} cadastrado. Lembre-se de criar o login para ele no painel do Firebase.`);
        formEntregador.reset();
    } catch (error) { alert(`Não foi possível cadastrar o entregador: ${error.message}`); }
});

formAtribuir.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entregadorId = selectEntregador.value;
    if (!pedidoParaAtribuir || !entregadorId) return;
    try {
        await atribuirEntregadorPedido(meuRestauranteId, pedidoParaAtribuir, entregadorId);
        modalAtribuir.classList.remove('visible');
    } catch (error) { console.error("Erro ao atribuir pedido:", error); }
});

fecharModalAtribuirBtn.addEventListener('click', () => modalAtribuir.classList.remove('visible'));
btnFecharMensagem.addEventListener('click', () => managerMessagePopup.classList.remove('visible'));
btnJaPaguei.addEventListener('click', async () => {
    btnJaPaguei.disabled = true;
    btnJaPaguei.textContent = 'Processando...';
    await solicitarDesbloqueio(meuRestauranteId);
    linkEnviarComprovante.style.display = 'block';
});
switchStatusLoja.addEventListener('change', async (e) => {
    await updateDoc(doc(db, "restaurantes", meuRestauranteId), { lojaAberta: e.target.checked });
});

// --- 7. INICIALIZAÇÃO DO PAINEL ---
async function inicializarPainelRestaurante() {
    onAuthChange(async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            if (role === 'restaurante') {
                meuRestauranteId = user.uid;
                const restauranteRef = doc(db, "restaurantes", meuRestauranteId);

                onSnapshot(restauranteRef, (docSnap) => {
                    if (docSnap.exists()) {
                        restauranteData = docSnap.data();
                        nomeRestauranteEl.textContent = restauranteData.nome;
                        verificarAssinatura(restauranteData);
                        const lojaAberta = restauranteData.lojaAberta || false;
                        switchStatusLoja.checked = lojaAberta;
                        labelStatusLoja.textContent = lojaAberta ? 'Loja Aberta' : 'Loja Fechada';
                    } else {
                        alert("Erro: não foi possível encontrar os dados do seu restaurante.");
                        logoutUser(); window.location.href = '/paginas/login.html';
                    }
                });

                onSnapshot(query(collection(db, "restaurantes", meuRestauranteId, "pedidos")), s => renderizarPedidos(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.timestamp-a.timestamp)));
                onSnapshot(collection(db, "restaurantes", meuRestauranteId, "cardapio"), s => renderizarTabelaCardapio(s.docs.map(d=>({id:d.id,...d.data()}))));
                onSnapshot(query(collection(db, "utilizadores"), where("restauranteId", "==", meuRestauranteId), where("role", "==", "entregador")), s => {
                    entregadoresDisponiveis = s.docs.map(d=>({id:d.id,...d.data()}));
                    renderizarEntregadores(entregadoresDisponiveis);
                });
                verificarMensagens(restauranteData);

            } else { window.location.href = '/paginas/login.html'; }
        } else { window.location.href = '/paginas/login.html'; }
    });
}

btnLogout.addEventListener('click', () => { logoutUser(); window.location.href = '/paginas/login.html'; });
document.addEventListener('DOMContentLoaded', inicializarPainelRestaurante);

