
/* E-Pra-Já v4: Script do Painel do Gestor (admin.js) */
/* Localização: /admin/admin.js */

// --- 1. IMPORTAÇÕES ---
import { db, auth } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { 
    aprovarDesbloqueio, 
    atualizarStatusUsuario, 
    apagarUsuarioCompleto,
    atualizarStatusRestaurante,
    apagarRestauranteCompleto,
    concederAcessoManual
} from '../js/services/firestore.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const nomeUtilizadorEl = document.getElementById('nome-utilizador');
const btnLogout = document.getElementById('btn-logout');
const totalArrecadadoEl = document.getElementById('total-arrecadado');
const totalPendenteEl = document.getElementById('total-pendente');
const totalEmTesteEl = document.getElementById('total-em-teste');
const listaRestaurantesEl = document.getElementById('lista-restaurantes-body');
const listaUtilizadoresEl = document.getElementById('lista-utilizadores-body');
const desbloqueioBody = document.getElementById('desbloqueio-body');
const pendentesBody = document.getElementById('pendentes-body');
const mainContent = document.querySelector('.main-content');
const modalAcesso = document.getElementById('modal-acesso');
const fecharModalAcessoBtn = document.getElementById('fechar-modal-acesso-btn');
const formAcesso = document.getElementById('form-acesso');
const restauranteIdAcessoInput = document.getElementById('restaurante-id-acesso');
const nomeRestauranteModalEl = document.getElementById('nome-restaurante-modal');
// (NOVO) Elementos para o menu responsivo
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const overlay = document.getElementById('overlay');

// --- 3. (NOVO) LÓGICA DO MENU RESPONSIVO ---
const toggleMenu = () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
};

if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', toggleMenu);

// --- 4. FUNÇÕES DE RENDERIZAÇÃO EM TEMPO REAL ---
const carregarDadosEmTempoReal = () => {
    onSnapshot(collection(db, "restaurantes"), (snapshot) => {
        let totalArrecadado = 0, totalPendente = 0, totalEmTeste = 0;
        const precoMensalidade = 49.90;

        listaRestaurantesEl.innerHTML = '';
        desbloqueioBody.innerHTML = '';
        pendentesBody.innerHTML = '';

        snapshot.docs.forEach(docSnap => {
            const rest = { id: docSnap.id, ...docSnap.data() };
            if (rest.statusPagamento === 'pago') totalArrecadado += precoMensalidade;
            if (rest.statusPagamento === 'pendente') totalPendente += precoMensalidade;
            if (rest.status === 'teste') totalEmTeste += precoMensalidade;
            renderizarLinhaRestaurante(rest);
            if (rest.solicitouDesbloqueio) renderizarLinhaDesbloqueio(rest);
            if (rest.statusPagamento === 'pendente') renderizarLinhaPendente(rest);
        });

        totalArrecadadoEl.textContent = `R$ ${totalArrecadado.toFixed(2)}`;
        totalPendenteEl.textContent = `R$ ${totalPendente.toFixed(2)}`;
        totalEmTesteEl.textContent = `R$ ${totalEmTeste.toFixed(2)}`;
        if(desbloqueioBody.innerHTML === '') desbloqueioBody.innerHTML = '<tr><td colspan="3">Nenhuma solicitação no momento.</td></tr>';
        if(pendentesBody.innerHTML === '') pendentesBody.innerHTML = '<tr><td colspan="2">Nenhum restaurante com pagamento pendente.</td></tr>';
        if(listaRestaurantesEl.innerHTML === '') listaRestaurantesEl.innerHTML = '<tr><td colspan="4">Nenhum restaurante cadastrado.</td></tr>';
    });

    onSnapshot(collection(db, "utilizadores"), (snapshot) => {
        listaUtilizadoresEl.innerHTML = '';
        snapshot.docs.forEach(docSnap => renderizarLinhaUsuario({ id: docSnap.id, ...docSnap.data() }));
        if(listaUtilizadoresEl.innerHTML === '') listaUtilizadoresEl.innerHTML = '<tr><td colspan="5">Nenhum usuário cadastrado.</td></tr>';
    });
};

function renderizarLinhaRestaurante(rest) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${rest.nome}</td>
        <td><span class="status ${rest.status}">${rest.status}</span></td>
        <td><span class="status ${rest.statusPagamento || 'n/a'}">${rest.statusPagamento || 'N/A'}</span></td>
        <td>
            <button class="btn btn-sm btn-gerenciar-acesso" data-id="${rest.id}" data-nome="${rest.nome}">Acesso</button>
            <a href="gerenciar-restaurante.html?id=${rest.id}" class="btn btn-sm">Editar</a>
            <button class="btn btn-sm status-toggle-restaurante" data-id="${rest.id}" data-status="${rest.status}">${rest.status === 'ativo' ? 'Desativar' : 'Ativar'}</button>
            <button class="btn btn-sm btn-erro delete-restaurante" data-id="${rest.id}">Apagar</button>
        </td>
    `;
    listaRestaurantesEl.appendChild(tr);
}

function renderizarLinhaUsuario(user) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${user.email}</td>
        <td>${user.nome || 'Não informado'}</td>
        <td>${user.role}</td>
        <td><span class="status ${user.status}">${user.status}</span></td>
        <td>
            <button class="btn btn-sm status-toggle-usuario" data-id="${user.id}" data-status="${user.status}">
                ${user.status === 'ativo' ? 'Desativar' : 'Ativar'}
            </button>
            <button class="btn btn-sm btn-erro delete-usuario" data-id="${user.id}">Apagar</button>
        </td>
    `;
    listaUtilizadoresEl.appendChild(tr);
}

function renderizarLinhaDesbloqueio(rest) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${rest.nome}</td><td>${rest.donoId}</td><td><button class="btn btn-sm aprovar-desbloqueio" data-id="${rest.id}">Aprovar (30 dias)</button></td>`;
    desbloqueioBody.appendChild(tr);
}

function renderizarLinhaPendente(rest) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${rest.nome}</td><td>${rest.accessValidUntil ? new Date(rest.accessValidUntil.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A'}</td>`;
    pendentesBody.appendChild(tr);
}

// --- 5. LISTENER DE AÇÕES CENTRALIZADO ---
mainContent.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains('btn-gerenciar-acesso')) {
        restauranteIdAcessoInput.value = id;
        nomeRestauranteModalEl.textContent = target.dataset.nome;
        modalAcesso.classList.add('visible');
    }
    if (target.classList.contains('status-toggle-restaurante')) {
        const novoStatus = target.dataset.status === 'ativo' ? 'inativo' : 'ativo';
        await atualizarStatusRestaurante(id, novoStatus);
    }
    if (target.classList.contains('delete-restaurante')) {
        if (confirm(`Tem certeza que deseja apagar este restaurante e todos os seus dados?`)) {
            await apagarRestauranteCompleto(id);
        }
    }
    if (target.classList.contains('aprovar-desbloqueio')) {
        await aprovarDesbloqueio(id);
    }
    if (target.classList.contains('status-toggle-usuario')) {
        const novoStatus = target.dataset.status === 'ativo' ? 'inativo' : 'ativo';
        await atualizarStatusUsuario(id, novoStatus);
    }
    if (target.classList.contains('delete-usuario')) {
        if (id === auth.currentUser.uid) { alert("Você não pode apagar sua própria conta."); return; }
        if (confirm(`Tem certeza que deseja apagar este usuário?`)) {
            await apagarUsuarioCompleto(id);
        }
    }
});

formAcesso.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = restauranteIdAcessoInput.value;
    const dias = parseInt(formAcesso.dias.value);
    if (!id || isNaN(dias)) return;
    
    try {
        await concederAcessoManual(id, dias);
        modalAcesso.classList.remove('visible');
        formAcesso.reset();
        alert('Acesso do restaurante atualizado com sucesso!');
    } catch (error) {
        alert('Erro ao atualizar o acesso.');
    }
});

// --- 6. INICIALIZAÇÃO E SEGURANÇA DO PAINEL ---
const inicializarPainelAdmin = () => {
    onAuthChange(async (user) => {
        if (user && await getUserRole(user.uid) === 'gestor') {
            nomeUtilizadorEl.textContent = user.email;
            carregarDadosEmTempoReal();
        } else {
            window.location.href = '/paginas/login.html';
        }
    });
};

fecharModalAcessoBtn.addEventListener('click', () => modalAcesso.classList.remove('visible'));
btnLogout.addEventListener('click', () => { logoutUser(); window.location.href = '/paginas/login.html'; });

document.addEventListener('DOMContentLoaded', inicializarPainelAdmin);

 