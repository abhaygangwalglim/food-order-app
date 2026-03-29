// Food Ordering App Data & Logic

// Menu Data Array
const menuItems = [
    {
        id: 'pizza',
        name: 'Pepperoni Pizza',
        price: 14.99,
        image: 'assets/pizza.png',
        description: 'Hot pepperoni pizza with a rustic crust and melty mozzarella.'
    },
    {
        id: 'burger',
        name: 'Gourmet Double Burger',
        price: 11.49,
        image: 'assets/burger.png',
        description: 'Juicy double beef patty with melted cheese, lettuce, and tomatoes.'
    },
    {
        id: 'pasta',
        name: 'Spaghetti Bolognese',
        price: 13.99,
        image: 'assets/pasta.png',
        description: 'Classic rich meat sauce spaghetti topped with fresh parmesan.'
    },
    {
        id: 'sandwich',
        name: 'Turkey Club Sandwich',
        price: 9.99,
        image: 'assets/sandwich.png',
        description: 'Triple-decker fresh turkey, bacon, lettuce, tomato and mayo.'
    },
    {
        id: 'drinks',
        name: 'Icy Cola',
        price: 3.49,
        image: 'assets/drinks.png',
        description: 'Cold, refreshing soda drink with ice and lemon slices.'
    }
];

// App State
let cart = []; // Array of { id, quantity }
let orderHistory = []; // Array of order objects

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Load past orders
    const storedOrders = localStorage.getItem('foodAppOrders');
    if (storedOrders) {
        orderHistory = JSON.parse(storedOrders);
    }

    renderMenu();
    updateCartUI();

    // Navigation toggles
    document.getElementById('nav-menu').addEventListener('click', () => toggleView('menu'));
    document.getElementById('nav-cart').addEventListener('click', () => toggleView('cart'));
    document.getElementById('nav-orders').addEventListener('click', () => toggleView('orders'));
});

// View Toggle Logic (SPA)
function toggleView(viewName) {
    const sections = {
        'menu': document.getElementById('menu-section'),
        'cart': document.getElementById('cart-section'),
        'orders': document.getElementById('orders-section')
    };
    const buttons = {
        'menu': document.getElementById('nav-menu'),
        'cart': document.getElementById('nav-cart'),
        'orders': document.getElementById('nav-orders')
    };

    // Hide all sections and remove active from all buttons
    Object.values(sections).forEach(sec => sec.classList.remove('active'));
    Object.values(buttons).forEach(btn => btn.classList.remove('active'));

    // Show selected
    sections[viewName].classList.add('active');
    buttons[viewName].classList.add('active');

    if (viewName === 'cart') renderCart();
    if (viewName === 'orders') renderOrders();
}

// Menu Grid/List Toggle Logic
function setMenuView(view) {
    document.getElementById('btn-grid').classList.toggle('active', view === 'grid');
    document.getElementById('btn-list').classList.toggle('active', view === 'list');
    
    const menuGrid = document.getElementById('menu-grid');
    if (view === 'list') {
        menuGrid.classList.add('list-view');
    } else {
        menuGrid.classList.remove('list-view');
    }
}

// Render Menu Cards
function renderMenu() {
    const menuGrid = document.getElementById('menu-grid');
    menuGrid.innerHTML = ''; // Clear prior

    menuItems.forEach(item => {
        // Create card element
        const card = document.createElement('div');
        card.className = 'food-card';
        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="food-img" onerror="this.src='https://placehold.co/400?text=${item.name.replace(' ','+')}'">
            <div class="food-info">
                <div class="food-header">
                    <span class="food-name">${item.name}</span>
                    <span class="food-price">$${item.price.toFixed(2)}</span>
                </div>
                <p style="margin-bottom: 20px; font-size: 0.9rem;">${item.description}</p>
                <button class="btn btn-primary add-btn" onclick="addToCart('${item.id}')">
                    <i class='bx bx-cart-add'></i> Add to Cart
                </button>
            </div>
        `;
        menuGrid.appendChild(card);
    });
}

// Cart Mechanics
function addToCart(itemId) {
    const existingIndex = cart.findIndex(c => c.id === itemId);
    if (existingIndex !== -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({ id: itemId, quantity: 1 });
    }
    
    updateCartUI();
    
    // Provide user feedback
    const item = menuItems.find(m => m.id === itemId);
    showToast(`Added ${item.name} to cart!`);
}

function removeFromCart(itemId, entirely = false) {
    const existingIndex = cart.findIndex(c => c.id === itemId);
    if (existingIndex !== -1) {
        if (entirely || cart[existingIndex].quantity === 1) {
            cart.splice(existingIndex, 1);
        } else {
            cart[existingIndex].quantity -= 1;
        }
    }
    updateCartUI();
    renderCart(); // refresh the view if we are on the cart page
}

function changeQuantity(itemId, delta) {
    const existingIndex = cart.findIndex(c => c.id === itemId);
    if (existingIndex !== -1) {
        if (delta < 0 && cart[existingIndex].quantity === 1) {
            // Confirm delete or just delete since they clicked minus at 1
            removeFromCart(itemId, true);
        } else {
            cart[existingIndex].quantity += delta;
            updateCartUI();
            renderCart();
        }
    }
}

// Update badges and globals
function updateCartUI() {
    const badge = document.getElementById('cart-badge');
    
    let totalItems = 0;
    cart.forEach(item => totalItems += item.quantity);
    
    badge.innerText = totalItems;
    
    // Animate badge
    badge.style.transform = 'scale(1.3)';
    setTimeout(() => badge.style.transform = 'scale(1)', 200);
}

// Render Cart Page DOM
function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    const emptyMsg = document.getElementById('empty-cart');
    const summaryCard = document.getElementById('cart-summary');
    
    let totalItems = 0;
    let totalPrice = 0;

    // Remove existing item rows
    const existingRows = cartContainer.querySelectorAll('.cart-item');
    existingRows.forEach(row => row.remove());

    if (cart.length === 0) {
        emptyMsg.style.display = 'block';
        summaryCard.style.display = 'none';
        return;
    }

    emptyMsg.style.display = 'none';
    summaryCard.style.display = 'block';

    cart.forEach(cartEntry => {
        const itemInfo = menuItems.find(m => m.id === cartEntry.id);
        const itemTotal = itemInfo.price * cartEntry.quantity;
        
        totalItems += cartEntry.quantity;
        totalPrice += itemTotal;

        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <img src="${itemInfo.image}" alt="${itemInfo.name}" class="cart-item-img" onerror="this.src='https://placehold.co/100?text=Food'">
            <div class="cart-item-info">
                <div class="cart-item-title">${itemInfo.name}</div>
                <div class="cart-item-price">$${itemInfo.price.toFixed(2)}</div>
            </div>
            
            <div class="cart-controls">
                <div class="quantity-control">
                    <button onclick="changeQuantity('${itemInfo.id}', -1)"><i class='bx bx-minus'></i></button>
                    <span>${cartEntry.quantity}</span>
                    <button onclick="changeQuantity('${itemInfo.id}', 1)"><i class='bx bx-plus'></i></button>
                </div>
                <div style="width: 80px; font-weight: 700; text-align: right;">
                    $${itemTotal.toFixed(2)}
                </div>
                <button class="btn-icon" onclick="removeFromCart('${itemInfo.id}', true)" title="Remove item">
                    <i class='bx bxs-trash'></i>
                </button>
            </div>
        `;
        cartContainer.appendChild(row);
    });

    // Update Summary Sidebar
    document.getElementById('summary-count').innerText = totalItems;
    document.getElementById('summary-total').innerText = '$' + totalPrice.toFixed(2);
}

// Checkout functionality
function placeOrder() {
    if (cart.length === 0) return;
    
    // Calculate total for history
    let orderTotal = 0;
    const itemsSnapshot = cart.map(c => {
        const itemInfo = menuItems.find(m => m.id === c.id);
        const itemTotal = itemInfo.price * c.quantity;
        orderTotal += itemTotal;
        return { name: itemInfo.name, quantity: c.quantity, price: itemTotal };
    });

    // Create Order Object
    const newOrder = {
        id: 'ORD' + Math.floor(Math.random() * 100000),
        date: new Date().toLocaleString(),
        items: itemsSnapshot,
        total: orderTotal,
        status: 'Pending'
    };

    // Save locally for personal isolation
    orderHistory.unshift(newOrder);
    localStorage.setItem('foodAppOrders', JSON.stringify(orderHistory));

    // Sync globally for admin dashboard
    fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
    }).catch(err => console.info('Global sync not available or backend down.'));

    showToast(`Order placed successfully! Preparing your food.`, 'success');
    
    // Reset cart
    setTimeout(() => {
        cart = [];
        updateCartUI();
        toggleView('orders'); // Send to orders history instead of menu
    }, 1500);
}

// Render Order History DOM
function renderOrders() {
    const ordersContainer = document.getElementById('orders-container');
    ordersContainer.innerHTML = '';

    if (orderHistory.length === 0) {
        ordersContainer.innerHTML = `
            <div class="empty-cart-message">
                <i class='bx bx-history'></i>
                <p>You have no past orders.</p>
                <button class="btn btn-primary" onclick="toggleView('menu')">Browse Menu</button>
            </div>
        `;
        return;
    }

    orderHistory.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        let itemsHTML = '<ul class="order-items-list">';
        order.items.forEach(item => {
            itemsHTML += `<li><span>${item.quantity}x ${item.name}</span> <span>$${item.price.toFixed(2)}</span></li>`;
        });
        itemsHTML += '</ul>';

        orderCard.innerHTML = `
            <div class="order-header">
                <div>
                    <div class="order-id">Order #${order.id}</div>
                    <div class="order-date">${order.date}</div>
                </div>
                <div>
                    <div class="order-total">$${order.total.toFixed(2)}</div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: ${order.status === 'Completed' ? '#2ecc71' : '#f39c12'}">${order.status || 'Pending'}</div>
                </div>
            </div>
            ${itemsHTML}
        `;
        ordersContainer.appendChild(orderCard);
    });
}

// Toast System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = type === 'success' ? '<i class="bx bx-check-circle" style="color: #2ecc71; font-size: 1.5rem"></i>' 
                                 : '<i class="bx bx-info-circle" style="color: #3498db; font-size: 1.5rem"></i>';
    
    toast.innerHTML = icon + `<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
