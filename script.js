// Substitua pela URL real do seu Worker
const API_URL = "https://codecream.larissagazoli45.workers.dev/"; 

let cardapio = [];
let mesaAtual = null;
let carrinhoAtual = [];
let itemEmFoco = null;
let qtdEmFoco = 1;

async function iniciar() {
    await carregarProdutos();
    await renderizarPedidosPendentes();
}

// 1. PUXA NOME, FOTO E QUANTIDADE (ESTOQUE) DA API
async function carregarProdutos() {
    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) throw new Error("Falha na rede: " + response.status);
        
        const data = await response.json();
        const produtosBD = Array.isArray(data) ? data : (data.results || []);
        
        // Mapeando dados do DB para o front
        cardapio = produtosBD.map(p => {
            return {
                id: p.id_cardapio,
                nome: p.nome_produto || 'Sem nome',
                img: p.imagem || 'https://via.placeholder.com/150',
                estoque: parseFloat(p.quantidade) || 0 // Capturando a quantidade disponível
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

document.getElementById('btn-iniciar-pedido').addEventListener('click', async () => {
    const mesa = document.getElementById('input-mesa').value;
    if (!mesa) return alert("Informe o número da mesa!");
    
    mesaAtual = mesa;
    carrinhoAtual = [];
    document.getElementById('carrinho-mesa').innerText = `Mesa ${mesa}`;
    document.getElementById('modal-mesa').classList.remove('active');
    atualizarBadgeCarrinho();
    
    if (cardapio.length === 0) {
        document.getElementById('grid-produtos').innerHTML = '<p style="text-align:center;width:100%">Carregando cardápio...</p>';
        mostrarTela('tela-catalogo');
        await carregarProdutos(); 
    }
    
    renderizarCatalogo(cardapio);
    mostrarTela('tela-catalogo');
});

// --- FLUXO DO CATÁLOGO (Mostrando a Quantidade) ---
function renderizarCatalogo(produtos) {
    const grid = document.getElementById('grid-produtos');
    grid.innerHTML = '';
    
    if(produtos.length === 0) {
        grid.innerHTML = '<p style="text-align:center;width:100%">Nenhum produto encontrado no banco de dados.</p>';
        return;
    }

    produtos.forEach(prod => {
        grid.innerHTML += `
            <div class="product-card" onclick="abrirDetalhes(${prod.id})">
                <img src="${prod.img}" alt="${prod.nome}">
                <div class="info">
                    <h4>${prod.nome}</h4>
                    <small style="color: #666; font-size: 0.8rem;">Em estoque: ${prod.estoque}</small>
                </div>
            </div>
        `;
    });
}

document.getElementById('busca-comida').addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    const filtrados = cardapio.filter(p => (p.nome || '').toLowerCase().includes(termo));
    renderizarCatalogo(filtrados);
});

// --- FLUXO DETALHES DO PRODUTO (Limitando a Quantidade) ---
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
            <p style="color: #555; margin-bottom: 10px;">Estoque atual: ${itemEmFoco.estoque} unidades</p>
        </div>
    `;

    mostrarTela('tela-detalhes');
}

function alterarQtd(valor) {
    const novoValor = qtdEmFoco + valor;
    // O garçom não pode pedir mais do que a quantidade disponível no banco
    if (novoValor > 0 && novoValor <= itemEmFoco.estoque) {
        qtdEmFoco = novoValor;
        document.getElementById('item-qtd').innerText = qtdEmFoco;
    } else if (novoValor > itemEmFoco.estoque) {
        alert(`Não é possível adicionar. O estoque atual é de apenas ${itemEmFoco.estoque} unidades.`);
    }
}

document.getElementById('btn-add-carrinho').addEventListener('click', () => {
    // Se o estoque for 0, não deixa adicionar
    if(itemEmFoco.estoque <= 0) {
        return alert("Produto fora de estoque!");
    }

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
document.getElementById('btn-ver-carrinho').addEventListener('click', () => {
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
});

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
            await carregarProdutos(); // Atualiza o estoque localmente
            await renderizarPedidosPendentes();
            mostrarTela('tela-inicial');
        } else {
            alert('Erro ao enviar pedido: ' + (data.erro || 'Desconhecido'));
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
        const response = await fetch(`${API_URL}/orders`);
        const pendentes = await response.json();
        const listaDados = Array.isArray(pendentes) ? pendentes : (pendentes.results || []);
        
        lista.innerHTML = '';
        if (listaDados.length === 0) {
            lista.innerHTML = '<p style="color:#777; text-align:center; padding: 20px 0;">Nenhum pedido pendente na cozinha.</p>';
            return;
        }

        listaDados.forEach(pedido => {
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

iniciar();