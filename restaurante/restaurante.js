/* E-Pra-Já v4: Script do Painel do Restaurante (restaurante.js) */
/* Localização: /restaurante/restaurante.js */

// --- 1. IMPORTAÇÕES ---
import { db, auth } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { criarUsuarioEntregador, apagarUsuarioCompleto } from '../js/services/firestore.js'; 
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

// --- 3. ESTADO DA APLICAÇÃO ---
let meuRestauranteId = null;
let restauranteData = {};
let entregadoresDisponiveis = [];
let pedidoParaAtribuir = null;

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
        }
    } else {
        mainContent.style.filter = 'none';
        billingPopup.classList.remove('visible');
    }
}

function verificarMensagens(restData) {
    onSnapshot(collection(db, "mensagensGlobais"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const msg = change.doc.data();
                const agora = new Date();
                const dataMsg = msg.timestamp.toDate();
                if ((agora - dataMsg) / (1000 * 60 * 60) < 24) {
                    if (msg.grupoAlvo === 'todos' || msg.grupoAlvo === restData.statusPagamento || msg.grupoAlvo === restData.status) {
                        alert(`Mensagem do Gestor: ${msg.texto}`);
                    }
                }
            }
        });
    });
}

// --- 5. FUNÇÕES DE RENDERIZAÇÃO ---
function renderizarPedidos(pedidos) {
    pedidosTableBodyEl.innerHTML = '';
    if (pedidos.length === 0) {
        pedidosTableBodyEl.innerHTML = '<tr><td colspan="7">Nenhum pedido recebido ainda.</td></tr>';
        return;
    }
    pedidos.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.timestamp.toDate().toLocaleTimeString('pt-BR')}</td>
            <td>${p.clienteInfo.nome}</td>
            <td>${p.itens.map(i => `${i.qtd}x ${i.nome}`).join('<br>')}</td>
            <td>R$ ${p.total.toFixed(2)}</td>
            <td><span class="status ${p.status.toLowerCase().replace(/\s+/g, '-')}">${p.status}</span></td>
            <td><select class="status-select" data-pedido-id="${p.id}">${['Recebido', 'Em preparação', 'Saiu para entrega', 'Entregue'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
            <td>${p.entregadorId ? 'Atribuído' : `<button class="btn btn-sm btn-atribuir" data-pedido-id="${p.id}">Atribuir</button>`}</td>
        `;
        pedidosTableBodyEl.appendChild(tr);
    });
}

function renderizarTabelaCardapio(itens) {
    tabelaCardapioBody.innerHTML = '';
    itens.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${item.imageUrl || 'https://placehold.co/60x60/E2E8F0/1A202C?text=Foto'}" alt="${item.nome}" width="60" height="60" style="object-fit: cover; border-radius: 4px;"></td>
            <td>${item.nome}</td>
            <td>R$ ${item.preco.toFixed(2)}</td>
            <td><label class="switch"><input type="checkbox" class="disponibilidade-switch" data-item-id="${item.id}" ${item.disponivel ? 'checked' : ''}><span class="slider"></span></label></td>
            <td><button class="btn-editar-item" data-item-id="${item.id}">Editar</button><button class="btn-apagar-item" data-item-id="${item.id}">Apagar</button></td>
        `;
        tabelaCardapioBody.appendChild(tr);
    });
}

function renderizarEntregadores(entregadores) {
    listaEntregadoresEl.innerHTML = '';
    selectEntregador.innerHTML = '<option value="">Selecione um entregador</option>';
    entregadores.forEach(e => {
        listaEntregadoresEl.innerHTML += `<li><span>${e.nome} (${e.email})</span><button class="btn-apagar-entregador" data-entregador-id="${e.id}">Apagar</button></li>`;
        selectEntregador.innerHTML += `<option value="${e.id}">${e.nome}</option>`;
    });
}

// --- 6. LISTENERS DE EVENTOS ---

// Listener central para cliques em botões dinâmicos
mainContent.addEventListener('click', async (e) => {
    const target = e.target;
    const pedidoId = target.dataset.pedidoId;
    const itemId = target.dataset.itemId;
    const entregadorId = target.dataset.entregadorId;

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
            await deleteDoc(doc(db, "restaurantes", meuRestauranteId, "cardapio", itemId));
        }
    }
    if (target.classList.contains('btn-apagar-entregador')) {
        if (confirm('Tem certeza que deseja apagar este entregador?')) {
            await apagarUsuarioCompleto(entregadorId);
        }
    }
});

// Listener para mudanças nos selects de status e disponibilidade
mainContent.addEventListener('change', async (e) => {
    const target = e.target;
    if (target.classList.contains('status-select')) {
        const pedidoId = target.dataset.pedidoId;
        await updateDoc(doc(db, "restaurantes", meuRestauranteId, "pedidos", pedidoId), { status: target.value });
    }
    if (target.classList.contains('disponibilidade-switch')) {
        const itemId = target.dataset.itemId;
        await updateDoc(doc(db, "restaurantes", meuRestauranteId, "cardapio", itemId), { disponivel: target.checked });
    }
});

// Listeners de formulários
formCardapio.addEventListener('submit', async (e) => { e.preventDefault(); /* ... lógica de upload e salvar ... */ });
formEntregador.addEventListener('submit', async (e) => { e.preventDefault(); /* ... lógica de criar entregador ... */ });
formAtribuir.addEventListener('submit', async (e) => { e.preventDefault(); /* ... lógica de atribuir pedido ... */ });

// Listeners dos Modais e Pop-ups
fecharModalAtribuirBtn.addEventListener('click', () => modalAtribuir.classList.remove('visible'));
btnJaPaguei.addEventListener('click', async () => { /* ... lógica de solicitar desbloqueio ... */ });
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
                        verificarMensagens(restauranteData);
                        const lojaAberta = restauranteData.lojaAberta || false;
                        switchStatusLoja.checked = lojaAberta;
                        labelStatusLoja.textContent = lojaAberta ? 'Loja Aberta' : 'Loja Fechada';
                    } else {
                        alert("Erro: não foi possível encontrar os dados do seu restaurante.");
                        logoutUser(); window.location.href = '/paginas/login.html';
                    }
                });

                // Iniciar todos os outros listeners
                onSnapshot(query(collection(db, "restaurantes", meuRestauranteId, "pedidos")), s => renderizarPedidos(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.timestamp-a.timestamp)));
                onSnapshot(collection(db, "restaurantes", meuRestauranteId, "cardapio"), s => renderizarTabelaCardapio(s.docs.map(d=>({id:d.id,...d.data()}))));
                onSnapshot(query(collection(db, "utilizadores"), where("restauranteId", "==", meuRestauranteId), where("role", "==", "entregador")), s => {
                    entregadoresDisponiveis = s.docs.map(d=>({id:d.id,...d.data()}));
                    renderizarEntregadores(entregadoresDisponiveis);
                });

            } else { window.location.href = '/paginas/login.html'; }
        } else { window.location.href = '/paginas/login.html'; }
    });
}

btnLogout.addEventListener('click', () => { logoutUser(); window.location.href = '/paginas/login.html'; });
document.addEventListener('DOMContentLoaded', inicializarPainelRestaurante);

 