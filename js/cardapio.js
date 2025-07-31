/* E-Pra-Já v2: Script da Página do Cardápio (cardapio.js) */
/* Localização: /js/cardapio.js */

// --- 1. IMPORTAÇÕES ---
import { db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const nomeRestauranteEl = document.getElementById('nome-restaurante');
const logoRestauranteEl = document.getElementById('logo-restaurante');
const statusLojaEl = document.getElementById('status-loja');
const listaCardapioEl = document.getElementById('lista-cardapio');
const carrinhoItensEl = document.getElementById('carrinho-itens');
const carrinhoTotalEl = document.getElementById('carrinho-total');
const checkoutBtn = document.getElementById('checkout-btn');
const modalOverlay = document.getElementById('modal-overlay');
const fecharModalBtn = document.getElementById('fechar-modal-btn');
const checkoutForm = document.getElementById('checkout-form');

// --- 3. ESTADO DA APLICAÇÃO ---
let carrinho = [];
let restauranteId = null;
let restauranteInfo = {};

// --- 4. FUNÇÕES DO CARRINHO ---

/**
 * Adiciona um item ao carrinho ou incrementa sua quantidade.
 * @param {object} item - O item a ser adicionado.
 */
function adicionarAoCarrinho(item) {
    const itemExistente = carrinho.find(i => i.id === item.id);
    if (itemExistente) {
        itemExistente.qtd++;
    } else {
        carrinho.push({ ...item, qtd: 1 });
    }
    renderizarCarrinho();
}

/**
 * Renderiza os itens do carrinho na tela e atualiza o total.
 */
function renderizarCarrinho() {
    carrinhoItensEl.innerHTML = '';
    if (carrinho.length === 0) {
        carrinhoItensEl.innerHTML = '<p>Seu carrinho está vazio.</p>';
        checkoutBtn.disabled = true;
    } else {
        carrinho.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'carrinho-item';
            itemEl.innerHTML = `
                <span>${item.qtd}x ${item.nome}</span>
                <span>R$ ${(item.preco * item.qtd).toFixed(2)}</span>
            `;
            carrinhoItensEl.appendChild(itemEl);
        });
        checkoutBtn.disabled = false;
    }
    atualizarTotalCarrinho();
}

/**
 * Calcula e exibe o valor total do carrinho.
 */
function atualizarTotalCarrinho() {
    const total = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    carrinhoTotalEl.textContent = `R$ ${total.toFixed(2)}`;
}

// --- 5. FUNÇÕES DE RENDERIZAÇÃO DA PÁGINA ---

/**
 * Renderiza as informações do cabeçalho do restaurante.
 * @param {object} data - Os dados do restaurante.
 */
function renderizarHeaderRestaurante(data) {
    restauranteInfo = data;
    nomeRestauranteEl.textContent = data.nome;
    if (data.info.logoUrl) {
        logoRestauranteEl.src = data.info.logoUrl;
    } else {
        logoRestauranteEl.src = `https://placehold.co/100x100/FF6B00/FFFFFF?text=${data.nome.charAt(0)}`;
    }

    if (data.lojaAberta) {
        statusLojaEl.textContent = 'Aberto';
        statusLojaEl.className = 'status-loja aberta';
    } else {
        statusLojaEl.textContent = 'Fechado';
        statusLojaEl.className = 'status-loja fechada';
        // Desativa toda a página se a loja estiver fechada
        listaCardapioEl.style.opacity = '0.5';
        listaCardapioEl.style.pointerEvents = 'none';
    }
}

/**
 * Renderiza os itens do cardápio na tela.
 * @param {Array} cardapio - A lista de itens do cardápio.
 */
function renderizarCardapio(cardapio) {
    listaCardapioEl.innerHTML = '';
    // Agrupar por categoria (se houver)
    const categorias = [...new Set(cardapio.map(item => item.categoria || 'Diversos'))];

    categorias.forEach(categoria => {
        const categoriaEl = document.createElement('div');
        categoriaEl.className = 'menu-category';
        categoriaEl.innerHTML = `<h2>${categoria}</h2>`;
        
        cardapio.filter(item => (item.categoria || 'Diversos') === categoria).forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'item-card';
            if (!item.disponivel) {
                itemEl.classList.add('indisponivel');
            }

            itemEl.innerHTML = `
                <img class="item-imagem" src="${item.imageUrl || 'https://placehold.co/120x120/E2E8F0/2D3748?text=Imagem'}" alt="${item.nome}">
                <div class="item-info">
                    <h4>${item.nome}</h4>
                    <p>${item.descricao || ''}</p>
                    <span class="item-preco">R$ ${item.preco.toFixed(2)}</span>
                </div>
                <div class="item-acao">
                    ${item.disponivel ? '<button class="btn-add">+</button>' : ''}
                </div>
            `;
            
            if (item.disponivel) {
                itemEl.querySelector('.btn-add').addEventListener('click', () => adicionarAoCarrinho(item));
            }

            categoriaEl.appendChild(itemEl);
        });
        listaCardapioEl.appendChild(categoriaEl);
    });
}

// --- 6. LÓGICA DE CHECKOUT ---

/**
 * Finaliza o pedido, salvando-o no Firestore.
 */
async function finalizarPedido(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const dadosCliente = {
        nome: checkoutForm.nome.value,
        whatsapp: checkoutForm.whatsapp.value,
        endereco: checkoutForm.endereco.value,
    };

    const dadosPedido = {
        clienteInfo: dadosCliente,
        itens: carrinho,
        total: carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0),
        metodoPagamento: checkoutForm.pagamento.value,
        precisaTrocoPara: parseFloat(checkoutForm.troco.value) || 0,
        status: "Recebido",
        timestamp: Timestamp.now()
    };

    try {
        const pedidosColRef = collection(db, "restaurantes", restauranteId, "pedidos");
        await addDoc(pedidosColRef, dadosPedido);
        
        modalOverlay.classList.remove('visible');
        alert('Pedido enviado com sucesso! O restaurante entrará em contato.');
        carrinho = [];
        renderizarCarrinho();
    } catch (error) {
        console.error("Erro ao enviar pedido:", error);
        alert('Ocorreu um erro ao enviar seu pedido. Tente novamente.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirmar Pedido';
    }
}


// --- 7. INICIALIZAÇÃO DA PÁGINA ---

/**
 * Função principal que inicializa a página do cardápio.
 */
async function init() {
    const params = new URLSearchParams(window.location.search);
    restauranteId = params.get('id');

    if (!restauranteId) {
        document.body.innerHTML = '<h1>Restaurante não encontrado. Verifique o link.</h1>';
        return;
    }

    try {
        // Buscar dados do restaurante
        const restauranteRef = doc(db, "restaurantes", restauranteId);
        const restauranteSnap = await getDoc(restauranteRef);

        if (!restauranteSnap.exists()) {
            document.body.innerHTML = '<h1>Restaurante não encontrado.</h1>';
            return;
        }
        renderizarHeaderRestaurante(restauranteSnap.data());

        // Buscar dados do cardápio
        const cardapioRef = collection(db, "restaurantes", restauranteId, "cardapio");
        const cardapioSnap = await getDocs(cardapioRef);
        const cardapio = cardapioSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarCardapio(cardapio);

    } catch (error) {
        console.error("Erro ao carregar a página:", error);
        document.body.innerHTML = '<h1>Ocorreu um erro ao carregar o cardápio.</h1>';
    }
    
    // Adicionar Event Listeners
    checkoutBtn.addEventListener('click', () => modalOverlay.classList.add('visible'));
    fecharModalBtn.addEventListener('click', () => modalOverlay.classList.remove('visible'));
    checkoutForm.addEventListener('submit', finalizarPedido);
    renderizarCarrinho(); // Garante que o carrinho comece vazio
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);

