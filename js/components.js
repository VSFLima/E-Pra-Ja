/* E-Pra-Já v3: Script de Carregamento de Componentes (components.js) */
/* Localização: /js/components.js */

/**
 * Carrega um componente HTML (como cabeçalho ou rodapé) de um arquivo externo
 * e o insere em um elemento específico na página.
 * @param {string} componentPath - O caminho para o arquivo HTML do componente (ex: '/paginas/_header.html').
 * @param {string} targetElementId - O ID do elemento onde o componente será inserido.
 */
const loadComponent = async (componentPath, targetElementId) => {
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) {
        console.error(`Elemento alvo com ID "${targetElementId}" não foi encontrado.`);
        return;
    }

    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Não foi possível carregar o componente: ${response.statusText}`);
        }
        const html = await response.text();
        targetElement.innerHTML = html;
    } catch (error) {
        console.error(`Erro ao carregar o componente de "${componentPath}":`, error);
        targetElement.innerHTML = `<p style="color: red;">Erro ao carregar o ${targetElementId}.</p>`;
    }
};

/**
 * Função que é executada assim que o DOM da página está pronto.
 * Ela inicia o carregamento de todos os componentes globais.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Carrega o cabeçalho no elemento com id="global-header-placeholder"
    loadComponent('/paginas/_header.html', 'global-header-placeholder');

    // Carrega o rodapé no elemento com id="global-footer-placeholder"
    loadComponent('/paginas/_footer.html', 'global-footer-placeholder');
});

