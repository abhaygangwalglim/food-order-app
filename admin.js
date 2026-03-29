// Admin Dashboard Logic

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchConfig();
    checkAuth();

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
});

async function fetchConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            if (config.WEBSITE_NAME) {
                document.getElementById('page-title').textContent = config.WEBSITE_NAME + " Admin Dashboard";
                document.getElementById('logo-text').textContent = config.WEBSITE_NAME;
            }
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
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No incoming orders found.</td></tr>`;
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
