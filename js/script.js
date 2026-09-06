// UWU FindIt - Basic JavaScript Logic for University Project

// Global key for local storage
var STORAGE_KEY = 'uwu_findit_items';
var AUTH_KEY = 'uwu_findit_admin_auth';

// Hardcoded Admin Credentials
var ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// Function to get items from local storage
function getItems() {
    var data = localStorage.getItem(STORAGE_KEY);
    var items = [];

    if (data) {
        items = JSON.parse(data);
    }

    // Add demo data if the system is empty for the first time
    if (items.length === 0) {
        var demoData = [
            {
                id: '101',
                itemName: 'Student ID Card',
                category: 'Documents',
                location: 'Main Library',
                date: '2024-01-18',
                description: 'Blue lanyard, CST department.',
                contact: '0712345678',
                status: 'found',
                createdAt: new Date().toISOString()
            },
            {
                id: '102',
                itemName: 'Casio Calculator',
                category: 'Electronics',
                location: 'Lecture Hall 05',
                date: '2024-01-19',
                description: 'Black color, fx-991ES Plus.',
                contact: '0778899001',
                status: 'lost',
                createdAt: new Date().toISOString()
            }
        ];
        saveItems(demoData);
        return demoData;
    }
    return items;
}

// Function to save items to local storage
function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Function to add a new item
function addItem(item) {
    var items = getItems();
    var newItem = item;
    newItem.id = 'ITEM-' + Date.now();
    newItem.createdAt = new Date().toISOString();

    // Put new item at the top
    var newArray = [newItem];
    for (var i = 0; i < items.length; i++) {
        newArray.push(items[i]);
    }

    saveItems(newArray);
    return newItem;
}

// Function to delete an item
function deleteItem(id) {
    var items = getItems();
    var filteredItems = [];
    for (var i = 0; i < items.length; i++) {
        if (items[i].id !== id) {
            filteredItems.push(items[i]);
        }
    }
    saveItems(filteredItems);
}

// Page Load Initialization
window.onload = function () {
    initApp();
};

function initApp() {
    console.log('System Initialized');

    // Check which page we are on and call the right function
    var path = window.location.pathname;

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

// Form logic
function handleFormSubmit(e, type) {
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

    addItem(itemData);
    alert('Report submitted successfully!');
    window.location.href = 'items.html';
}

// UI Rendering Functions
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

function renderRecentItems() {
    var container = document.getElementById('recent-items-container');
    var items = getItems();
    container.innerHTML = '';

    // Show only first 4
    var limit = items.length;
    if (limit > 4) limit = 4;

    for (var i = 0; i < limit; i++) {
        container.appendChild(createItemCard(items[i]));
    }
}

function renderAllItems() {
    var container = document.getElementById('all-items-container');
    var items = getItems();
    container.innerHTML = '';

    for (var i = 0; i < items.length; i++) {
        container.appendChild(createItemCard(items[i]));
    }
}

// Search Functionality
function initSearch() {
    var searchInput = document.getElementById('search-input');
    var categoryFilter = document.getElementById('category-filter');
    var locationFilter = document.getElementById('location-filter');

    function runSearch() {
        var query = searchInput.value.toLowerCase();
        var cat = categoryFilter.value;
        var loc = locationFilter.value;

        var allItems = getItems();
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

// Details Page
function renderItemDetails() {
    var container = document.getElementById('item-details-container');
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');

    var items = getItems();
    var item = null;

    for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            item = items[i];
            break;
        }
    }

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

    // Recovery Proof UI
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
    var items = getItems();

    function update(imgBase64) {
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === id) {
                items[i].status = 'recovered';
                items[i].recoveredImage = imgBase64;
                break;
            }
        }
        saveItems(items);
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

// Admin Dashboard
function renderAdminDashboard() {
    var tableBody = document.querySelector('#admin-items-table tbody');
    var items = getItems();
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

window.deleteAndRefresh = function (id) {
    if (confirm('Delete this item?')) {
        deleteItem(id);
        renderAdminDashboard();
    }
};
// Admin Authentication Logic
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
