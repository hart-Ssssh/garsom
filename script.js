// Dados simulados do Cardápio
const cardapio = [
    { id: 1, nome: "X-Tudo Artesanal", preco: 35.90, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", complementos: ["Sem Salada", "Extra Bacon", "Pão Brioche", "Pão Australiano"] },
    { id: 2, nome: "Pizza Calabresa", preco: 45.00, img: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=400", complementos: ["Borda Recheada", "Sem Cebola", "Massa Fina"] },
    { id: 3, nome: "Coca-Cola 600ml", preco: 8.50, img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400", complementos: ["Com Gelo", "Com Limão"] }
];

// Estado do App
let pedidosGerais = [];
let mesaAtual = null;
let carrinhoAtual = [];
let itemEmFoco = null;
let qtdEmFoco = 1;
let complementosSelecionados = [];

// Navegação entre telas
function mostrarTela(idTela) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(idTela).classList.add('active');
    window.scrollTo(0, 0);
}
function voltarPara(idTela) { mostrarTela(idTela); }

// INÍCIO: Modal da Mesa
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

// CATÁLOGO: Renderizar e Buscar
function renderizarCatalogo(produtos) {
    const grid = document.getElementById('grid-produtos');
    grid.innerHTML = '';
    produtos.forEach(prod => {
        grid.innerHTML += `
            <div class="product-card" onclick="abrirDetalhes(${prod.id})">
                <img src="${prod.img}" alt="${prod.nome}">
                <div class="info">
                    <h4>${prod.nome}</h4>
                    <span class="price">R$ ${prod.preco.toFixed(2).replace('.', ',')}</span>
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

// DETALHES: Abrir e configurar produto (Estilo Shein)
function abrirDetalhes(id) {
    itemEmFoco = cardapio.find(p => p.id === id);
    qtdEmFoco = 1;
    complementosSelecionados = [];
    
    document.getElementById('item-qtd').innerText = qtdEmFoco;
    document.getElementById('item-obs').value = '';
    
    const conteudo = document.getElementById('detalhes-conteudo');
    conteudo.innerHTML = `
        <img src="${itemEmFoco.img}" class="item-hero-img">
        <div class="container details-container">
            <h2>${itemEmFoco.nome}</h2>
            <span class="price">R$ ${itemEmFoco.preco.toFixed(2).replace('.', ',')}</span>
        </div>
    `;

    const tagsContainer = document.getElementById('tags-complementos');
    tagsContainer.innerHTML = itemEmFoco.complementos.map(comp => 
        `<div class="tag" onclick="toggleTag(this, '${comp}')">${comp}</div>`
    ).join('');

    mostrarTela('tela-detalhes');
}

function alterarQtd(valor) {
    if (qtdEmFoco + valor > 0) {
        qtdEmFoco += valor;
        document.getElementById('item-qtd').innerText = qtdEmFoco;
    }
}

function toggleTag(elemento, complemento) {
    elemento.classList.toggle('selected');
    if (complementosSelecionados.includes(complemento)) {
        complementosSelecionados = complementosSelecionados.filter(c => c !== complemento);
    } else {
        complementosSelecionados.push(complemento);
    }
}

// ADICIONAR AO CARRINHO
document.getElementById('btn-add-carrinho').addEventListener('click', () => {
    const obs = document.getElementById('item-obs').value;
    carrinhoAtual.push({
        produto: itemEmFoco,
        quantidade: qtdEmFoco,
        complementos: [...complementosSelecionados],
        observacao: obs,
        subtotal: itemEmFoco.preco * qtdEmFoco
    });
    
    atualizarBadgeCarrinho();
    mostrarTela('tela-catalogo');
});

function atualizarBadgeCarrinho() {
    document.getElementById('cart-count').innerText = carrinhoAtual.length;
}

// CARRINHO E FINALIZAÇÃO
document.getElementById('btn-ver-carrinho').addEventListener('click', renderizarCarrinho);

function renderizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    lista.innerHTML = '';
    let total = 0;

    carrinhoAtual.forEach((item, index) => {
        total += item.subtotal;
        lista.innerHTML += `
            <li class="cart-item">
                <div class="cart-item-header">
                    <span>${item.quantidade}x ${item.produto.nome}</span>
                    <span>R$ ${item.subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="cart-item-details">
                    ${item.complementos.length ? `<strong>Tags:</strong> ${item.complementos.join(', ')}<br>` : ''}
                    ${item.observacao ? `<strong>Obs:</strong> ${item.observacao}` : ''}
                </div>
            </li>
        `;
    });

    document.getElementById('carrinho-total').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    mostrarTela('tela-carrinho');
}

document.getElementById('btn-enviar-pedido').addEventListener('click', () => {
    if (carrinhoAtual.length === 0) return alert('O carrinho está vazio!');
    
    // Adiciona ao array global de pedidos
    pedidosGerais.push({
        id: Date.now(),
        mesa: mesaAtual,
        itens: [...carrinhoAtual],
        total: carrinhoAtual.reduce((acc, item) => acc + item.subtotal, 0),
        status: 'pendente'
    });
    
    renderizarPedidosPendentes();
    mostrarTela('tela-inicial');
});

// TELA INICIAL: Gerenciar Pendentes
function renderizarPedidosPendentes() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = '';
    
    // Filtra apenas os pendentes (se mudar para preparo, some da tela)
    const pendentes = pedidosGerais.filter(p => p.status === 'pendente');
    
    if (pendentes.length === 0) {
        lista.innerHTML = '<p style="color:#777; text-align:center; padding: 20px 0;">Nenhum pedido pendente no momento.</p>';
        return;
    }

    pendentes.forEach(pedido => {
        lista.innerHTML += `
            <li class="order-item">
                <div class="order-header">
                    <span>Mesa ${pedido.mesa}</span>
                    <span class="badge-status">Pendente</span>
                </div>
                <p>Total: R$ ${pedido.total.toFixed(2).replace('.', ',')}</p>
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button class="btn-secondary" style="padding: 8px; font-size: 0.9rem;" onclick="simularCozinha(${pedido.id})">Aprovar na Cozinha</button>
                </div>
            </li>
        `;
    });
}

// Função simulando a cozinha dando "OK"
function simularCozinha(idPedido) {
    const pedido = pedidosGerais.find(p => p.id === idPedido);
    if (pedido) {
        pedido.status = 'em preparo';
        renderizarPedidosPendentes(); // Re-renderiza a lista, o que fará o item sumir da tela do garçom
    }
}

// Inicialização
renderizarPedidosPendentes();