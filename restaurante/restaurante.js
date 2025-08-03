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
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
// Elementos para o menu responsivo
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const overlay = document.getElementById('overlay');

// --- 3. ESTADO DA APLICAÇÃO ---
let meuRestauranteId = null;
let restauranteData = {};
let entregadoresDisponiveis = [];
let pedidoParaAtribuir = null;
let mensagensExibidas = new Set();

// --- 4. LÓGICA DO MENU RESPONSIVO ---
const toggleMenu = () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
};

if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', toggleMenu);

// --- 5. LÓGICA DE NEGÓCIO (Cobrança, Mensagens, Status) ---
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

// --- 6. FUNÇÕES DE RENDERIZAÇÃO ---
function renderizarPedidos(pedidos) {
    pedidosTableBodyEl.innerHTML = '';
    if (pedidos.length === 0) {
        pedidosTableBodyEl.innerHTML = '<tr><td colspan="7">Nenhum pedido recebido ainda.</td></tr>';
        return;
    }
    pedidos.forEach(p => {
        const tr = document.createElement('tr');
        tr.dataset.pedidoId = p.id;
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
        tr.dataset.itemId = item.id;
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
        const li = document.createElement('li');
        li.dataset.entregadorId = e.id;
        li.innerHTML = `<span>${e.nome} (${e.email})</span><button class="btn-apagar-entregador" data-entregador-id="${e.id}">Apagar</button>`;
        listaEntregadoresEl.appendChild(li);
        selectEntregador.innerHTML += `<option value="${e.id}">${e.nome}</option>`;
    });
}

// --- 7. LISTENERS DE EVENTOS ---
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
    const taxaEntrega = parseFloat(formAtribuir['taxa-entrega'].value);
    if (!pedidoParaAtribuir || !entregadorId || isNaN(taxaEntrega)) {
        alert('Por favor, selecione um entregador e insira uma taxa de entrega válida.');
        return;
    }
    try {
        await atribuirEntregadorPedido(meuRestauranteId, pedidoParaAtribuir, entregadorId, taxaEntrega);
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

// --- 8. INICIALIZAÇÃO DO PAINEL ---
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
                        logoutUser();
                        window.location.href = '/paginas/login.html';
                    }
                });
                
                onSnapshot(query(collection(db, "restaurantes", meuRestauranteId, "pedidos")), s => renderizarPedidos(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.timestamp - a.timestamp)));
                onSnapshot(collection(db, "restaurantes", meuRestauranteId, "cardapio"), s => renderizarTabelaCardapio(s.docs.map(d => ({ id: d.id, ...d.data() }))));
                onSnapshot(query(collection(db, "utilizadores"), where("restauranteId", "==", meuRestauranteId), where("role", "==", "entregador")), s => {
                    entregadoresDisponiveis = s.docs.map(d => ({ id: d.id, ...d.data() }));
                    renderizarEntregadores(entregadoresDisponiveis);
                });
                verificarMensagens(restauranteData);
                
            } else { window.location.href = '/paginas/login.html'; }
        } else { window.location.href = '/paginas/login.html'; }
    });
}

btnLogout.addEventListener('click', () => { logoutUser();
    window.location.href = '/paginas/login.html'; });
document.addEventListener('DOMContentLoaded', inicializarPainelRestaurante);