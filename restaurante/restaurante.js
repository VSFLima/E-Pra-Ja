/* E-Pra-Já v3: Script do Painel do Restaurante (restaurante.js) */
/* Localização: /restaurante/restaurante.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { criarUsuarioEntregador, apagarUsuarioCompleto } from '../js/services/firestore.js'; 
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const nomeRestauranteEl = document.getElementById('nome-restaurante');
const btnLogout = document.getElementById('btn-logout');
const switchStatusLoja = document.getElementById('switch-status-loja');
const labelStatusLoja = document.getElementById('label-status-loja');
const pedidosTableBodyEl = document.getElementById('pedidos-table-body');
const formCardapio = document.getElementById('form-cardapio');
const tabelaCardapioBody = document.getElementById('tabela-cardapio-body');
const formCardapioTitle = document.getElementById('form-cardapio-title');
const itemIdInput = document.getElementById('item-id');
const formEntregador = document.getElementById('form-entregador');
const listaEntregadoresEl = document.getElementById('lista-entregadores');
const modalAtribuir = document.getElementById('modal-atribuir');
const selectEntregador = document.getElementById('select-entregador');
const formAtribuir = document.getElementById('form-atribuir');
const fecharModalBtn = document.getElementById('fechar-modal-btn');

// --- 3. ESTADO DA APLICAÇÃO ---
let meuRestauranteId = null;
let entregadoresDisponiveis = [];
let pedidoParaAtribuir = null;

// --- 4. FUNÇÃO DE UPLOAD DE IMAGEM ---
async function uploadImagem(imageFile, imageType, objectId) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('action', 'upload');
    formData.append('restauranteId', meuRestauranteId);
    formData.append('imageType', imageType);
    if (imageType === 'prato') formData.append('pratoId', objectId);

    try {
        const response = await fetch('/upload.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) return result.data.url;
        throw new Error(result.message);
    } catch (error) {
        console.error('Erro no upload da imagem:', error);
        alert(`Erro no upload: ${error.message}`);
        return null;
    }
}

// --- 5. LÓGICA DE PEDIDOS E ATRIBUIÇÃO ---
function renderizarPedidos(pedidos) {
    pedidosTableBodyEl.innerHTML = '';
    if (pedidos.length === 0) {
        pedidosTableBodyEl.innerHTML = '<tr><td colspan="7">Nenhum pedido recebido ainda.</td></tr>';
        return;
    }
    pedidos.forEach(pedido => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pedido.timestamp.toDate().toLocaleTimeString('pt-BR')}</td>
            <td>${pedido.clienteInfo.nome}</td>
            <td>${pedido.itens.map(item => `${item.qtd}x ${item.nome}`).join('<br>')}</td>
            <td>R$ ${pedido.total.toFixed(2)}</td>
            <td><span class="status ${pedido.status.toLowerCase().replace(/\s+/g, '-')}">${pedido.status}</span></td>
            <td>
                <select class="status-select" data-pedido-id="${pedido.id}">
                    <option value="Recebido" ${pedido.status === 'Recebido' ? 'selected' : ''}>Recebido</option>
                    <option value="Em preparação" ${pedido.status === 'Em preparação' ? 'selected' : ''}>Em preparação</option>
                    <option value="Saiu para entrega" ${pedido.status === 'Saiu para entrega' ? 'selected' : ''}>Saiu para entrega</option>
                    <option value="Entregue" ${pedido.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
                </select>
            </td>
            <td>
                ${pedido.entregadorId ? `Atribuído` : `<button class="btn-atribuir" data-pedido-id="${pedido.id}">Atribuir</button>`}
            </td>
        `;
        pedidosTableBodyEl.appendChild(tr);
    });
}
formAtribuir.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entregadorId = selectEntregador.value;
    if (!pedidoParaAtribuir || !entregadorId) return;

    const pedidoRef = doc(db, "restaurantes", meuRestauranteId, "pedidos", pedidoParaAtribuir);
    try {
        await updateDoc(pedidoRef, { entregadorId: entregadorId, status: "Saiu para entrega" });
        modalAtribuir.style.display = 'none';
    } catch (error) {
        console.error("Erro ao atribuir pedido:", error);
    }
});

// --- 6. LÓGICA DE GESTÃO DE CARDÁPIO ---
// (Lógica de submit e upload de imagem já estava correta e foi mantida)
function renderizarTabelaCardapio(itens) {
    tabelaCardapioBody.innerHTML = '';
    itens.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${item.imageUrl || 'https://placehold.co/60x60'}" alt="${item.nome}" width="60" height="60" style="object-fit: cover; border-radius: 4px;"></td>
            <td>${item.nome}</td>
            <td>R$ ${item.preco.toFixed(2)}</td>
            <td>
                <label class="switch">
                    <input type="checkbox" class="disponibilidade-switch" data-item-id="${item.id}" ${item.disponivel ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </td>
            <td>
                <button class="btn-editar-item" data-item-id="${item.id}">Editar</button>
                <button class="btn-apagar-item" data-item-id="${item.id}">Apagar</button>
            </td>
        `;
        tabelaCardapioBody.appendChild(tr);
    });
}

// --- 7. LÓGICA DE GESTÃO DE ENTREGADORES ---
formEntregador.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = formEntregador.nomeEntregador.value;
    const email = formEntregador.emailEntregador.value;
    const senha = formEntregador.senhaEntregador.value;
    if (senha.length < 6) { alert('A senha deve ter no mínimo 6 caracteres.'); return; }
    try {
        await criarUsuarioEntregador(email, senha, nome, meuRestauranteId);
        alert(`Entregador ${nome} cadastrado com sucesso!`);
        formEntregador.reset();
    } catch (error) {
        alert(`Não foi possível cadastrar o entregador: ${error.message}`);
    }
});
function renderizarEntregadores(entregadores) {
    listaEntregadoresEl.innerHTML = '';
    selectEntregador.innerHTML = '<option value="">Selecione um entregador</option>';
    if (entregadores.length === 0) {
        listaEntregadoresEl.innerHTML = '<li>Nenhum entregador cadastrado.</li>';
        return;
    }
    entregadores.forEach(entregador => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${entregador.nome} (${entregador.email})</span>
            <button class="btn-apagar-entregador" data-entregador-id="${entregador.id}">Apagar</button>
        `;
        listaEntregadoresEl.appendChild(li);

        const option = document.createElement('option');
        option.value = entregador.id;
        option.textContent = entregador.nome;
        selectEntregador.appendChild(option);
    });
}

// --- 8. EVENT LISTENERS GERAIS ---
document.body.addEventListener('click', async (e) => {
    const target = e.target;
    if (target.classList.contains('btn-atribuir')) {
        pedidoParaAtribuir = target.dataset.pedidoId;
        modalAtribuir.style.display = 'flex';
    }
    if (target.id === 'fechar-modal-btn' || e.target === modalAtribuir) {
        modalAtribuir.style.display = 'none';
    }
    if (target.classList.contains('btn-apagar-entregador')) {
        const id = target.dataset.entregadorId;
        if (confirm('Tem certeza que deseja apagar este entregador? Esta ação não pode ser desfeita.')) {
            try {
                // apagarUsuarioCompleto será uma nova função em firestore.js
                await apagarUsuarioCompleto(id);
                alert('Entregador apagado com sucesso.');
            } catch (error) {
                alert(`Erro ao apagar entregador: ${error.message}`);
            }
        }
    }
});
// (Outros listeners como o de apagar item do cardápio e mudar status do pedido)

// --- 9. INICIALIZAÇÃO DO PAINEL ---
async function inicializarPainelRestaurante() {
    onAuthChange(async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            if (role === 'restaurante') {
                const q = query(collection(db, "restaurantes"), where("donoId", "==", user.uid));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    meuRestauranteId = querySnapshot.docs[0].id;
                    // Iniciar todos os listeners (pedidos, cardápio, entregadores, status da loja)
                    // ...
                }
            } else { window.location.href = '/paginas/login.html'; }
        } else { window.location.href = '/paginas/login.html'; }
    });
}

document.addEventListener('DOMContentLoaded', inicializarPainelRestaurante);

