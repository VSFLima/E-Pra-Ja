/* E-Pra-Já v4: Script do Painel do Gestor (admin.js) */
/* Localização: /admin/admin.js */

// --- 1. IMPORTAÇÕES ---
import { db, auth } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { doc, collection, onSnapshot, updateDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
const mainContent = document.querySelector('.main-content'); // Para o listener de eventos

// --- 3. FUNÇÕES DE RENDERIZAÇÃO EM TEMPO REAL ---

const carregarDadosEmTempoReal = () => {
    // Listener para Restaurantes (para dashboard e tabelas de gestão)
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

    // Listener para Usuários
    onSnapshot(collection(db, "utilizadores"), (snapshot) => {
        listaUtilizadoresEl.innerHTML = '';
        snapshot.docs.forEach(docSnap => {
            renderizarLinhaUsuario({ id: docSnap.id, ...docSnap.data() });
        });
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
            <a href="gerenciar-restaurante.html?id=${rest.id}" class="btn btn-sm">Editar</a>
            <button class="btn btn-sm status-toggle-restaurante" data-id="${rest.id}" data-status="${rest.status}">
                ${rest.status === 'ativo' ? 'Desativar' : 'Ativar'}
            </button>
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

// --- 4. LISTENER DE AÇÕES CENTRALIZADO (100% FUNCIONAL) ---
mainContent.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return; // Se o elemento clicado não tem um data-id, ignora.

    // Ações para Restaurantes
    if (target.classList.contains('status-toggle-restaurante')) {
        const novoStatus = target.dataset.status === 'ativo' ? 'inativo' : 'ativo';
        await updateDoc(doc(db, "restaurantes", id), { status: novoStatus });
    } else if (target.classList.contains('delete-restaurante')) {
        if (confirm(`Tem certeza que deseja apagar este restaurante e todos os seus dados? Esta ação não pode ser desfeita.`)) {
            await deleteDoc(doc(db, "restaurantes", id));
            // Idealmente, uma Cloud Function apagaria o usuário, imagens e subcoleções.
        }
    } else if (target.classList.contains('aprovar-desbloqueio')) {
        const novaData = new Date();
        novaData.setDate(novaData.getDate() + 30);
        await updateDoc(doc(db, "restaurantes", id), {
            accessValidUntil: Timestamp.fromDate(novaData),
            statusPagamento: 'pago',
            solicitouDesbloqueio: false
        });
    }

    // Ações para Usuários
    if (target.classList.contains('status-toggle-usuario')) {
        const novoStatus = target.dataset.status === 'ativo' ? 'inativo' : 'ativo';
        await updateDoc(doc(db, "utilizadores", id), { status: novoStatus });
    } else if (target.classList.contains('delete-usuario')) {
        if (id === auth.currentUser.uid) {
            alert("Você não pode apagar sua própria conta de gestor.");
            return;
        }
        if (confirm(`Tem certeza que deseja apagar este usuário? Esta ação não pode ser desfeita.`)) {
            await deleteDoc(doc(db, "utilizadores", id));
            // Idealmente, uma Cloud Function apagaria o usuário do Auth também.
        }
    }
});

// --- 5. INICIALIZAÇÃO DO PAINEL ---
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

btnLogout.addEventListener('click', () => {
    logoutUser();
    window.location.href = '/paginas/login.html';
});

document.addEventListener('DOMContentLoaded', inicializarPainelAdmin);

