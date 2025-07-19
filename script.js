// Global Variables
let rawData = [];
let stateData = [];
let mapData = null;
let commodityChart = null;
let monthlyChart = null;
let weeklyChart = null;
let nationalDietChart = null;
let selectedCommodities = [];
let selectedGroup = null;
let selectedDateRange = 'all';
let currentSection = 'state-map';

// NEW: Diet Trends Variables (Updated)
let selectedDietDateRange = '3years';  // Default to Last 3 Years
let selectedFamilySize = 4;

// Commodity groups mapping
const COMMODITY_GROUPS = {
    'Food Grains': ['Rice', 'Wheat', 'Atta (Wheat)'],
    'Pulses': ['Gram Dal', 'Tur/Arhar Dal', 'Urad Dal', 'Moong Dal', 'Masoor Dal'],
    'Edible Oils': ['Groundnut Oil (Packed)', 'Mustard Oil (Packed)', 'Vanaspati (Packed)', 'Soya Oil (Packed)', 'Sunflower Oil (Packed)', 'Palm Oil (Packed)'],
    'Other Items': ['Sugar', 'Milk @', 'Gur', 'Tea Loose', 'Salt Pack (Iodised)'],
    'Vegetables': ['Potato', 'Onion', 'Tomato']
};

// Commodity name mappings - from sheet names to display names
const COMMODITY_MAPPINGS = {
    "Tur_Arhar Dal": "Tur/Arhar Dal",
    "Milk": "Milk @"
};

// Reverse mapping - from display names to sheet names  
const REVERSE_COMMODITY_MAPPINGS = {
    "Tur/Arhar Dal": "Tur_Arhar Dal",
    "Milk @": "Milk"
};

// State name mappings
const STATE_NAME_MAPPINGS = {
    "Andaman and Nicobar": "Andaman and Nicobar Islands",
    "Arunachal pradesh": "Arunachal Pradesh",
    "DNH and DD": "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi": "National Capital Territory of Delhi"
};

// NEW: Date Range Mappings for Diet Trends
const DIET_DATE_RANGES = {
    '6months': 6,
    '1year': 12,
    '3years': 36,
    '6years': 72,
    'all': null
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        showLoading('Loading commodity data...');
        
        // Set current date
        updateCurrentDate();
        
        // Setup navigation first
        setupNavigation();
        
        // Load all data with better error handling
        await Promise.all([
            loadMainData(),
            loadStateData(),
            loadMapData()
        ]);
        
        // Initialize components
        setupEventListeners();
        setupChartControls();
        setupMapControls();
        setupDietTrendsControls();  // Updated function name
        populateDateFilter();
        updateSummaryCards();
        updateDietCostDisplay();
        
        // Auto-initialize with proper event handling
        await initializeDefaultSelections();
        
        // Initialize diet trends with new logic
        initializeDietTrends();
        
        hideLoading();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        hideLoading();
        showError('Failed to load dashboard: ' + error.message);
    }
}

// Navigation Setup
function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            switchSection(section);
        });
    });
}

// Switch between sections
function switchSection(sectionName) {
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked menu item
    const activeMenuItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;

    currentSection = sectionName;
    
    // Handle section-specific initialization
    handleSectionSwitch(sectionName);
}

// Handle section-specific logic
function handleSectionSwitch(sectionName) {
    // Hide/show source section based on active section
    const sourceSection = document.querySelector('.source-section');
    if (sourceSection) {
        if (sectionName === 'recent-stories' || sectionName === 'about') {
            sourceSection.style.display = 'none';
        } else {
            sourceSection.style.display = 'block';
        }
    }

    switch(sectionName) {
        case 'state-map':
            // Auto-generate map if not already done
            setTimeout(() => {
                const mapCommoditySelect = document.getElementById('mapCommodity');
                if (mapCommoditySelect && mapCommoditySelect.value) {
                    const mapDateSelect = document.getElementById('mapDate');
                    generateIndiaMap('Food Grains', mapCommoditySelect.value, mapDateSelect.value);
                    updateTopStates(mapCommoditySelect.value, mapDateSelect.value);
                }
            }, 100);
            break;
            
        case 'trends':
            // Initialize trends if commodities are selected
            if (selectedCommodities.length > 0) {
                updateChart();
            }
            break;
            
        case 'diet-calculator':
            // Update diet cost display
            updateDietCostDisplay();
            updateDietTrendsCharts();  // Updated function name
            generateStateHeatmap();
            break;
            
        case 'recent-stories':
            // Stories are embedded, no additional action needed
            break;
            
        case 'about':
            // Static content, no additional action needed
            break;
    }
}

// Update Current Date
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// NEW: Get Complete Months Only (Excludes incomplete current month)
function getCompleteMonthsOnly(data) {
    if (!data || data.length === 0) return [];
    
    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    // Filter out current month data (incomplete)
    return data.filter(item => {
        const itemDate = new Date(item.Date);
        const itemYear = itemDate.getFullYear();
        const itemMonth = itemDate.getMonth();
        
        // Exclude current month if it's not complete
        if (itemYear === currentYear && itemMonth === currentMonth) {
            return false;
        }
        
        return true;
    });
}

// NEW: Filter Data by Date Range for Diet Trends
function filterDataByDateRange(data, rangeKey) {
    if (!data || data.length === 0) return [];
    if (rangeKey === 'all') return getCompleteMonthsOnly(data);
    
    const monthsBack = DIET_DATE_RANGES[rangeKey];
    if (!monthsBack) return getCompleteMonthsOnly(data);
    
    // Calculate cutoff date
    const endDate = new Date();
    endDate.setDate(1); // First day of current month
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - monthsBack);
    
    // Filter data and exclude incomplete current month
    const completeData = getCompleteMonthsOnly(data);
    return completeData.filter(item => {
        const itemDate = new Date(item.Date);
        return itemDate >= startDate && itemDate < endDate;
    });
}

// NEW: Get Date Range Display Text
function getDateRangeDisplayText(rangeKey, familySize) {
    const sizeText = familySize === 1 ? '1 Person' : 'Family (4 Persons)';
    
    switch(rangeKey) {
        case '6months': return `Last 6 Months - ${sizeText}`;
        case '1year': return `Last Year - ${sizeText}`;
        case '3years': return `Last 3 Years - ${sizeText}`;
        case '6years': return `Last 6 Years - ${sizeText}`;
        case 'all': return `All Time - ${sizeText}`;
        default: return `Diet Cost Trends - ${sizeText}`;
    }
}

// Better initialization without timeouts
async function initializeDefaultSelections() {
    return new Promise((resolve) => {
        // Wait for DOM to be fully ready
        setTimeout(() => {
            try {
                selectGroup('Food Grains');
                
                // Wait for commodity selection to be populated
                setTimeout(() => {
                    const riceCheckbox = document.querySelector('input[value="Rice"]');
                    if (riceCheckbox) {
                        riceCheckbox.checked = true;
                        updateSelectedCommodities();
                        updateChart();
                    }
                    
                    // Initialize map with Rice
                    initializeMapWithRice();
                    resolve();
                }, 200);
            } catch (error) {
                console.error('Default selections error:', error);
                resolve();
            }
        }, 100);
    });
}

// Utility Functions
function showLoading(message) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (loadingOverlay) {
        if (loadingText) loadingText.textContent = message;
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showError(message) {
    const mainContainer = document.querySelector('.main-content');
    if (!mainContainer) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <strong>Error:</strong> ${message}<br><br>
        <button onclick="location.reload()" style="background: #0070CC; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
            Reload Page
        </button>
    `;
    mainContainer.appendChild(errorDiv);
}

// Better error handling for data loading
async function loadMainData() {
    const sheetId = "18LVYFWEGfgLNqlo_mY5A70cSmXQBXjd8Lry0ivj2AO8";
    const urls = [
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`
    ];
    
    let csvText = null;
    let lastError = null;
    
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                csvText = await response.text();
                if (csvText && csvText.length > 100) {
                    break;
                }
            }
        } catch (error) {
            console.log('URL failed:', url, error.message);
            lastError = error;
        }
    }
    
    if (!csvText || csvText.length < 100) {
        throw new Error(`Could not load main commodity data. ${lastError ? 'Last error: ' + lastError.message : ''}`);
    }
    
    parseMainData(csvText);
}

async function loadStateData() {
    const sheetId = "18LVYFWEGfgLNqlo_mY5A70cSmXQBXjd8Lry0ivj2AO8";
    const sheetName = "State Data";
    const urls = [
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0&sheet=${encodeURIComponent(sheetName)}`
    ];
    
    let csvText = null;
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                csvText = await response.text();
                if (csvText.length > 100) break;
            }
        } catch (error) {
            console.log('State data URL failed:', url, error.message);
        }
    }
    
    if (!csvText || csvText.length < 100) {
        console.error('Could not load state data - no fallback data will be used');
        stateData = [];
        return;
    }
    
    stateData = parseStateDataFromCSV(csvText);
    console.log('State data loaded:', stateData.length, 'records');
}

async function loadMapData() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/vijayjadhav01/commodity-dashboard/refs/heads/main/India.json');
        if (!response.ok) {
            throw new Error('Failed to load map data');
        }
        mapData = await response.json();
        console.log('Map data loaded successfully');
    } catch (error) {
        console.error('Map loading failed:', error);
        mapData = null;
    }
}

// Better data parsing with validation
function parseMainData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const parseCSVLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    };
    
    rawData = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= 4 && values[0] && values[1] && values[2] && values[3]) {
            const date = new Date(values[0]);
            const price = parseFloat(values[3]);
            let commodityName = values[1];
            
            if (COMMODITY_MAPPINGS[commodityName]) {
                commodityName = COMMODITY_MAPPINGS[commodityName];
            }
            
            // Better validation
            if (!isNaN(date.getTime()) && !isNaN(price) && price > 0 && price < 10000) {
                rawData.push({
                    Date: date,
                    Commodity: commodityName,
                    Group: values[2],
                    Price: price
                });
            }
        }
    }
    
    rawData.sort((a, b) => a.Date - b.Date);
    console.log('Main data parsed:', rawData.length, 'records');
}

// Better date parsing with validation
function parseStateDataFromCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const data = [];
    
    const parseCSVLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        return values;
    };
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (!values || values.length < 24) continue;
        
        const state = values[0];
        if (!state) continue;
        
        const dateStr = values[23];
        if (!dateStr) continue;
        
        let date;
        try {
            // More robust date parsing
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    // Handle DD/MM/YYYY format
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1; // Month is 0-indexed
                    const year = parseInt(parts[2]);
                    
                    // Validate date components
                    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
                        date = new Date(year, month, day);
                    } else {
                        console.warn('Invalid date components:', parts);
                        continue;
                    }
                }
            } else if (dateStr.includes('-')) {
                date = new Date(dateStr);
            } else {
                date = new Date(dateStr);
            }
            
            // Validate parsed date
            if (!date || isNaN(date.getTime())) {
                console.warn('Invalid date found:', dateStr);
                continue;
            }
        } catch (error) {
            console.warn('Date parsing error:', dateStr, error);
            continue;
        }
        
        const commodityNames = [
            'Rice', 'Wheat', 'Atta (Wheat)', 'Gram Dal', 'Tur_Arhar Dal', 'Urad Dal',
            'Moong Dal', 'Masoor Dal', 'Sugar', 'Milk', 'Groundnut Oil (Packed)',
            'Mustard Oil (Packed)', 'Vanaspati (Packed)', 'Soya Oil (Packed)',
            'Sunflower Oil (Packed)', 'Palm Oil (Packed)', 'Gur', 'Tea Loose',
            'Salt Pack (Iodised)', 'Potato', 'Onion', 'Tomato'
        ];
        
        commodityNames.forEach((commodity, index) => {
            const priceStr = values[index + 1];
            const price = parseFloat(priceStr);
            let displayName = commodity;
            
            if (COMMODITY_MAPPINGS[commodity]) {
                displayName = COMMODITY_MAPPINGS[commodity];
            }
            
            // Better price validation
            if (!isNaN(price) && price > 0 && price < 10000) {
                data.push({
                    Date: date,
                    State: state,
                    Commodity: displayName,
                    Price: price
                });
            }
        });
    }
    
    return data;
}

// Update Top 5 High/Low States
function updateTopStates(commodity, selectedDate = null) {
    if (!stateData || stateData.length === 0) {
        document.getElementById('highPricesList').innerHTML = '<div class="states-loading">No state data available</div>';
        document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">No state data available</div>';
        return;
    }

    let commodityStateData;
    
    if (selectedDate) {
        const targetDate = new Date(selectedDate + 'T00:00:00');
        commodityStateData = stateData.filter(d => {
            const dataDate = new Date(d.Date.toISOString().split('T')[0] + 'T00:00:00');
            return d.Commodity === commodity && dataDate.getTime() === targetDate.getTime();
        });
    } else {
        const latestDate = new Date(Math.max(...stateData.map(d => d.Date.getTime())));
        commodityStateData = stateData.filter(d => 
            d.Commodity === commodity && d.Date.getTime() === latestDate.getTime()
        );
    }

    // Filter out summary rows
    const actualStates = commodityStateData.filter(d => 
        !['Average Price', 'Maximum Price', 'Minimum Price', 'Modal Price'].includes(d.State)
    );

    if (actualStates.length === 0) {
        document.getElementById('highPricesList').innerHTML = '<div class="states-loading">No data available for selected commodity</div>';
        document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">No data available for selected commodity</div>';
        return;
    }

    // Sort states by price
    const sortedStates = [...actualStates].sort((a, b) => b.Price - a.Price);
    
    // Top 5 highest prices
    const top5High = sortedStates.slice(0, 5);
    const highPricesHTML = top5High.map((state, index) => `
        <div class="state-item">
            <span class="state-rank">${index + 1}.</span>
            <span class="state-name">${state.State}</span>
            <span class="state-price">Rs ${state.Price.toFixed(2)}</span>
        </div>
    `).join('');

    // Top 5 lowest prices
    const top5Low = sortedStates.slice(-5).reverse();
    const lowPricesHTML = top5Low.map((state, index) => `
        <div class="state-item">
            <span class="state-rank">${index + 1}.</span>
            <span class="state-name">${state.State}</span>
            <span class="state-price">Rs ${state.Price.toFixed(2)}</span>
        </div>
    `).join('');

    document.getElementById('highPricesList').innerHTML = highPricesHTML;
    document.getElementById('lowPricesList').innerHTML = lowPricesHTML;
}

// Summary Cards
function updateSummaryCards() {
    const latestData = getLatestData();
    const previousData = getPreviousData();
    
    const summaryGrid = document.getElementById('summaryGrid');
    const summaryTitle = document.getElementById('summaryTitle');
    
    if (!summaryGrid) return;
    
    if (latestData.length === 0) {
        summaryGrid.innerHTML = '<div class="loading-message">Loading market data...</div>';
        return;
    }
    
    const latestDate = latestData[0].Date;
    const formattedDate = latestDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    if (summaryTitle) {
        summaryTitle.textContent = `Latest Prices (${formattedDate})`;
    }
    
    const commodityCards = latestData.map(item => {
        const prevItem = previousData.find(p => p.Commodity === item.Commodity);
        let changeText = '';
        let changeClass = '';
        
        if (prevItem) {
            const change = item.Price - prevItem.Price;
            if (Math.abs(change) >= 0.01) {
                const sign = change > 0 ? '+' : '';
                const arrow = change > 0 ? ' ↗️' : ' ↘️';
                changeText = `${sign}₹${change.toFixed(2)}${arrow}`;
                changeClass = change > 0 ? 'positive' : 'negative';
            } else {
                changeText = '--';
                changeClass = '';
            }
        } else {
            changeText = '--';
            changeClass = '';
        }
        
        return `
            <div class="summary-card">
                <div class="commodity-name">${item.Commodity}</div>
                <div class="commodity-price">Rs ${item.Price.toFixed(2)}/kg</div>
                <div class="price-change ${changeClass}">${changeText}</div>
            </div>
        `;
    }).join('');
    
    summaryGrid.innerHTML = commodityCards;
    updateDietCostDisplay();
}

// Better null checks for data functions
function getLatestData() {
    if (!rawData || rawData.length === 0) return [];
    const latestDate = new Date(Math.max(...rawData.map(d => d.Date.getTime())));
    return rawData.filter(d => d.Date.getTime() === latestDate.getTime());
}

function getPreviousData() {
    if (!rawData || rawData.length === 0) return [];
    const dates = [...new Set(rawData.map(d => d.Date.getTime()))].sort((a, b) => b - a);
    if (dates.length < 2) return [];
    const previousDate = new Date(dates[1]);
    return rawData.filter(d => d.Date.getTime() === previousDate.getTime());
}

function populateDateFilter() {
    const mapDateSelect = document.getElementById('mapDate');
    if (!mapDateSelect) return;
    
    // Check if state data is available
    if (!stateData || stateData.length === 0) {
        // Set a default date or disable the date input
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        mapDateSelect.value = formattedDate;
        mapDateSelect.disabled = true;
        return;
    }
    
    const uniqueDates = [...new Set(stateData.map(d => d.Date.getTime()))]
        .sort((a, b) => b - a)
        .map(timestamp => new Date(timestamp));
    
    if (uniqueDates.length > 0) {
        const latestDate = uniqueDates[0];
        const formattedDate = latestDate.toISOString().split('T')[0];
        mapDateSelect.value = formattedDate;
        
        const oldestDate = uniqueDates[uniqueDates.length - 1];
        mapDateSelect.min = oldestDate.toISOString().split('T')[0];
        mapDateSelect.max = latestDate.toISOString().split('T')[0];
        mapDateSelect.disabled = false;
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Group tab navigation
    document.querySelectorAll('.group-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const group = this.dataset.group;
            selectGroup(group);
        });
    });
    
    // Commodity selection change
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('commodity-checkbox-input')) {
            updateSelectedCommodities();
            updateChart();
        }
    });
    
    // Date filter button event listeners
    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.date-filter-btn').forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update selected date range
            selectedDateRange = this.dataset.range;
            
            // Update chart and averages if commodities are selected
            if (selectedCommodities.length > 0) {
                updateChart();
            }
        });
    });
}

function setupChartControls() {
    const downloadBtn = document.getElementById('downloadChart');
    const downloadDataBtn = document.getElementById('downloadData');
    
    if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
        if (commodityChart) {
            // Add white background plugin temporarily
            const backgroundPlugin = {
                id: 'background',
                beforeDraw: (chart) => {
                    const ctx = chart.canvas.getContext('2d');
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);
                    ctx.restore();
                }
            };
            
            // Register the plugin
            Chart.register(backgroundPlugin);
            
            // Update chart options for padding
            const originalPadding = commodityChart.options.layout?.padding || 0;
            commodityChart.options.layout = {
                padding: 30  // 30px padding from all sides
            };
            
            // Update and render the chart
            commodityChart.update('none');
            
            // Wait a moment for render, then download
            setTimeout(() => {
                const link = document.createElement('a');
                link.download = `commodity-chart-${new Date().toISOString().split('T')[0]}.jpg`;
                link.href = commodityChart.toBase64Image('image/jpeg', 0.95);
                link.click();
                
                // Restore original settings
                Chart.unregister(backgroundPlugin);
                commodityChart.options.layout.padding = originalPadding;
                commodityChart.update('none');
            }, 100);
        }
    });
}
    
    // NEW: CSV Download functionality
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', function() {
            downloadCommodityData();
        });
    }
}

// NEW: Download commodity data as CSV
function downloadCommodityData() {
    if (selectedCommodities.length === 0) {
        alert('Please select commodities first');
        return;
    }
    
    // Get filtered data based on current selections
    let dataToExport = rawData.filter(d => selectedCommodities.includes(d.Commodity));
    
    // Apply date range filter if not "all"
    if (selectedDateRange !== 'all') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(selectedDateRange));
        dataToExport = dataToExport.filter(d => d.Date >= startDate);
    }
    
    // Sort by date
    dataToExport.sort((a, b) => a.Date - b.Date);
    
    // Create CSV content
    const csvHeader = 'Date,Commodity,Group,Price\n';
    const csvContent = dataToExport.map(item => 
    `${item.Date.toISOString().split('T')[0]},${item.Commodity},${item.Group},${item.Price.toFixed(2)}`
    ).join('\n');
    
    const fullCsv = csvHeader + csvContent;
    
    // Create and trigger download
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generate filename
    const commodityNames = selectedCommodities.join('-').replace(/[^a-zA-Z0-9-]/g, '');
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `commodity-data-${commodityNames}-${dateStr}.csv`;
    
    link.href = url;
    link.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
}

// Group and Commodity Selection
function selectGroup(group) {
    // Update active tab
    document.querySelectorAll('.group-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-group="${group}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    selectedGroup = group;
    selectedCommodities = [];
    
    // Show commodity selection
    showCommoditySelection(group);
    
    // Hide chart and averages initially
    const chartSection = document.getElementById('chartSection');
    const combinedAveragesSection = document.getElementById('combinedAveragesSection');
    const dateFilterSection = document.getElementById('dateFilterSection');
    
    if (chartSection) chartSection.style.display = 'none';
    if (combinedAveragesSection) combinedAveragesSection.style.display = 'none';
    if (dateFilterSection) dateFilterSection.style.display = 'none';
}

function showCommoditySelection(group) {
    const commoditySelection = document.getElementById('commoditySelection');
    const commodityCheckboxes = document.getElementById('commodityCheckboxes');
    
    if (!commoditySelection || !commodityCheckboxes) return;
    
    const commodities = COMMODITY_GROUPS[group] || [];
    
    commodityCheckboxes.innerHTML = commodities.map(commodity => `
        <div class="commodity-checkbox">
            <input type="checkbox" id="commodity-${commodity.replace(/\s+/g, '-')}" 
                   class="commodity-checkbox-input" value="${commodity}">
            <label for="commodity-${commodity.replace(/\s+/g, '-')}">${commodity}</label>
        </div>
    `).join('');
    
    commoditySelection.style.display = 'block';
}

function updateSelectedCommodities() {
    const checkboxes = document.querySelectorAll('.commodity-checkbox-input:checked');
    selectedCommodities = Array.from(checkboxes).map(cb => cb.value);
    
    // Show/hide sections based on commodity selection
    const dateFilterSection = document.getElementById('dateFilterSection');
    if (dateFilterSection) {
        dateFilterSection.style.display = selectedCommodities.length > 0 ? 'block' : 'none';
    }
}

// Chart Functions
function updateChart() {
    const chartSection = document.getElementById('chartSection');
    const downloadBtn = document.getElementById('downloadChart');
    const downloadDataBtn = document.getElementById('downloadData');
    const combinedAveragesSection = document.getElementById('combinedAveragesSection');
    
    if (selectedCommodities.length === 0) {
        if (chartSection) chartSection.style.display = 'none';
        if (combinedAveragesSection) combinedAveragesSection.style.display = 'none';
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (downloadDataBtn) downloadDataBtn.style.display = 'none';
        return;
    }
    
    if (chartSection) chartSection.style.display = 'block';
    if (combinedAveragesSection) combinedAveragesSection.style.display = 'block';
    generateChart();
    updateMonthlyAverages();
    updateWeeklyAverages();
    if (downloadBtn) downloadBtn.style.display = 'inline-flex';
    if (downloadDataBtn) downloadDataBtn.style.display = 'inline-flex';
}

// Better chart cleanup to prevent memory leaks
function generateChart() {
    const canvas = document.getElementById('commodityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Proper chart cleanup
    if (commodityChart) {
        commodityChart.destroy();
        commodityChart = null;
    }
    
    // Logo plugin for chart
    const logoPlugin = {
    id: 'logoPlugin',
    beforeDraw: function(chart) {
        const ctx = chart.ctx;
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = function() {
            const logoWidth = 100;
            const logoHeight = 38;
            let drawWidth = logoWidth;
            let drawHeight = logo.height * (logoWidth / logo.width);
            if (drawHeight > logoHeight) {
                drawHeight = logoHeight;
                drawWidth = logo.width * (logoHeight / logo.height);
            }
            // Place logo well below plot area
            const padding = 40 // increase as needed
            const x = chart.chartArea.right - drawWidth;
            const y = chart.chartArea.bottom + padding;
            ctx.save();
            ctx.globalAlpha = 0.80;
            ctx.drawImage(logo, x, y, drawWidth, drawHeight);
            ctx.restore();
        };
        logo.src = 'https://raw.githubusercontent.com/vijayjadhav01/commodity-dashboard/4915877bc79afe7493db8dcfa17d6cbe929284ff/Logo.png';
    }
};
    
    // Calculate date range based on selection
    let startDate = null;
    if (selectedDateRange !== 'all') {
        const endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(selectedDateRange));
    }
    
    const datasets = selectedCommodities.map((commodity, index) => {
        let commodityData = rawData
            .filter(d => d.Commodity === commodity)
            .sort((a, b) => a.Date - b.Date);
        
        // Apply date filter if not "all"
        if (startDate) {
            commodityData = commodityData.filter(d => d.Date >= startDate);
        }
        
        const colors = ['#0070CC', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        
        return {
            label: commodity,
            data: commodityData.map(d => ({ x: d.Date, y: d.Price })),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4
        };
    });
    
    // Determine appropriate time unit based on date range
    let timeUnit = 'year';
    let displayFormat = 'yyyy';
    
    if (selectedDateRange === '30') {
        timeUnit = 'day';
        displayFormat = 'MMM dd';
    } else if (selectedDateRange === '90') {
        timeUnit = 'week';
        displayFormat = 'MMM dd';
    } else if (selectedDateRange === '180' || selectedDateRange === '365') {
        timeUnit = 'month';
        displayFormat = 'MMM yyyy';
    }
    
    commodityChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        plugins: [logoPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    type: 'time',
                    time: { 
                        unit: timeUnit,
                        displayFormats: {
                            day: displayFormat,
                            week: displayFormat,
                            month: displayFormat,
                            year: displayFormat
                        }
                    },
                    title: { 
                        display: true,
                        text: selectedDateRange === 'all' ? 'Year' : 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price (Rs/kg)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        usePointStyle: true, 
                        pointStyle: 'circle',
                        padding: 20,
                        boxWidth: 8,
                        boxHeight: 8
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('en-IN');
                        },
                        label: function(context) {
                            return `${context.dataset.label}: Rs ${context.parsed.y.toFixed(2)}/kg`;
                        }
                    }
                }
            }
        }
    });
}

// Monthly and Weekly Averages Functions with proper price calculation
function updateMonthlyAverages() {
    const monthlyAveragesChart = document.getElementById('monthlyAveragesChart');
    
    if (!monthlyAveragesChart) return;
    
    if (selectedCommodities.length === 0) {
        monthlyAveragesChart.innerHTML = '<div class="loading-message">No commodities selected</div>';
        return;
    }
    
    const monthlyData = calculateMonthlyAverages();
    
    if (monthlyData.length === 0) {
        monthlyAveragesChart.innerHTML = '<div class="loading-message">No data available</div>';
        return;
    }
    
    // Ensure canvas exists
    let canvas = document.getElementById('monthlyChart');
    if (!canvas) {
        monthlyAveragesChart.innerHTML = '<canvas id="monthlyChart" style="width: 100%; height: 400px;"></canvas>';
        canvas = document.getElementById('monthlyChart');
    }
    
    generateMonthlyChart(monthlyData);
}

function updateWeeklyAverages() {
    const weeklyAveragesChart = document.getElementById('weeklyAveragesChart');
    
    if (!weeklyAveragesChart) return;
    
    if (selectedCommodities.length === 0) {
        weeklyAveragesChart.innerHTML = '<div class="loading-message">No commodities selected</div>';
        return;
    }
    
    const weeklyData = calculateWeeklyAverages();
    
    if (weeklyData.length === 0) {
        weeklyAveragesChart.innerHTML = '<div class="loading-message">No data available</div>';
        return;
    }
    
    // Ensure canvas exists
    let canvas = document.getElementById('weeklyChart');
    if (!canvas) {
        weeklyAveragesChart.innerHTML = '<canvas id="weeklyChart" style="width: 100%; height: 400px;"></canvas>';
        canvas = document.getElementById('weeklyChart');
    }
    
    generateWeeklyChart(weeklyData);
}

// UPDATED: Calculate Monthly Averages - USE ALL HISTORICAL DATA
function calculateMonthlyAverages() {
    // Get data for selected commodities only (no date range filter applied)
    let filteredData = rawData.filter(d => selectedCommodities.includes(d.Commodity));
    
    // Group by month
    const monthlyGroups = {};
    
    filteredData.forEach(item => {
        const monthKey = `${item.Date.getFullYear()}-${String(item.Date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = item.Date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        if (!monthlyGroups[monthKey]) {
            monthlyGroups[monthKey] = {
                month: monthName,
                date: new Date(item.Date.getFullYear(), item.Date.getMonth(), 1),
                data: []
            };
        }
        
        monthlyGroups[monthKey].data.push(item);
    });
    
    // UPDATED: Use ALL historical data, not just last 10 months
    const monthlyData = Object.keys(monthlyGroups)
        .sort()
        .map(monthKey => {
            const monthGroup = monthlyGroups[monthKey];
            const prices = {};
            
            selectedCommodities.forEach(commodity => {
                const commodityData = monthGroup.data.filter(d => d.Commodity === commodity);
                if (commodityData.length > 0) {
                    const avgPrice = commodityData.reduce((sum, d) => sum + d.Price, 0) / commodityData.length;
                    prices[commodity] = avgPrice;
                } else {
                    prices[commodity] = null;
                }
            });
            
            return {
                month: monthGroup.month,
                date: monthGroup.date,
                prices: prices
            };
        });
    
    return monthlyData;
}

// UPDATED: Calculate 7-Day Rolling Average instead of weekly averages
function calculateWeeklyAverages() {
    // Get data for selected commodities only
    let filteredData = rawData.filter(d => selectedCommodities.includes(d.Commodity));
    
    // Sort by date
    filteredData.sort((a, b) => a.Date - b.Date);
    
    // Get unique dates
    const uniqueDates = [...new Set(filteredData.map(d => d.Date.getTime()))]
        .sort((a, b) => a - b)
        .map(timestamp => new Date(timestamp));
    
    const rollingData = [];
    
    // Calculate 7-day rolling average for each date
    uniqueDates.forEach((currentDate, index) => {
        // Only calculate if we have at least 7 days of data
        if (index >= 6) {
            const prices = {};
            
            selectedCommodities.forEach(commodity => {
                // Get data for the past 7 days (including current day)
                const sevenDayPrices = [];
                
                for (let i = 6; i >= 0; i--) {
                    const targetDate = uniqueDates[index - i];
                    const dayData = filteredData.filter(d => 
                        d.Date.getTime() === targetDate.getTime() && d.Commodity === commodity
                    );
                    
                    if (dayData.length > 0) {
                        // If multiple entries for same commodity on same day, take average
                        const avgPrice = dayData.reduce((sum, d) => sum + d.Price, 0) / dayData.length;
                        sevenDayPrices.push(avgPrice);
                    }
                }
                
                // Calculate 7-day rolling average
                if (sevenDayPrices.length > 0) {
                    const rollingAvg = sevenDayPrices.reduce((sum, price) => sum + price, 0) / sevenDayPrices.length;
                    prices[commodity] = rollingAvg;
                } else {
                    prices[commodity] = null;
                }
            });
            
            rollingData.push({
                date: currentDate,
                dateString: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                prices: prices
            });
        }
    });
    
    return rollingData;
}

// Generate Monthly Chart
function generateMonthlyChart(monthlyData) {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clean up existing chart
    if (monthlyChart) {
        monthlyChart.destroy();
        monthlyChart = null;
    }
    
    const colors = ['#0070CC', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    
    const datasets = selectedCommodities.map((commodity, index) => {
        const data = monthlyData.map(item => ({
            x: item.date,
            y: item.prices[commodity]
        })).filter(point => point.y !== null && point.y !== undefined && point.y > 0);
        
        return {
            label: commodity,
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            borderWidth: 1.5,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 6
        };
    });
    
    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Month'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Avg Price (Rs/kg)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15,
                        boxWidth: 6,
                        boxHeight: 6,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        },
                        label: function(context) {
                            return `${context.dataset.label}: Rs ${context.parsed.y.toFixed(2)}/kg`;
                        }
                    }
                }
            }
        }
    });
}

// UPDATED: Generate Weekly Average Chart
function generateWeeklyChart(weeklyData) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clean up existing chart
    if (weeklyChart) {
        weeklyChart.destroy();
        weeklyChart = null;
    }
    
    const colors = ['#0070CC', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    
    const datasets = selectedCommodities.map((commodity, index) => {
        const data = weeklyData.map((item) => ({
            x: item.date,
            y: item.prices[commodity]
        })).filter(point => point.y !== null);
        
        return {
            label: commodity,
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            borderWidth: 1.5,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5
        };
    });
    
    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '7-Day Avg Price (Rs/kg)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15,
                        boxWidth: 6,
                        boxHeight: 6,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        },
                        label: function(context) {
                            return `${context.dataset.label}: Rs ${context.parsed.y.toFixed(2)}/kg (7-day avg)`;
                        }
                    }
                }
            }
        }
    });
}

// Diet Cost Calculator Functions
function calculateDietCosts() {
    if (rawData.length === 0) return null;
    
    // Get latest commodity prices
    const latestData = getLatestData();
    if (latestData.length === 0) return null;
    
    const priceMap = {};
    
    // Create price lookup map
    latestData.forEach(item => {
        priceMap[item.Commodity] = item.Price;
    });
    
    // Calculate category averages (Rs per kg)
    const cerealsPrice = getAveragePrice(priceMap, ['Rice', 'Wheat', 'Atta (Wheat)']);
    const pulsesPrice = getAveragePrice(priceMap, ['Gram Dal', 'Tur/Arhar Dal', 'Urad Dal', 'Moong Dal', 'Masoor Dal']);
    const vegetablesPrice = getAveragePrice(priceMap, ['Potato', 'Onion', 'Tomato']);
    const oilsPrice = getAveragePrice(priceMap, ['Groundnut Oil (Packed)', 'Mustard Oil (Packed)', 'Soya Oil (Packed)', 'Sunflower Oil (Packed)']);
    const milkPrice = priceMap['Milk @'] || 0;
    const saltPrice = priceMap['Salt Pack (Iodised)'] || 0;
    const sugarPrice = priceMap['Sugar'] || 0;
    
    // Daily requirements (in grams/ml)
    const requirements = {
        cereals: 250,    // grams
        pulses: 85,      // grams  
        vegetables: 400, // grams
        oils: 27,        // grams
        milk: 300,       // ml (assume same as grams)
        salt: 5,         // grams
        sugar: 25        // grams
    };
    
    // Calculate daily costs for 1 person (convert grams to kg)
    const dailyCosts = {
        cereals: (cerealsPrice * requirements.cereals) / 1000,
        pulses: (pulsesPrice * requirements.pulses) / 1000,
        vegetables: (vegetablesPrice * requirements.vegetables) / 1000,
        oils: (oilsPrice * requirements.oils) / 1000,
        milk: (milkPrice * requirements.milk) / 1000,
        salt: (saltPrice * requirements.salt) / 1000,
        sugar: (sugarPrice * requirements.sugar) / 1000
    };
    
    // Calculate totals
    const dailyTotal1Person = Object.values(dailyCosts).reduce((sum, cost) => sum + cost, 0);
    const dailyTotal4Persons = dailyTotal1Person * 4;
    
    return {
        daily: {
            person1: dailyTotal1Person,
            person4: dailyTotal4Persons,
            breakdown: dailyCosts
        },
        dataDate: latestData[0]?.Date || new Date()
    };
}

function getAveragePrice(priceMap, commodities) {
    const prices = commodities.map(commodity => priceMap[commodity] || 0).filter(price => price > 0);
    return prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
}

function updateDietCostDisplay() {
    const dietCosts = calculateDietCosts();
    if (!dietCosts) return;
    
    // Update date
    const dataDate = dietCosts.dataDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
    });
    
    const elements = {
        dietDataDate: document.getElementById('dietDataDate'),
        dailyCost1: document.getElementById('dailyCost1'),
        dailyCost4: document.getElementById('dailyCost4'),
        monthlyTotal1: document.getElementById('monthlyTotal1'),
        monthlyTotal4: document.getElementById('monthlyTotal4'),
        cerealsCost: document.getElementById('cerealsCost'),
        pulsesCost: document.getElementById('pulsesCost'),
        vegetablesCost: document.getElementById('vegetablesCost'),
        oilsCost: document.getElementById('oilsCost'),
        milkCost: document.getElementById('milkCost'),
        saltCost: document.getElementById('saltCost'),
        sugarCost: document.getElementById('sugarCost'),
        totalCost: document.getElementById('totalCost')
    };
    
    // Update only existing elements
    if (elements.dietDataDate) elements.dietDataDate.textContent = dataDate;
    if (elements.dailyCost1) elements.dailyCost1.textContent = `Rs ${dietCosts.daily.person1.toFixed(2)}`;
    if (elements.dailyCost4) elements.dailyCost4.textContent = `Rs ${dietCosts.daily.person4.toFixed(2)}`;
    if (elements.monthlyTotal1) elements.monthlyTotal1.textContent = `Rs ${(dietCosts.daily.person1 * 30).toFixed(2)}`;
    if (elements.monthlyTotal4) elements.monthlyTotal4.textContent = `Rs ${(dietCosts.daily.person4 * 30).toFixed(2)}`;
    if (elements.cerealsCost) elements.cerealsCost.textContent = `Rs ${dietCosts.daily.breakdown.cereals.toFixed(2)}`;
    if (elements.pulsesCost) elements.pulsesCost.textContent = `Rs ${dietCosts.daily.breakdown.pulses.toFixed(2)}`;
    if (elements.vegetablesCost) elements.vegetablesCost.textContent = `Rs ${dietCosts.daily.breakdown.vegetables.toFixed(2)}`;
    if (elements.oilsCost) elements.oilsCost.textContent = `Rs ${dietCosts.daily.breakdown.oils.toFixed(2)}`;
    if (elements.milkCost) elements.milkCost.textContent = `Rs ${dietCosts.daily.breakdown.milk.toFixed(2)}`;
    if (elements.saltCost) elements.saltCost.textContent = `Rs ${dietCosts.daily.breakdown.salt.toFixed(2)}`;
    if (elements.sugarCost) elements.sugarCost.textContent = `Rs ${dietCosts.daily.breakdown.sugar.toFixed(2)}`;
    if (elements.totalCost) elements.totalCost.textContent = `Rs ${dietCosts.daily.person1.toFixed(2)}`;
}

// NEW: Setup Diet Trends Controls (Updated from setupTrendsControls)
function setupDietTrendsControls() {
    const familySizeButtons = document.querySelectorAll('.family-size-btn');
    const dateRangeButtons = document.querySelectorAll('.date-range-btn');

    // Family size button event listeners
    familySizeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all buttons
            familySizeButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked button
            this.classList.add('active');
            // Update selected family size
            selectedFamilySize = parseInt(this.dataset.size);
            // Update charts
            updateDietTrendsCharts();
        });
    });

    // Date range button event listeners
    dateRangeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all buttons
            dateRangeButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked button
            this.classList.add('active');
            // Update selected date range
            selectedDietDateRange = this.dataset.range;
            // Update charts
            updateDietTrendsCharts();
        });
    });
}

// NEW: Initialize Diet Trends (Updated)
function initializeDietTrends() {
    updateDietTrendsCharts();
    generateStateHeatmap();
}

// NEW: Update Diet Trends Charts (Updated from updateTrendsCharts)
function updateDietTrendsCharts() {
    updateNationalDietChart();
    updateDietTrendsTitle();
}

// NEW: Update Diet Trends Chart Title (Updated)
function updateDietTrendsTitle() {
    const titleElement = document.getElementById('dietTrendsChartTitle');
    if (titleElement) {
        const rangeText = getDateRangeDisplayText(selectedDietDateRange, selectedFamilySize);
        titleElement.textContent = `National Average - ${rangeText}`;
    }
}

// NEW: Update National Diet Chart with Complete Historical Data (No Year Filter)
function updateNationalDietChart() {
    const canvas = document.getElementById('nationalDietChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clean up existing chart
    if (nationalDietChart) {
        nationalDietChart.destroy();
        nationalDietChart = null;
    }
    
    // Logo plugin for diet chart
    const logoPlugin = {
        id: 'logoPlugin',
        beforeDraw: function(chart) {
            const ctx = chart.ctx;
            const logo = new Image();
            logo.crossOrigin = 'anonymous';
            logo.onload = function() {
                const logoWidth = 100;
                const logoHeight = 38;
                let drawWidth = logoWidth;
                let drawHeight = logo.height * (logoWidth / logo.width);
                if (drawHeight > logoHeight) {
                    drawHeight = logoHeight;
                    drawWidth = logo.width * (logoHeight / logo.height);
                }
                // Place logo at bottom-right of chart
                const padding = 60;
                const x = chart.chartArea.right - drawWidth;
                const y = chart.chartArea.bottom + padding;
                ctx.save();
                ctx.globalAlpha = 0.80;
                ctx.drawImage(logo, x, y, drawWidth, drawHeight);
                ctx.restore();
            };
            logo.src = 'https://raw.githubusercontent.com/vijayjadhav01/commodity-dashboard/main/Logo.png';
        }
    };
    
    // Calculate national diet costs using complete historical data
    const nationalData = calculateNationalDietCosts(selectedDietDateRange, selectedFamilySize);
    
    if (nationalData.length === 0) {
        console.warn('No data available for national diet chart');
        return;
    }
    
    nationalDietChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: nationalData.map(d => d.monthName),
            datasets: [{
                label: `Diet Cost (${selectedFamilySize === 1 ? '1 Person' : 'Family of 4'})`,
                data: nationalData.map(d => d.cost),
                borderColor: '#0070CC',
                backgroundColor: '#0070CC20',
                borderWidth: 3,
                fill: false,
                tension: 0.1,
                pointRadius: 2,
                pointHoverRadius: 6,
                pointBackgroundColor: '#0070CC',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        plugins: [logoPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
          
           layout: {          
            padding: {
                bottom: 30     
            }
        },  
          
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cost (Rs)'
                    },
                    ticks: {
                        callback: function(value) {
                            return 'Rs ' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Cost: Rs ${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            }
        }
    });
}

// NEW: Calculate National Diet Costs (Updated - No Year Logic)
function calculateNationalDietCosts(rangeKey, familySize) {
    if (rawData.length === 0) return [];
    
    // Filter data by date range and exclude incomplete months
    const filteredData = filterDataByDateRange(rawData, rangeKey);
    if (filteredData.length === 0) return [];
    
    // Group by month
    const monthlyGroups = {};
    
    filteredData.forEach(item => {
        const monthKey = `${item.Date.getFullYear()}-${String(item.Date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = item.Date.toLocaleDateString('en-US', { 
            month: 'short', 
            year: rangeKey === 'all' || rangeKey === '6years' ? 'numeric' : undefined 
        });
        
        if (!monthlyGroups[monthKey]) {
            monthlyGroups[monthKey] = {
                monthName: monthName,
                year: item.Date.getFullYear(),
                month: item.Date.getMonth(),
                data: []
            };
        }
        
        monthlyGroups[monthKey].data.push(item);
    });
    
    const nationalData = [];
    
    // Calculate diet cost for each month
    Object.keys(monthlyGroups).sort().forEach(monthKey => {
        const monthGroup = monthlyGroups[monthKey];
        const monthlyPrices = calculateMonthlyAveragePrices(monthGroup.data);
        const dietCost = calculateDietCostFromPrices(monthlyPrices, familySize);
        
        nationalData.push({
            month: monthGroup.month,
            monthName: monthGroup.monthName,
            cost: Math.round(dietCost)
        });
    });
    
    return nationalData;
}

// Calculate Monthly Average Prices
function calculateMonthlyAveragePrices(monthData) {
    const priceMap = {};
    
    // Group by commodity and calculate averages
    const commodityGroups = {};
    monthData.forEach(item => {
        if (!commodityGroups[item.Commodity]) {
            commodityGroups[item.Commodity] = [];
        }
        commodityGroups[item.Commodity].push(item.Price);
    });
    
    // Calculate averages for each commodity
    Object.keys(commodityGroups).forEach(commodity => {
        const prices = commodityGroups[commodity];
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        priceMap[commodity] = avgPrice;
    });
    
    return priceMap;
}

// Calculate Diet Cost from Prices
function calculateDietCostFromPrices(priceMap, familySize) {
    // Calculate category averages (Rs per kg)
    const cerealsPrice = getAveragePrice(priceMap, ['Rice', 'Wheat', 'Atta (Wheat)']);
    const pulsesPrice = getAveragePrice(priceMap, ['Gram Dal', 'Tur/Arhar Dal', 'Urad Dal', 'Moong Dal', 'Masoor Dal']);
    const vegetablesPrice = getAveragePrice(priceMap, ['Potato', 'Onion', 'Tomato']);
    const oilsPrice = getAveragePrice(priceMap, ['Groundnut Oil (Packed)', 'Mustard Oil (Packed)', 'Soya Oil (Packed)', 'Sunflower Oil (Packed)']);
    const milkPrice = priceMap['Milk @'] || 0;
    const saltPrice = priceMap['Salt Pack (Iodised)'] || 0;
    const sugarPrice = priceMap['Sugar'] || 0;
    
    // Daily requirements (in grams/ml)
    const requirements = {
        cereals: 250,    // grams
        pulses: 85,      // grams  
        vegetables: 400, // grams
        oils: 27,        // grams
        milk: 300,       // ml (assume same as grams)
        salt: 5,         // grams
        sugar: 25        // grams
    };
    
    // Calculate daily cost for 1 person (convert grams to kg)
    const dailyCost1Person = 
        (cerealsPrice * requirements.cereals / 1000) +
        (pulsesPrice * requirements.pulses / 1000) +
        (vegetablesPrice * requirements.vegetables / 1000) +
        (oilsPrice * requirements.oils / 1000) +
        (milkPrice * requirements.milk / 1000) +
        (saltPrice * requirements.salt / 1000) +
        (sugarPrice * requirements.sugar / 1000);
    
    // Calculate monthly cost
    const monthlyCost = dailyCost1Person * familySize * 30;
    
    return monthlyCost;
}

// Generate State Heatmap with #0070CC theme
function generateStateHeatmap() {
    const container = document.getElementById('stateHeatmapContainer');
    if (!container || !stateData || stateData.length === 0) {
        if (container) {
            container.innerHTML = `
                <div class="trends-heatmap-placeholder">
                    📊 State-wise diet cost data not available
                    <br>Requires recent state commodity prices
                </div>
            `;
        }
        return;
    }
    
    // Get last 10 days of unique dates
    const uniqueDates = [...new Set(stateData.map(d => d.Date.getTime()))]
        .sort((a, b) => b - a)
        .slice(0, 10)
        .map(timestamp => new Date(timestamp))
        .reverse();
    
    if (uniqueDates.length === 0) {
        container.innerHTML = `
            <div class="trends-heatmap-placeholder">
                📊 No recent state data available
            </div>
        `;
        return;
    }
    
    // Get all states
    const states = [...new Set(stateData.map(d => d.State))]
        .filter(state => !['Average Price', 'Maximum Price', 'Minimum Price', 'Modal Price'].includes(state))
        .sort();
    
    if (states.length === 0) {
        container.innerHTML = `
            <div class="trends-heatmap-placeholder">
                📊 No state data found
            </div>
        `;
        return;
    }
    
    // Calculate diet costs for each state and date
    const heatmapData = [];
    states.forEach(state => {
        const stateRow = { state: state, costs: [] };
        
        uniqueDates.forEach(date => {
            const stateDataForDate = stateData.filter(d => 
                d.State === state && d.Date.getTime() === date.getTime()
            );
            
            if (stateDataForDate.length > 0) {
                const priceMap = {};
                stateDataForDate.forEach(item => {
                    priceMap[item.Commodity] = item.Price;
                });
                
                const dietCost = calculateDietCostFromPrices(priceMap, 4); // Always use family of 4 for heatmap
                stateRow.costs.push(dietCost);
            } else {
                stateRow.costs.push(null);
            }
        });
        
        heatmapData.push(stateRow);
    });
    
    // Generate heatmap HTML
    const dateHeaders = uniqueDates.map(date => 
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    
    // Find min and max costs for color scaling
    const allCosts = heatmapData.flatMap(row => row.costs).filter(cost => cost !== null);
    const minCost = Math.min(...allCosts);
    const maxCost = Math.max(...allCosts);
    
    let heatmapHTML = `
        <div class="diet-heatmap">
            <div class="header-row">
                <div class="header-spacer"></div>
                ${dateHeaders.map(header => `<div class="date-header">${header}</div>`).join('')}
            </div>
    `;
    
    heatmapData.forEach(row => {
        heatmapHTML += `
            <div class="state-row">
                <div class="state-label">${row.state}</div>
                ${row.costs.map(cost => {
                    if (cost === null) {
                        return '<div class="day-cell" style="background: #f0f0f0;" title="No data"></div>';
                    }
                    
                    // Better blue gradient using #0070CC theme with numbers
                    const intensity = (cost - minCost) / (maxCost - minCost);
                    const roundedCost = Math.round(cost);
                    
                    // Create a better blue gradient from light to #0070CC
                    let backgroundColor, textColor;
                    
                    if (intensity <= 0.2) {
                        backgroundColor = `rgb(230, 245, 255)`;
                        textColor = '#333'; // Dark text for light background
                    } else if (intensity <= 0.4) {
                        backgroundColor = `rgb(180, 220, 255)`;
                        textColor = '#333';
                    } else if (intensity <= 0.6) {
                        backgroundColor = `rgb(120, 180, 255)`;
                        textColor = '#fff'; // White text for medium background
                    } else if (intensity <= 0.8) {
                        backgroundColor = `rgb(60, 140, 220)`;
                        textColor = '#fff';
                    } else {
                        backgroundColor = `rgb(0, 112, 204)`;
                        textColor = '#fff'; // White text for dark background
                    }
                    
                    return `<div class="day-cell" style="background: ${backgroundColor}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 600;" title="${row.state}: Rs ${roundedCost.toLocaleString()}">${roundedCost}</div>`;
                }).join('')}
            </div>
        `;
    });
    
    heatmapHTML += '</div>';
    
    // Update title with date range
    const titleElement = document.querySelector('.diet-heatmap-section .trends-chart-title');
    if (titleElement && uniqueDates.length > 0) {
        const startDate = uniqueDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endDate = uniqueDates[uniqueDates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        titleElement.textContent = `State-wise Comparison - Last 10 Days (${startDate} - ${endDate})`;
    }
    
    container.innerHTML = heatmapHTML;
}

// Map Controls Setup
function setupMapControls() {
    const mapDateSelect = document.getElementById('mapDate');
    const mapGroupSelect = document.getElementById('mapGroup');
    const mapCommoditySelect = document.getElementById('mapCommodity');
    const mapSearchBtn = document.getElementById('mapSearch');
    
    if (!mapDateSelect || !mapGroupSelect || !mapCommoditySelect || !mapSearchBtn) {
        console.warn('Map controls not found');
        return;
    }
    
    mapDateSelect.addEventListener('change', function() {
        if (mapGroupSelect.value && mapCommoditySelect.value) {
            mapSearchBtn.disabled = false;
        }
        
        // Auto-update top states when date changes
        if (mapCommoditySelect.value) {
            updateTopStates(mapCommoditySelect.value, this.value);
        }
    });
    
    mapGroupSelect.addEventListener('change', function() {
        const selectedGroup = this.value;
        
        if (selectedGroup && COMMODITY_GROUPS[selectedGroup]) {
            const commodities = COMMODITY_GROUPS[selectedGroup];
            mapCommoditySelect.innerHTML = '<option value="">Select commodity</option>' +
                commodities.map(commodity => `<option value="${commodity}">${commodity}</option>`).join('');
            mapCommoditySelect.disabled = false;
        } else {
            mapCommoditySelect.innerHTML = '<option value="">Select commodity</option>';
            mapCommoditySelect.disabled = true;
            mapSearchBtn.disabled = true;
        }
        
        mapCommoditySelect.value = '';
        mapSearchBtn.disabled = true;
        
        // Clear top states
        document.getElementById('highPricesList').innerHTML = '<div class="states-loading">Select commodity to view data</div>';
        document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">Select commodity to view data</div>';
    });
    
    mapCommoditySelect.addEventListener('change', function() {
        mapSearchBtn.disabled = !this.value;
        
        // Auto-update KPIs and top states when commodity is selected
        if (this.value) {
            updateKPIs(this.value, mapDateSelect.value);
            updateTopStates(this.value, mapDateSelect.value);
        }
    });
    
    mapSearchBtn.addEventListener('click', function() {
        const selectedDate = mapDateSelect.value;
        const selectedGroup = mapGroupSelect.value;
        const selectedCommodity = mapCommoditySelect.value;
        
        if (selectedGroup && selectedCommodity) {
            generateIndiaMap(selectedGroup, selectedCommodity, selectedDate);
            updateTopStates(selectedCommodity, selectedDate);
        }
    });
}

// NEW: Setup Diet Chart Download Event Listener
function setupDietChartDownload() {
    const downloadDietChartBtn = document.getElementById('downloadDietChart');
    if (downloadDietChartBtn) {
        downloadDietChartBtn.addEventListener('click', function() {
            if (nationalDietChart) {
                // Create a temporary canvas with white background
                const originalCanvas = nationalDietChart.canvas;
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                // Set higher resolution and add padding
                const padding = 40;
                tempCanvas.width = originalCanvas.width + (padding * 2);
                tempCanvas.height = originalCanvas.height + (padding * 2);
                
                // Fill with white background
                tempCtx.fillStyle = '#FFFFFF';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                // Draw the original chart with padding offset
                tempCtx.drawImage(originalCanvas, padding, padding);
                
                // Download as JPEG
                const familySize = selectedFamilySize === 1 ? '1-person' : 'family-4';
                const dateRange = selectedDietDateRange.replace('years', 'y').replace('year', 'y').replace('months', 'm');
                const dateStr = new Date().toISOString().split('T')[0];
                const filename = `diet-trends-${familySize}-${dateRange}-${dateStr}.jpg`;
                
                const link = document.createElement('a');
                link.download = filename;
                link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
                link.click();
            }
        });
    }
}

// KPI Functions
function updateKPIs(commodity, selectedDate = null) {
    // Check if state data is available
    if (!stateData || stateData.length === 0) {
        const kpiElements = {
            avgPrice: document.getElementById('avgPrice'),
            maxPrice: document.getElementById('maxPrice'),
            minPrice: document.getElementById('minPrice'),
            modalPrice: document.getElementById('modalPrice')
        };
        
        // Display "No data" message
        Object.values(kpiElements).forEach(element => {
            if (element) element.textContent = 'No data';
        });
        return;
    }
    
    let commodityStateData;
    
    if (selectedDate) {
        const targetDate = new Date(selectedDate + 'T00:00:00');
        commodityStateData = stateData.filter(d => {
            const dataDate = new Date(d.Date.toISOString().split('T')[0] + 'T00:00:00');
            return d.Commodity === commodity && dataDate.getTime() === targetDate.getTime();
        });
    } else {
        const latestDate = new Date(Math.max(...stateData.map(d => d.Date.getTime())));
        commodityStateData = stateData.filter(d => 
            d.Commodity === commodity && d.Date.getTime() === latestDate.getTime()
        );
    }
    
    // Get summary data from special rows in state data
    const summaryData = getSummaryDataFromSheet(commodity, selectedDate);
    
    const kpiElements = {
        avgPrice: document.getElementById('avgPrice'),
        maxPrice: document.getElementById('maxPrice'),
        minPrice: document.getElementById('minPrice'),
        modalPrice: document.getElementById('modalPrice')
    };
    
    // Update current day KPIs
    if (summaryData) {
        if (kpiElements.avgPrice) kpiElements.avgPrice.textContent = `Rs ${summaryData.average}/kg`;
        if (kpiElements.maxPrice) kpiElements.maxPrice.textContent = `Rs ${summaryData.maximum}/kg`;
        if (kpiElements.minPrice) kpiElements.minPrice.textContent = `Rs ${summaryData.minimum}/kg`;
        if (kpiElements.modalPrice) kpiElements.modalPrice.textContent = `Rs ${summaryData.modal}/kg`;
    } else {
        // Fallback: calculate from state data
        if (commodityStateData.length > 0) {
            const prices = commodityStateData.map(d => d.Price);
            const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);
            const maxPrice = Math.max(...prices).toFixed(2);
            const minPrice = Math.min(...prices).toFixed(2);
            
            if (kpiElements.avgPrice) kpiElements.avgPrice.textContent = `Rs ${avgPrice}/kg`;
            if (kpiElements.maxPrice) kpiElements.maxPrice.textContent = `Rs ${maxPrice}/kg`;
            if (kpiElements.minPrice) kpiElements.minPrice.textContent = `Rs ${minPrice}/kg`;
            if (kpiElements.modalPrice) kpiElements.modalPrice.textContent = `Rs ${avgPrice}/kg`;
        } else {
            // No data available
            Object.values(kpiElements).forEach(element => {
                if (element) element.textContent = 'No data';
            });
        }
    }
}

function getSummaryDataFromSheet(commodity, selectedDate = null) {
    let summaryEntries;
    
    if (selectedDate) {
        const targetDate = new Date(selectedDate + 'T00:00:00');
        summaryEntries = stateData.filter(d => 
            d.Commodity === commodity && 
            d.Date.getTime() === targetDate.getTime() &&
            (d.State.includes('Price') || ['Average Price', 'Maximum Price', 'Minimum Price', 'Modal Price'].includes(d.State))
        );
    } else {
        if (stateData.length === 0) return null;
        const latestDate = new Date(Math.max(...stateData.map(d => d.Date.getTime())));
        summaryEntries = stateData.filter(d => 
            d.Commodity === commodity && 
            d.Date.getTime() === latestDate.getTime() &&
            (d.State.includes('Price') || ['Average Price', 'Maximum Price', 'Minimum Price', 'Modal Price'].includes(d.State))
        );
    }
    
    if (summaryEntries.length === 0) return null;
    
    const summary = {};
    summaryEntries.forEach(entry => {
        if (entry.State === 'Average Price') {
            summary.average = entry.Price.toFixed(2);
        } else if (entry.State === 'Maximum Price') {
            summary.maximum = entry.Price.toFixed(2);
        } else if (entry.State === 'Minimum Price') {
            summary.minimum = entry.Price.toFixed(2);
        } else if (entry.State === 'Modal Price') {
            summary.modal = entry.Price.toFixed(2);
        }
    });
    
    return summary;
}

// Map Functions
function generateIndiaMap(group, commodity, selectedDate = null) {
    const mapContainer = document.getElementById('indiaMap');
    if (!mapContainer) return;
    
    // Check if D3 is available
    if (typeof d3 === 'undefined' || !window.d3Loaded) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Map Library Not Available</h4>
                <p>D3.js library failed to load. Map functionality is temporarily disabled.</p>
                <p>Please refresh the page or check your internet connection.</p>
            </div>
        `;
        return;
    }
    
    if (!mapData) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Map Data Not Available</h4>
                <p>Unable to load India map data. Please check your internet connection.</p>
            </div>
        `;
        return;
    }
    
    // Check if state data is available
    if (!stateData || stateData.length === 0) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>State Data Not Available</h4>
                <p>Unable to load state-wise commodity data from the data source.</p>
                <p>Map functionality requires state data to be loaded successfully.</p>
            </div>
        `;
        return;
    }
    
    mapContainer.innerHTML = '';
    
    let commodityStateData;
    if (selectedDate) {
        const targetDate = new Date(selectedDate + 'T00:00:00');
        commodityStateData = stateData.filter(d => {
            const dataDate = new Date(d.Date.toISOString().split('T')[0] + 'T00:00:00');
            return d.Commodity === commodity && dataDate.getTime() === targetDate.getTime();
        });
    } else {
        const latestDate = new Date(Math.max(...stateData.map(d => d.Date.getTime())));
        commodityStateData = stateData.filter(d => 
            d.Commodity === commodity && d.Date.getTime() === latestDate.getTime()
        );
    }
    
    if (commodityStateData.length === 0) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #666; padding: 40px;">
                <h4>No Data Available</h4>
                <p>No state-wise data found for ${commodity}</p>
            </div>
        `;
        return;
    }
    
    // Filter out summary/aggregate rows first
const actualStateData = commodityStateData.filter(d => 
    !['Average Price', 'Maximum Price', 'Minimum Price', 'Modal Price'].includes(d.State)
);

const prices = actualStateData.map(d => d.Price);
const minPrice = Math.min(...prices);
const maxPrice = Math.max(...prices);
    
    const colorScale = d3.scaleLinear()
    .domain([
        minPrice, 
        minPrice + (maxPrice - minPrice) * 0.25,
        minPrice + (maxPrice - minPrice) * 0.5,
        minPrice + (maxPrice - minPrice) * 0.75,
        maxPrice
    ])
    .range([
        '#A9E1FF',  // Lightest blue (far right)
        '#88C3FF',  // Light blue
        '#67A6FF',  // Medium blue  
        '#428BEA',  // Dark blue
        '#0070CC'   // Darkest blue (your brand color)
    ]);
    
    const width = mapContainer.clientWidth || 600;
    const height = mapContainer.clientHeight || 400;
    
    const svg = d3.select('#indiaMap')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const projection = d3.geoMercator()
        .fitSize([width, height], mapData);
    
    const path = d3.geoPath().projection(projection);
    
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
    
    svg.selectAll('path')
        .data(mapData.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', 'state-path')
        .attr('fill', d => {
            const stateName = d.properties.ST_NM || d.properties.NAME_1 || d.properties.name;
            const stateDataEntry = actualStateData.find(sd => {
                const mappedName = getMapStateName(sd.State);
                return mappedName === stateName || sd.State === stateName;
            });
            
            if (stateDataEntry) {
                return colorScale(stateDataEntry.Price);
            }
            return '#f0f0f0';
        })
        .on('mouseover', function(event, d) {
            const stateName = d.properties.ST_NM || d.properties.NAME_1 || d.properties.name;
            const stateDataEntry = actualStateData.find(sd => {
                const mappedName = getMapStateName(sd.State);
                return mappedName === stateName || sd.State === stateName;
            });
            
            tooltip.transition()
                .duration(200)
                .style('opacity', .9);
            
            const tooltipContent = stateDataEntry 
                ? `<strong>${stateName}</strong><br/>${commodity}: Rs ${stateDataEntry.Price.toFixed(2)}/kg`
                : `<strong>${stateName}</strong><br/>No data available`;
            
            tooltip.html(tooltipContent)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function(d) {
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
    
    createGradientLegend(minPrice, maxPrice);
}

function createGradientLegend(minPrice, maxPrice) {
    const legendContainer = document.getElementById('mapLegend');
    if (!legendContainer) return;
    
    const legendHTML = `
        <div class="legend-title">Price Range (Rs/kg)</div>
        <div class="legend-bar-container">
            <span class="legend-min">Rs ${minPrice.toFixed(2)}</span>
            <div class="legend-gradient-bar"></div>
            <span class="legend-max">Rs ${maxPrice.toFixed(2)}</span>
        </div>
    `;
    legendContainer.innerHTML = legendHTML;
}

function getMapStateName(dataStateName) {
    return STATE_NAME_MAPPINGS[dataStateName] || dataStateName;
}

// Auto-initialize map with Rice
function initializeMapWithRice() {
    const mapGroupSelect = document.getElementById('mapGroup');
    const mapCommoditySelect = document.getElementById('mapCommodity');
    const mapSearchBtn = document.getElementById('mapSearch');
    
    if (!mapGroupSelect || !mapCommoditySelect || !mapSearchBtn) return;
    
    // Set Food Grains group
    mapGroupSelect.value = 'Food Grains';
    
    // Trigger change event to populate commodities
    const changeEvent = new Event('change');
    mapGroupSelect.dispatchEvent(changeEvent);
    
    // Set Rice commodity after options are populated
    setTimeout(() => {
        if (mapCommoditySelect.options.length > 1) {
            mapCommoditySelect.value = 'Rice';
            const commodityChangeEvent = new Event('change');
            mapCommoditySelect.dispatchEvent(commodityChangeEvent);
            
            // Auto-generate map with latest date
            setTimeout(() => {
                const mapDateSelect = document.getElementById('mapDate');
                if (mapDateSelect) {
                    generateIndiaMap('Food Grains', 'Rice', mapDateSelect.value);
                    updateTopStates('Rice', mapDateSelect.value);
                }
            }, 200);
        }
    }, 200);
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup diet chart download functionality
    setupDietChartDownload();
    
    // Initialize other components as needed
    if (typeof initializeDashboard === 'function') {
        // Dashboard initialization is already called in Batch 1
        console.log('Dashboard initialization completed');
    }
});
