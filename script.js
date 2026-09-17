// ATENÇÃO: Substitua pela URL base do seu Worker Cloudflare
const API_URL = "https://codecream.larissagazoli45.workers.dev/";

let cardapio = [];
let mesaAtual = null;
let carrinhoAtual = [];
let itemEmFoco = null;
let qtdEmFoco = 1;

// Inicialização
async function iniciar() {
    await carregarProdutos();
    await renderizarPedidosPendentes();
}

// Carrega os dados direto da tb_cardapio do backend
async function carregarProdutos() {
    try {
        const response = await fetch(`${API_URL}/produtos`);
        const produtosBD = await response.json();
        
        // Mapeando dados do DB para o front (ignorando o preço)
        cardapio = produtosBD.map(p => {
            return {
                id: p.id_cardapio,
                nome: p.nome_produto,
                img: p.imagem || 'https://via.placeholder.com/150'
            };
        });
    } catch (e) {
        console.error("Erro ao buscar cardápio:", e);
    }
}

function mostrarTela(idTela) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(idTela).classList.add('active');
    window.scrollTo(0, 0);
}
function voltarPara(idTela) { mostrarTela(idTela); }

// --- FLUXO DA MESA ---
document.getElementById('btn-novo-pedido').addEventListener('click', () => {
    document.getElementById('modal-mesa').classList.add('active');
    document.getElementById('input-mesa').value = '';
});

document.getElementById('btn-cancelar-mesa').addEventListener('click', () => {
    document.getElementById('modal-mesa').classList.remove('active');
});

document.getElementById('btn-iniciar-pedido').addEventListener('click', () => {
    const mesa = document.getElementById('input-mesa').value;
    if (!mesa) return alert("Informe o número da mesa!");
    
    mesaAtual = mesa;
    carrinhoAtual = [];
    document.getElementById('carrinho-mesa').innerText = `Mesa ${mesa}`;
    document.getElementById('modal-mesa').classList.remove('active');
    atualizarBadgeCarrinho();
    renderizarCatalogo(cardapio);
    mostrarTela('tela-catalogo');
});

// --- FLUXO DO CATÁLOGO ---
function renderizarCatalogo(produtos) {
    const grid = document.getElementById('grid-produtos');
    grid.innerHTML = '';
    produtos.forEach(prod => {
        grid.innerHTML += `
            <div class="product-card" onclick="abrirDetalhes(${prod.id})">
                <img src="${prod.img}" alt="${prod.nome}">
                <div class="info">
                    <h4>${prod.nome}</h4>
                </div>
            </div>
        `;
    });
}

document.getElementById('busca-comida').addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    const filtrados = cardapio.filter(p => p.nome.toLowerCase().includes(termo));
    renderizarCatalogo(filtrados);
});

// --- FLUXO DETALHES DO PRODUTO ---
function abrirDetalhes(id) {
    itemEmFoco = cardapio.find(p => p.id === id);
    qtdEmFoco = 1;
    
    document.getElementById('item-qtd').innerText = qtdEmFoco;
    document.getElementById('item-obs').value = '';
    
    const conteudo = document.getElementById('detalhes-conteudo');
    conteudo.innerHTML = `
        <img src="${itemEmFoco.img}" class="item-hero-img">
        <div class="container details-container">
            <h2>${itemEmFoco.nome}</h2>
        </div>
    `;

    mostrarTela('tela-detalhes');
}

function alterarQtd(valor) {
    if (qtdEmFoco + valor > 0) {
        qtdEmFoco += valor;
        document.getElementById('item-qtd').innerText = qtdEmFoco;
    }
}

document.getElementById('btn-add-carrinho').addEventListener('click', () => {
    const obs = document.getElementById('item-obs').value;
    carrinhoAtual.push({
        id_produto: itemEmFoco.id,
        nome: itemEmFoco.nome,
        quantidade: qtdEmFoco,
        observacao: obs
    });
    
    atualizarBadgeCarrinho();
    mostrarTela('tela-catalogo');
});

function atualizarBadgeCarrinho() {
    document.getElementById('cart-count').innerText = carrinhoAtual.length;
}

// --- CARRINHO E CONFIRMAÇÃO ---
document.getElementById('btn-ver-carrinho').addEventListener('click', renderizarCarrinho);

function renderizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    lista.innerHTML = '';

    carrinhoAtual.forEach(item => {
        lista.innerHTML += `
            <li class="cart-item">
                <div class="cart-item-header">
                    <span>${item.quantidade}x ${item.nome}</span>
                </div>
                <div class="cart-item-details">
                    ${item.observacao ? `<strong>Obs:</strong> ${item.observacao}` : ''}
                </div>
            </li>
        `;
    });

    mostrarTela('tela-carrinho');
}

document.getElementById('btn-enviar-pedido').addEventListener('click', async () => {
    if (carrinhoAtual.length === 0) return alert('A lista está vazia!');
    
    const btn = document.getElementById('btn-enviar-pedido');
    btn.innerText = "Enviando...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/pedidos/garcom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mesa: mesaAtual,
                itens: carrinhoAtual
            })
        });

        const data = await response.json();

        if (data.sucesso) {
            alert('Pedido enviado à cozinha!');
            await renderizarPedidosPendentes();
            mostrarTela('tela-inicial');
        } else {
            alert('Erro ao enviar pedido.');
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão ao enviar o pedido.');
    } finally {
        btn.innerText = "Enviar para Cozinha";
        btn.disabled = false;
    }
});

// --- LISTAGEM DE PEDIDOS PENDENTES DA COZINHA (DB_IC) ---
async function renderizarPedidosPendentes() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = '<p style="text-align:center;">Carregando pedidos...</p>';
    
    try {
        // Puxa as ordens em aberto na tabela orders do DB_IC
        const response = await fetch(`${API_URL}/orders`);
        const pendentes = await response.json();
        
        lista.innerHTML = '';
        if (pendentes.length === 0) {
            lista.innerHTML = '<p style="color:#777; text-align:center; padding: 20px 0;">Nenhum pedido pendente na cozinha.</p>';
            return;
        }

        pendentes.forEach(pedido => {
            lista.innerHTML += `
                <li class="order-item">
                    <div class="order-header">
                        <span>Mesa ${pedido.table_number}</span>
                        <span class="badge-status">Pendente</span>
                    </div>
                    <div class="cart-item-details" style="margin: 10px 0;">
                        ${pedido.items.split(' | ').join('<br>')}
                    </div>
                    <div style="margin-top: 10px;">
                        <button class="btn-secondary block" style="padding: 8px; font-size: 0.9rem;" onclick="simularCozinha(${pedido.id})">Simular: Cozinha deu Baixa</button>
                    </div>
                </li>
            `;
        });
    } catch (e) {
        lista.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar pedidos da cozinha.</p>';
    }
}

// Simula a Cozinha atualizando o status do DB_IC para 'COMPLETED'
async function simularCozinha(idOrderDB_IC) {
    try {
        await fetch(`${API_URL}/orders/complete/${idOrderDB_IC}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        await renderizarPedidosPendentes();
    } catch (e) {
        alert("Erro ao atualizar o pedido na cozinha.");
    }
}

// Chamada inicial
iniciar();