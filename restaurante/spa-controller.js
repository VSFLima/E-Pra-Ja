/* E-Pra-Já v5: Controlador da Single Page Application (SPA) do Painel do Restaurante */
/* Localização: /restaurante/spa-controller.js */

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const pageSections = document.querySelectorAll('.page-section');
    const pageTitleEl = document.getElementById('page-title');

    // Mapeia o alvo do link para o nome do arquivo e o título da página
    const sectionConfig = {
        pedidos: {
            filePath: null, // O conteúdo de pedidos já está no index.html por padrão
            title: 'Pedidos Recebidos',
            loaded: true // Já está carregado
        },
        cardapio: {
            filePath: 'cardapio-spa.html',
            title: 'Gestão de Cardápio',
            loaded: false
        },
        entregadores: {
            filePath: 'entregadores-spa.html',
            title: 'Gestão de Entregadores',
            loaded: false
        },
        relatorios: {
            filePath: 'relatorios.html', // Este é um link para outra página, não uma seção SPA
            isExternalLink: true
        },
        loja: {
            filePath: 'loja-spa.html',
            title: 'Minha Loja',
            loaded: false
        }
    };

    /**
     * Carrega o conteúdo de uma seção a partir de um arquivo HTML.
     * @param {string} target - O nome da seção (ex: 'cardapio').
     */
    const loadSectionContent = async (target) => {
        const config = sectionConfig[target];
        if (!config || config.loaded || config.isExternalLink) return;

        try {
            const response = await fetch(config.filePath);
            if (!response.ok) throw new Error(`Erro ao carregar ${config.filePath}`);
            
            const html = await response.text();
            const targetSection = document.getElementById(`${target}-section`);
            if (targetSection) {
                targetSection.innerHTML = html;
                config.loaded = true;
                console.log(`Seção '${target}' carregada com sucesso.`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    /**
     * Alterna a visibilidade das seções da página.
     * @param {string} target - O nome da seção a ser exibida.
     */
    const switchSection = (target) => {
        const config = sectionConfig[target];
        if (!config || config.isExternalLink) return;

        // Esconde todas as seções
        pageSections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        // Mostra a seção alvo
        const targetSection = document.getElementById(`${target}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
        }

        // Atualiza o título da página
        if (pageTitleEl) {
            pageTitleEl.textContent = config.title;
        }

        // Atualiza a classe 'active' nos links de navegação
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.target === target) {
                link.classList.add('active');
            }
        });
    };

    // Adiciona os event listeners aos links de navegação
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const target = e.target.closest('.nav-link').dataset.target;
            
            const config = sectionConfig[target];
            if (config && config.isExternalLink) {
                // Se for um link externo (como relatórios), apenas navega
                window.location.href = config.filePath;
                return;
            }

            // Carrega o conteúdo se ainda não foi carregado
            await loadSectionContent(target);
            // Mostra a seção
            switchSection(target);
        });
    });

    // Carrega o conteúdo da primeira seção (pedidos) por padrão
    // (Neste caso, já está no HTML, então apenas garantimos que está visível)
    switchSection('pedidos');
});

