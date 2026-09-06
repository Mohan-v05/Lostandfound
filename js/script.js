// ============================================================
// Supabase Setup
// ============================================================
const SUPABASE_URL = "https://uokbjqdebdcdpghsyvru.supabase.co";
const SUPABASE_KEY = "sb_publishable_Nj6HePujmihScy5vXXpKVg_9AYGChI6";
const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
console.log(typeof window.supabase, supabaseClient);
// Local storage keys (used only as an offline cache / fallback)
var STORAGE_KEY = 'uwu_findit_items';
var AUTH_KEY = 'uwu_findit_admin_auth';

// Hardcoded Admin Credentials (NOTE: for a real app, move auth server-side)
var ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// ============================================================
// Mapping helpers (DB row <-> app item shape)
// ============================================================
function normalizeItemForSupabase(item) {
    var row = {
        item_name: item.itemName || item.item_name || '',
        category: item.category || '',
        location: item.location || '',
        date: item.date || '',
        description: item.description || '',
        contact: item.contact || '',
        status: item.status || 'lost',
        image_url: item.recoveredImage || item.image_url || null
    };
    // Only include id/created_at if they already exist (updates/upserts)
    if (item.id) row.id = item.id;
    if (item.createdAt || item.created_at) {
        row.created_at = item.createdAt || item.created_at;
    }
    return row;
}

function mapSupabaseRow(row) {
    return {
        id: row.id,
        itemName: row.item_name || row.itemName || '',
        category: row.category || '',
        location: row.location || '',
        date: row.date || '',
        description: row.description || '',
        contact: row.contact || '',
        status: row.status || 'lost',
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        recoveredImage: row.image_url || row.recoveredImage || null
    };
}

// ============================================================
// Supabase CRUD
// ============================================================
async function getItemsFromSupabase() {
    if (!supabaseClient) return [];

    var res = await supabaseClient
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    if (res.error) {
        console.error('Error loading items:', res.error);
        return [];
    }
    return res.data.map(mapSupabaseRow);
}

async function addItemToSupabase(item) {
    if (!supabaseClient) return null;

    var res = await supabaseClient
        .from('items')
        .insert([normalizeItemForSupabase(item)])
        .select()
        .single();

    if (res.error) {
        console.error('Error adding item:', res.error);
        return null;
    }
    return mapSupabaseRow(res.data);
}

async function updateItemInSupabase(id, changes) {
    if (!supabaseClient) return null;

    var res = await supabaseClient
        .from('items')
        .update(normalizeItemForSupabase(changes))
        .eq('id', id)
        .select()
        .single();

    if (res.error) {
        console.error('Error updating item:', res.error);
        return null;
    }
    return mapSupabaseRow(res.data);
}

async function deleteItemFromSupabase(id) {
    if (!supabaseClient) return false;

    var res = await supabaseClient
        .from('items')
        .delete()
        .eq('id', id);

    if (res.error) {
        console.error('Error deleting item:', res.error);
        return false;
    }
    return true;
}

async function getItemByIdFromSupabase(id) {
    if (!supabaseClient) return null;

    var res = await supabaseClient
        .from('items')
        .select('*')
        .eq('id', id)
        .single();

    if (res.error) {
        console.error('Error getting item:', res.error);
        return null;
    }
    return mapSupabaseRow(res.data);
}

async function testSupabase() {
    if (!supabaseClient) {
        console.warn('Supabase client is not available yet.');
        return;
    }

    var res = await supabaseClient.from('items').select('*').limit(5);

    if (res.error) {
        console.error('Supabase connection failed:', res.error);
    } else {
        console.log('Supabase connected successfully!');
        console.log(res.data);
    }
}

// ============================================================
// Local storage cache (fallback only — used if Supabase is
// unavailable, and kept in sync after every Supabase call)
// ============================================================
function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getCachedItems() {
    var data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// ============================================================
// Unified data access — tries Supabase first, falls back to cache
// ============================================================
async function getItems() {
    if (supabaseClient) {
        var items = await getItemsFromSupabase();
        if (items.length > 0) {
            saveItems(items);
            return items;
        }
        // Supabase reachable but empty (or errored) — fall back to cache
        return getCachedItems();
    }
    return getCachedItems();
}

async function getItemById(id) {
    if (supabaseClient) {
        var item = await getItemByIdFromSupabase(id);
        if (item) return item;
    }
    var cached = getCachedItems();
    for (var i = 0; i < cached.length; i++) {
        if (cached[i].id === id) return cached[i];
    }
    return null;
}

async function addItem(item) {
    if (supabaseClient) {
        var created = await addItemToSupabase(item);
        if (created) {
            var items = await getItems();
            return created;
        }
    }
    // Fallback: local-only item
    var localItem = item;
    localItem.id = 'ITEM-' + Date.now();
    localItem.createdAt = new Date().toISOString();
    var cached = getCachedItems();
    cached.unshift(localItem);
    saveItems(cached);
    return localItem;
}

async function deleteItem(id) {
    if (supabaseClient) {
        await deleteItemFromSupabase(id);
    }
    var cached = getCachedItems();
    var filtered = [];
    for (var i = 0; i < cached.length; i++) {
        if (cached[i].id !== id) filtered.push(cached[i]);
    }
    saveItems(filtered);
}

async function markItemRecovered(id, recoveredImage) {
    var changes = { status: 'recovered', recoveredImage: recoveredImage };

    if (supabaseClient) {
        var updated = await updateItemInSupabase(id, changes);
        if (updated) return updated;
    }

    // Fallback: update cache only
    var cached = getCachedItems();
    for (var i = 0; i < cached.length; i++) {
        if (cached[i].id === id) {
            cached[i].status = 'recovered';
            cached[i].recoveredImage = recoveredImage;
            break;
        }
    }
    saveItems(cached);
    return null;
}

// ============================================================
// Page Load Initialization
// ============================================================
window.onload = function () {
    initApp();
};

async function initApp() {
    console.log('System Initialized');
    await testSupabase();

    if (document.getElementById('recent-items-container')) {
        renderRecentItems();
    }

    if (document.getElementById('all-items-container')) {
        renderAllItems();
    }

    if (document.getElementById('search-results')) {
        initSearch();
    }

    if (document.getElementById('item-details-container')) {
        renderItemDetails();
    }

    if (document.getElementById('admin-items-table')) {
        checkAdminAuth();

        var loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.onsubmit = handleAdminLogin;
        }
    }

    // Setup forms
    var lostForm = document.getElementById('lost-form');
    if (lostForm) {
        lostForm.onsubmit = function (e) {
            handleFormSubmit(e, 'lost');
        };
    }

    var foundForm = document.getElementById('found-form');
    if (foundForm) {
        foundForm.onsubmit = function (e) {
            handleFormSubmit(e, 'found');
        };
    }

    // Mobile Navigation Button
    var menuBtn = document.querySelector('.mobile-menu-btn');
    var navLinks = document.querySelector('.nav-links');
    if (menuBtn) {
        menuBtn.onclick = function () {
            if (navLinks.style.display === 'flex') {
                navLinks.style.display = 'none';
            } else {
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
            }
        };
    }
}

// ============================================================
// Form logic
// ============================================================
async function handleFormSubmit(e, type) {
    e.preventDefault();
    var form = e.target;

    var itemData = {
        itemName: form.itemName.value,
        category: form.category.value,
        location: form.location.value,
        date: form.date.value,
        description: form.description.value,
        contact: form.contact.value,
        status: type
    };

    await addItem(itemData);
    alert('Report submitted successfully!');
    window.location.href = 'items.html';
}

// ============================================================
// UI Rendering Functions
// ============================================================
function createItemCard(item) {
    var card = document.createElement('div');
    card.className = 'item-card';

    var html = '<span class="status-badge status-' + item.status + '">' + item.status + '</span>';
    html += '<div class="card-content">';
    html += '<h3 class="card-title">' + item.itemName + '</h3>';
    html += '<div class="card-meta">';
    html += '<span><strong>Location:</strong> ' + item.location + '</span>';
    html += '<span><strong>Date:</strong> ' + item.date + '</span>';
    html += '<span><strong>Category:</strong> ' + item.category + '</span>';
    html += '</div>';
    html += '<a href="details.html?id=' + item.id + '" class="btn btn-primary" style="width: 100%; text-align: center;">View Details</a>';
    html += '</div>';

    card.innerHTML = html;
    return card;
}

async function renderRecentItems() {
    var container = document.getElementById('recent-items-container');
    var items = await getItems();
    container.innerHTML = '';

    var limit = items.length;
    if (limit > 4) limit = 4;

    for (var i = 0; i < limit; i++) {
        container.appendChild(createItemCard(items[i]));
    }
}

async function renderAllItems() {
    var container = document.getElementById('all-items-container');
    var items = await getItems();
    container.innerHTML = '';

    for (var i = 0; i < items.length; i++) {
        container.appendChild(createItemCard(items[i]));
    }
}

// ============================================================
// Search Functionality
// ============================================================
async function initSearch() {
    var searchInput = document.getElementById('search-input');
    var categoryFilter = document.getElementById('category-filter');
    var locationFilter = document.getElementById('location-filter');

    var allItems = await getItems(); // fetch once, filter client-side

    function runSearch() {
        var query = searchInput.value.toLowerCase();
        var cat = categoryFilter.value;
        var loc = locationFilter.value;

        var results = [];
        for (var i = 0; i < allItems.length; i++) {
            var item = allItems[i];
            var matchesQuery = item.itemName.toLowerCase().indexOf(query) !== -1;
            var matchesCat = (cat === '' || item.category === cat);
            var matchesLoc = (loc === '' || item.location === loc);

            if (matchesQuery && matchesCat && matchesLoc) {
                results.push(item);
            }
        }

        var container = document.getElementById('search-results');
        container.innerHTML = '';
        for (var j = 0; j < results.length; j++) {
            container.appendChild(createItemCard(results[j]));
        }
    }

    searchInput.oninput = runSearch;
    categoryFilter.onchange = runSearch;
    locationFilter.onchange = runSearch;

    runSearch(); // Initial run
}

// ============================================================
// Details Page
// ============================================================
async function renderItemDetails() {
    var container = document.getElementById('item-details-container');
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');

    var item = await getItemById(id);

    if (!item) {
        container.innerHTML = '<h2>Item Not Found</h2>';
        return;
    }

    var html = '<div class="item-detail-view" style="background: white; padding: 2rem; border-radius: 8px;">';
    html += '<h1>' + item.itemName + '</h1>';
    html += '<p><strong>Status:</strong> ' + item.status + '</p>';
    html += '<p><strong>Category:</strong> ' + item.category + '</p>';
    html += '<p><strong>Location:</strong> ' + item.location + '</p>';
    html += '<p><strong>Date:</strong> ' + item.date + '</p>';
    html += '<p><strong>Contact:</strong> ' + item.contact + '</p>';
    html += '<p><strong>Description:</strong> ' + item.description + '</p>';

    if (item.status === 'recovered') {
        html += '<div style="margin-top: 20px;"><h3>Recovery Proof</h3>';
        if (item.recoveredImage) {
            html += '<img src="' + item.recoveredImage + '" style="max-width: 100%;">';
        } else {
            html += '<p>No image uploaded.</p>';
        }
        html += '</div>';
    } else {
        html += '<div id="recovery-btn-area" style="margin-top: 20px;">';
        html += '<button onclick="showUploadUI(\'' + item.id + '\')" class="btn btn-accent">Mark as Recovered</button>';
        html += '</div>';
        html += '<div id="upload-box" style="display:none; margin-top: 15px; border: 1px solid #ccc; padding: 10px;">';
        html += '<h4>Upload Proof</h4>';
        html += '<input type="file" id="fileInput" accept="image/*">';
        html += '<button onclick="saveRecovery(\'' + item.id + '\')" class="btn btn-primary" style="margin-top: 10px;">Save Recovery</button>';
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

// Global functions for buttons
window.showUploadUI = function (id) {
    document.getElementById('upload-box').style.display = 'block';
    document.getElementById('recovery-btn-area').style.display = 'none';
};

window.saveRecovery = function (id) {
    var fileInput = document.getElementById('fileInput');

    async function update(imgBase64) {
        await markItemRecovered(id, imgBase64);
        alert('Item marked as recovered!');
        location.reload();
    }

    if (fileInput.files && fileInput.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            update(e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        update(null);
    }
};

// ============================================================
// Admin Dashboard
// ============================================================
async function renderAdminDashboard() {
    var tableBody = document.querySelector('#admin-items-table tbody');
    var items = await getItems();
    tableBody.innerHTML = '';

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var row = document.createElement('tr');
        row.innerHTML = '<td>' + item.id + '</td>' +
            '<td>' + item.itemName + '</td>' +
            '<td>' + item.status + '</td>' +
            '<td>' + item.category + '</td>' +
            '<td>' + item.location + '</td>' +
            '<td><button onclick="deleteAndRefresh(\'' + item.id + '\')" class="btn btn-primary" style="background: red;">Delete</button></td>';
        tableBody.appendChild(row);
    }
}

window.deleteAndRefresh = async function (id) {
    if (confirm('Delete this item?')) {
        await deleteItem(id);
        renderAdminDashboard();
    }
};

// ============================================================
// Admin Authentication Logic
// ============================================================
function checkAdminAuth() {
    var isLoggedIn = localStorage.getItem(AUTH_KEY) === 'true';
    var loginSection = document.getElementById('login-section');
    var adminContent = document.getElementById('admin-content');

    if (isLoggedIn) {
        if (loginSection) loginSection.style.display = 'none';
        if (adminContent) adminContent.style.display = 'block';
        renderAdminDashboard();
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (adminContent) adminContent.style.display = 'none';
    }
}

function handleAdminLogin(e) {
    e.preventDefault();
    var username = e.target.username.value;
    var password = e.target.password.value;
    var errorMsg = document.getElementById('login-error');

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem(AUTH_KEY, 'true');
        if (errorMsg) errorMsg.style.display = 'none';
        checkAdminAuth();
    } else {
        if (errorMsg) errorMsg.style.display = 'block';
    }
}

window.handleLogout = function () {
    localStorage.removeItem(AUTH_KEY);
    window.location.reload();
};