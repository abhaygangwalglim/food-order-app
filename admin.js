// Admin Dashboard Logic

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchConfig();
    checkAuth();

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
});

let globalConfig = null;

async function fetchConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            globalConfig = await response.json();
            if (globalConfig.WEBSITE_NAME) {
                document.getElementById('page-title').textContent = globalConfig.WEBSITE_NAME + " Admin Dashboard";
                document.getElementById('logo-text').textContent = globalConfig.WEBSITE_NAME;
            }
            generateQRCodes();
        }
    } catch (error) {
        console.error("Failed to fetch configuration:", error);
    }
}

// Authentication System
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
    if (isLoggedIn === 'true') {
        showDashboard();
    } else {
        showLogin();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;
    const errorMsg = document.getElementById('login-error');
    
    // Submit button UX feedback
    const btn = e.target.querySelector('.btn-primary');
    if(btn) {
        btn.innerHTML = "<i class='bx bx-loader bx-spin'></i> Authenticating...";
        btn.disabled = true;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            localStorage.setItem('isAdminLoggedIn', 'true');
            showDashboard();
            errorMsg.innerText = '';
        } else {
            errorMsg.innerText = 'Access Denied: Invalid credentials.';
        }
    } catch (err) {
        errorMsg.innerText = 'Authentication server offline.';
        console.error("Login Error:", err);
    } finally {
        if(btn) {
            btn.innerHTML = 'Login as Admin';
            btn.disabled = false;
        }
    }
}

function handleLogout() {
    localStorage.removeItem('isAdminLoggedIn');
    showLogin();
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('admin-user').value = '';
    document.getElementById('admin-pass').value = '';
}

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'flex';
    loadOrders();
}

// Navigation Router
function switchAdminView(view) {
    document.getElementById('dashboard-view').style.display = view === 'dashboard' ? 'block' : 'none';
    document.getElementById('qr-view').style.display = view === 'qr' ? 'block' : 'none';
    
    document.getElementById('nav-dashboard').className = view === 'dashboard' ? 'active' : '';
    document.getElementById('nav-qr').className = view === 'qr' ? 'active' : '';
}

// QR Code Automation
function generateQRCodes() {
    if (!globalConfig || !globalConfig.TOTAL_TABLES || !globalConfig.BASE_URL) return;
    
    const qrGrid = document.getElementById('qr-grid');
    if (!qrGrid) return;
    qrGrid.innerHTML = '';
    
    for (let i = 1; i <= globalConfig.TOTAL_TABLES; i++) {
        const url = `${globalConfig.BASE_URL}/?table=${i}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
        
        const card = document.createElement('div');
        card.style = "background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; border: 2px solid #f1f2f6;";
        card.innerHTML = `
            <img src="${qrUrl}" alt="Table ${i} QR" style="width: 150px; height: 150px; margin-bottom: 15px;">
            <h3 style="margin: 0; color: var(--text-color); font-size: 1.4rem;">Table ${i}</h3>
            <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: var(--text-muted); word-break: break-all;">${url}</p>
        `;
        qrGrid.appendChild(card);
    }
}

// Order Management System
let currentOrders = [];

async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        if (response.ok) {
            currentOrders = await response.json();
        } else {
            console.warn("Backend error.");
            currentOrders = [];
        }
    } catch {
        console.warn("Backend not running. Checking local.");
        const rawOrders = localStorage.getItem('foodAppOrders');
        currentOrders = rawOrders ? JSON.parse(rawOrders) : [];
    }

    renderDashboardTable();
    updateAnalytics();
}

function renderDashboardTable() {
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = '';

    if (currentOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No incoming orders found.</td></tr>`;
        return;
    }

    currentOrders.forEach((order, index) => {
        const tr = document.createElement('tr');
        
        let itemsList = '<ul class="td-items">';
        order.items.forEach(i => {
            itemsList += `<li>${i.quantity}x ${i.name} ($${i.price.toFixed(2)})</li>`;
        });
        itemsList += '</ul>';

        // Badge styling
        const statusBadgeClass = order.status === 'Completed' ? 'status-completed' : 'status-pending';

        tr.innerHTML = `
            <td style="font-weight: 600;">${order.id}</td>
            <td style="font-weight: 700; color: #3498db;">${order.table || 'N/A'}</td>
            <td style="color: var(--text-muted); font-size: 0.9rem;">${order.date}</td>
            <td>${itemsList}</td>
            <td style="font-weight: 700; color: var(--primary);">$${order.total.toFixed(2)}</td>
            <td><span class="status-badge ${statusBadgeClass}">${order.status || 'Pending'}</span></td>
            <td class="action-btns">
                <button class="btn btn-success" title="Mark Completed" onclick="markCompleted(${index})" ${order.status === 'Completed' ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                    <i class='bx bx-check'></i>
                </button>
                <button class="btn btn-danger" title="Delete Order" onclick="deleteOrder(${index})">
                    <i class='bx bxs-trash'></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function markCompleted(index) {
    const orderId = currentOrders[index].id;
    currentOrders[index].status = 'Completed';
    
    // Optimistic UI updates
    renderDashboardTable();
    updateAnalytics();
    showToast('Order marked as completed.', 'success');
    
    // Sync backend
    fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
    }).catch(err => console.error('Failed API:', err));
}

async function deleteOrder(index) {
    if (confirm(`Are you sure you want to delete Order #${currentOrders[index].id}?`)) {
        const orderId = currentOrders[index].id;
        currentOrders.splice(index, 1);
        
        renderDashboardTable();
        updateAnalytics();
        showToast('Order deleted.', 'info');
        
        // Sync backend
        fetch(`/api/orders/${orderId}`, {
            method: 'DELETE'
        }).catch(err => console.error('Failed API:', err));
    }
}

// Analytics Engine
function updateAnalytics() {
    const filter = document.getElementById('time-filter').value;
    const now = new Date();
    
    // Filter orders based on time
    const filteredOrders = currentOrders.filter(order => {
        const orderDate = new Date(order.date);
        if (filter === 'all') return true;
        
        if (filter === 'today') {
            return orderDate.toDateString() === now.toDateString();
        }
        if (filter === 'weekly') {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return orderDate >= oneWeekAgo;
        }
        if (filter === 'monthly') {
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        }
        if (filter === 'yearly') {
            return orderDate.getFullYear() === now.getFullYear();
        }
        return true;
    });

    document.getElementById('stat-orders').innerText = filteredOrders.length;
    
    let totalRevenue = 0;
    const itemCounts = {};

    filteredOrders.forEach(order => {
        totalRevenue += order.total;
        order.items.forEach(item => {
            if (!itemCounts[item.name]) itemCounts[item.name] = 0;
            itemCounts[item.name] += item.quantity;
        });
    });

    document.getElementById('stat-revenue').innerText = '$' + totalRevenue.toFixed(2);

    let topItemName = '-';
    let maxQuantity = 0;
    for (const [name, qty] of Object.entries(itemCounts)) {
        if (qty > maxQuantity) {
            maxQuantity = qty;
            topItemName = `${name} (${qty})`;
        }
    }
    
    document.getElementById('stat-top-item').innerText = topItemName;
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
