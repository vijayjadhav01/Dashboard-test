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
let monthlyAverageData = [];
let regionalChart = null;
let selectedRegionalStates = [];
let selectedRegionalTimeRange = 'all';
let selectedRegionalCommodity = '';
let selectedRegionalGroup = '';
let selectedHeatmapFamilySize = 1;

// Diet Trends Variables
let selectedDietDateRange = '3years';
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

// Date Range Mappings for Diet Trends
const DIET_DATE_RANGES = {
    '6months': 6,
    '1year': 12,
    '3years': 36,
    '6years': 72,
    'all': null
};

const REGIONAL_TIME_RANGES = {
    '6months': 6,
    '1year': 12,
    '2years': 24,
    '5years': 60,
    'all': null
};

// Helper function to get month index
function getMonthIndex(monthName) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.indexOf(monthName);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        showLoading('Loading commodity data...');
        
        updateCurrentDate();
        setupNavigation();
        
        await Promise.all([
            loadMainData(),
            loadStateData(),
            loadMapData(),
            loadMonthlyAverageData()
        ]);
        
        setupEventListeners();
        setupChartControls();
        setupMapControls();
        setupMonthlyMapControls();
        setupDietTrendsControls();
        setupRegionalChartControls();
        setupHeatmapControls();
        populateDateFilter();
        populateYearDropdown();
        updateSummaryCards();
        updateDietCostDisplay();
        
        await initializeDefaultSelections();
        initializeMonthlyMapDefaults();
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

function switchSection(sectionName) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeMenuItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;

    currentSection = sectionName;
    handleSectionSwitch(sectionName);
}

function handleSectionSwitch(sectionName) {
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
            if (selectedCommodities.length > 0) {
                updateChart();
            }
            break;
            
        case 'diet-calculator':
            updateDietCostDisplay();
            updateDietTrendsCharts();
            generateStateHeatmap();
            break;
    }
}

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

function getCompleteMonthsOnly(data) {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return data.filter(item => {
        const itemDate = new Date(item.Date);
        const itemYear = itemDate.getFullYear();
        const itemMonth = itemDate.getMonth();
        
        if (itemYear === currentYear && itemMonth === currentMonth) {
            return false;
        }
        
        return true;
    });
}

function filterDataByDateRange(data, rangeKey) {
    if (!data || data.length === 0) return [];
    if (rangeKey === 'all') return getCompleteMonthsOnly(data);
    
    const monthsBack = DIET_DATE_RANGES[rangeKey];
    if (!monthsBack) return getCompleteMonthsOnly(data);
    
    const endDate = new Date();
    endDate.setDate(1);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - monthsBack);
    
    const completeData = getCompleteMonthsOnly(data);
    return completeData.filter(item => {
        const itemDate = new Date(item.Date);
        return itemDate >= startDate && itemDate < endDate;
    });
}

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

async function initializeDefaultSelections() {
    return new Promise((resolve) => {
        setTimeout(() => {
            try {
                selectGroup('Food Grains');
                
                setTimeout(() => {
                    const riceCheckbox = document.querySelector('input[value="Rice"]');
                    if (riceCheckbox) {
                        riceCheckbox.checked = true;
                        updateSelectedCommodities();
                        updateChart();
                    }
                    
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

// Data Loading Functions
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

async function loadMonthlyAverageData() {
    const sheetId = "18LVYFWEGfgLNqlo_mY5A70cSmXQBXjd8Lry0ivj2AO8";
    const sheetName = "Month Average";
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
            console.log('Monthly data URL failed:', url, error.message);
        }
    }
    
    if (!csvText || csvText.length < 100) {
        console.error('Could not load monthly average data');
        monthlyAverageData = [];
        return;
    }
    
    monthlyAverageData = parseMonthlyDataFromCSV(csvText);
    console.log('Monthly average data loaded:', monthlyAverageData.length, 'records');
}

function parseMonthlyDataFromCSV(csvText) {
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
        if (!values || values.length < 6) continue;
        
        const state = values[0];
        const commodity = values[1];
        const group = values[2];
        const month = values[3];
        const year = parseInt(values[4]);
        const value = parseFloat(values[5]);
        
        if (!state || !commodity || !group || !month || !year || isNaN(value) || value <= 0) {
            continue;
        }
        
        let displayCommodity = commodity;
        if (COMMODITY_MAPPINGS[commodity]) {
            displayCommodity = COMMODITY_MAPPINGS[commodity];
        }
        
        data.push({
            State: state,
            Commodity: displayCommodity,
            Group: group,
            Month: month,
            Year: year,
            Value: value
        });
    }
    
    return data;
}

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
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[2]);
                    
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

    const actualStates = commodityStateData.filter(d => 
        !['Average Price', 'Maximum Price', 'Minimum Price', 'Modal Price'].includes(d.State)
    );

    if (actualStates.length === 0) {
        document.getElementById('highPricesList').innerHTML = '<div class="states-loading">No data available for selected commodity</div>';
        document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">No data available for selected commodity</div>';
        return;
    }

    const sortedStates = [...actualStates].sort((a, b) => b.Price - a.Price);
    
    const top5High = sortedStates.slice(0, 5);
    const highPricesHTML = top5High.map((state, index) => `
        <div class="state-item">
            <span class="state-rank">${index + 1}.</span>
            <span class="state-name">${state.State}</span>
            <span class="state-price">Rs ${state.Price.toFixed(2)}</span>
        </div>
    `).join('');

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
    
    if (!stateData || stateData.length === 0) {
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

function populateYearDropdown() {
    const monthlyMapYear = document.getElementById('monthlyMapYear');
    if (!monthlyMapYear || !monthlyAverageData || monthlyAverageData.length === 0) {
        return;
    }
    
    const uniqueYears = [...new Set(monthlyAverageData.map(d => d.Year))]
        .sort((a, b) => b - a);
    
    monthlyMapYear.innerHTML = '';
    
    uniqueYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        monthlyMapYear.appendChild(option);
    });
    
    console.log('Year dropdown populated with years:', uniqueYears);
}

function getLatestMonthYear(data) {
    if (!data || data.length === 0) {
        return { month: 'June', year: new Date().getFullYear() };
    }
    
    const latestYear = Math.max(...data.map(d => d.Year));
    
    const monthsInLatestYear = data
        .filter(d => d.Year === latestYear)
        .map(d => d.Month);
    
    const uniqueMonths = [...new Set(monthsInLatestYear)];
    
    const monthOrder = [
        'December', 'November', 'October', 'September', 'August', 'July',
        'June', 'May', 'April', 'March', 'February', 'January'
    ];
    
    let latestMonth = 'June';
    for (const month of monthOrder) {
        if (uniqueMonths.includes(month)) {
            latestMonth = month;
            break;
        }
    }
    
    console.log(`Latest available data: ${latestMonth} ${latestYear}`);
    return { month: latestMonth, year: latestYear };
}

function initializeMonthlyMapDefaults() {
    if (!monthlyAverageData || monthlyAverageData.length === 0) {
        console.warn('No monthly data available for initialization');
        return;
    }
    
    const { month, year } = getLatestMonthYear(monthlyAverageData);
    
    const monthlyMapMonth = document.getElementById('monthlyMapMonth');
    const monthlyMapYear = document.getElementById('monthlyMapYear');
    const monthlyMapGroup = document.getElementById('monthlyMapGroup');
    const monthlyMapCommodity = document.getElementById('monthlyMapCommodity');
    
    if (monthlyMapMonth) monthlyMapMonth.value = month;
    if (monthlyMapYear) monthlyMapYear.value = year;
    if (monthlyMapGroup) monthlyMapGroup.value = 'Food Grains';
    
    if (monthlyMapGroup) {
        const changeEvent = new Event('change');
        monthlyMapGroup.dispatchEvent(changeEvent);
        
        setTimeout(() => {
            if (monthlyMapCommodity && monthlyMapCommodity.options.length > 1) {
                monthlyMapCommodity.value = 'Rice';
                const commodityChangeEvent = new Event('change');
                monthlyMapCommodity.dispatchEvent(commodityChangeEvent);
                
                setTimeout(() => {
                    generateMonthlyIndiaMap('Food Grains', 'Rice', month, year);
                }, 200);
            }
        }, 200);
    }
    
    console.log(`Monthly map initialized with defaults: ${month} ${year}, Rice`);
}

function setupEventListeners() {
    document.querySelectorAll('.group-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const group = this.dataset.group;
            selectGroup(group);
        });
    });
    
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('commodity-checkbox-input')) {
            updateSelectedCommodities();
            updateChart();
        }
    });
    
    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.date-filter-btn').forEach(b => b.classList.remove('active'));
            
            this.classList.add('active');
            
            selectedDateRange = this.dataset.range;
            
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
                
                Chart.register(backgroundPlugin);
                
                const originalPadding = commodityChart.options.layout?.padding || 0;
                commodityChart.options.layout = {
                    padding: 30
                };
                
                commodityChart.update('none');
                
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.download = `commodity-chart-${new Date().toISOString().split('T')[0]}.jpg`;
                    link.href = commodityChart.toBase64Image('image/jpeg', 0.95);
                    link.click();
                    
                    Chart.unregister(backgroundPlugin);
                    commodityChart.options.layout.padding = originalPadding;
                    commodityChart.update('none');
                }, 100);
            }
        });
    }
    
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', function() {
            downloadCommodityData();
        });
    }
}

function downloadCommodityData() {
    if (selectedCommodities.length === 0) {
        alert('Please select commodities first');
        return;
    }
    
    let dataToExport = rawData.filter(d => selectedCommodities.includes(d.Commodity));
    
    if (selectedDateRange !== 'all') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(selectedDateRange));
        dataToExport = dataToExport.filter(d => d.Date >= startDate);
    }
    
    dataToExport.sort((a, b) => a.Date - b.Date);
    
    const csvHeader = 'Date,Commodity,Group,Price\n';
    const csvContent = dataToExport.map(item => 
        `${item.Date.toISOString().split('T')[0]},${item.Commodity},${item.Group},${item.Price.toFixed(2)}`
    ).join('\n');
    
    const fullCsv = csvHeader + csvContent;
    
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const commodityNames = selectedCommodities.join('-').replace(/[^a-zA-Z0-9-]/g, '');
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `commodity-data-${commodityNames}-${dateStr}.csv`;
    
    link.href = url;
    link.click();
    
    window.URL.revokeObjectURL(url);
}

function selectGroup(group) {
    document.querySelectorAll('.group-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-group="${group}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    selectedGroup = group;
    selectedCommodities = [];
    
    showCommoditySelection(group);
    
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
    
    const dateFilterSection = document.getElementById('dateFilterSection');
    if (dateFilterSection) {
        dateFilterSection.style.display = selectedCommodities.length > 0 ? 'block' : 'none';
    }
}

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

function generateChart() {
    const canvas = document.getElementById('commodityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (commodityChart) {
        commodityChart.destroy();
        commodityChart = null;
    }
    
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
                const padding = 40;
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
    
    let canvas = document.getElementById('weeklyChart');
    if (!canvas) {
        weeklyAveragesChart.innerHTML = '<canvas id="weeklyChart" style="width: 100%; height: 400px;"></canvas>';
        canvas = document.getElementById('weeklyChart');
    }
    
    generateWeeklyChart(weeklyData);
}

function calculateMonthlyAverages() {
    let filteredData = rawData.filter(d => selectedCommodities.includes(d.Commodity));
    
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

function calculateWeeklyAverages() {
    let filteredData = rawData.filter(d => selectedCommodities.includes(d.Commodity));
    
    filteredData.sort((a, b) => a.Date - b.Date);
    
    const uniqueDates = [...new Set(filteredData.map(d => d.Date.getTime()))]
        .sort((a, b) => a - b)
        .map(timestamp => new Date(timestamp));
    
    const rollingData = [];
    
    uniqueDates.forEach((currentDate, index) => {
        if (index >= 6) {
            const prices = {};
            
            selectedCommodities.forEach(commodity => {
                const sevenDayPrices = [];
                
                for (let i = 6; i >= 0; i--) {
                    const targetDate = uniqueDates[index - i];
                    const dayData = filteredData.filter(d => 
                        d.Date.getTime() === targetDate.getTime() && d.Commodity === commodity
                    );
                    
                    if (dayData.length > 0) {
                        const avgPrice = dayData.reduce((sum, d) => sum + d.Price, 0) / dayData.length;
                        sevenDayPrices.push(avgPrice);
                    }
                }
                
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

function generateMonthlyChart(monthlyData) {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
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

function generateWeeklyChart(weeklyData) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
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

function calculateDietCosts() {
    if (rawData.length === 0) return null;
    
    const latestData = getLatestData();
    if (latestData.length === 0) return null;
    
    const priceMap = {};
    
    latestData.forEach(item => {
        priceMap[item.Commodity] = item.Price;
    });
    
    const cerealsPrice = getAveragePrice(priceMap, ['Rice', 'Wheat', 'Atta (Wheat)']);
    const pulsesPrice = getAveragePrice(priceMap, ['Gram Dal', 'Tur/Arhar Dal', 'Urad Dal', 'Moong Dal', 'Masoor Dal']);
    const vegetablesPrice = getAveragePrice(priceMap, ['Potato', 'Onion', 'Tomato']);
    const oilsPrice = getAveragePrice(priceMap, ['Groundnut Oil (Packed)', 'Mustard Oil (Packed)', 'Soya Oil (Packed)', 'Sunflower Oil (Packed)']);
    const milkPrice = priceMap['Milk @'] || 0;
    const saltPrice = priceMap['Salt Pack (Iodised)'] || 0;
    const sugarPrice = priceMap['Sugar'] || 0;
    
    const requirements = {
        cereals: 250,
        pulses: 85,
        vegetables: 400,
        oils: 27,
        milk: 300,
        salt: 5,
        sugar: 25
    };
    
    const dailyCosts = {
        cereals: (cerealsPrice * requirements.cereals) / 1000,
        pulses: (pulsesPrice * requirements.pulses) / 1000,
        vegetables: (vegetablesPrice * requirements.vegetables) / 1000,
        oils: (oilsPrice * requirements.oils) / 1000,
        milk: (milkPrice * requirements.milk) / 1000,
        salt: (saltPrice * requirements.salt) / 1000,
        sugar: (sugarPrice * requirements.sugar) / 1000
    };
    
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

function setupDietTrendsControls() {
    const familySizeButtons = document.querySelectorAll('.family-size-btn');
    const dateRangeButtons = document.querySelectorAll('.date-range-btn');

    familySizeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            familySizeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedFamilySize = parseInt(this.dataset.size);
            updateDietTrendsCharts();
        });
    });

    dateRangeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            dateRangeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedDietDateRange = this.dataset.range;
            updateDietTrendsCharts();
        });
    });
}

function setupHeatmapControls() {
    const heatmapFamilyButtons = document.querySelectorAll('.heatmap-family-btn');
    
    heatmapFamilyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            heatmapFamilyButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedHeatmapFamilySize = parseInt(this.dataset.size);
            generateStateHeatmap();
        });
    });
}

function initializeDietTrends() {
    updateDietTrendsCharts();
    generateStateHeatmap();
}

function updateDietTrendsCharts() {
    updateNationalDietChart();
    updateDietTrendsTitle();
}

function updateDietTrendsTitle() {
    const titleElement = document.getElementById('dietTrendsChartTitle');
    if (titleElement) {
        const rangeText = getDateRangeDisplayText(selectedDietDateRange, selectedFamilySize);
        titleElement.textContent = `National Average - ${rangeText}`;
    }
}

function updateNationalDietChart() {
    const canvas = document.getElementById('nationalDietChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (nationalDietChart) {
        nationalDietChart.destroy();
        nationalDietChart = null;
    }
    
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

function calculateNationalDietCosts(rangeKey, familySize) {
    if (rawData.length === 0) return [];
    
    const filteredData = filterDataByDateRange(rawData, rangeKey);
    if (filteredData.length === 0) return [];
    
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

function calculateMonthlyAveragePrices(monthData) {
    const priceMap = {};
    
    const commodityGroups = {};
    monthData.forEach(item => {
        if (!commodityGroups[item.Commodity]) {
            commodityGroups[item.Commodity] = [];
        }
        commodityGroups[item.Commodity].push(item.Price);
    });
    
    Object.keys(commodityGroups).forEach(commodity => {
        const prices = commodityGroups[commodity];
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        priceMap[commodity] = avgPrice;
    });
    
    return priceMap;
}

function calculateDietCostFromPrices(priceMap, familySize) {
    const cerealsPrice = getAveragePrice(priceMap, ['Rice', 'Wheat', 'Atta (Wheat)']);
    const pulsesPrice = getAveragePrice(priceMap, ['Gram Dal', 'Tur/Arhar Dal', 'Urad Dal', 'Moong Dal', 'Masoor Dal']);
    const vegetablesPrice = getAveragePrice(priceMap, ['Potato', 'Onion', 'Tomato']);
    const oilsPrice = getAveragePrice(priceMap, ['Groundnut Oil (Packed)', 'Mustard Oil (Packed)', 'Soya Oil (Packed)', 'Sunflower Oil (Packed)']);
    const milkPrice = priceMap['Milk @'] || 0;
    const saltPrice = priceMap['Salt Pack (Iodised)'] || 0;
    const sugarPrice = priceMap['Sugar'] || 0;
    
    const requirements = {
        cereals: 250,
        pulses: 85,
        vegetables: 400,
        oils: 27,
        milk: 300,
        salt: 5,
        sugar: 25
    };
    
    const dailyCost1Person = 
        (cerealsPrice * requirements.cereals / 1000) +
        (pulsesPrice * requirements.pulses / 1000) +
        (vegetablesPrice * requirements.vegetables / 1000) +
        (oilsPrice * requirements.oils / 1000) +
        (milkPrice * requirements.milk / 1000) +
        (saltPrice * requirements.salt / 1000) +
        (sugarPrice * requirements.sugar / 1000);
    
    const monthlyCost = dailyCost1Person * familySize * 30;
    
    return monthlyCost;
}

function generateStateHeatmap() {
    const container = document.getElementById('stateHeatmapContainer');
    if (!container || !monthlyAverageData || monthlyAverageData.length === 0) {
        if (container) {
            container.innerHTML = `
                <div class="trends-heatmap-placeholder">
                    📊 State-wise diet cost data not available
                    <br>Requires monthly average commodity prices
                </div>
            `;
        }
        return;
    }
    
    const monthYearSet = new Set();
    monthlyAverageData.forEach(d => {
        monthYearSet.add(`${d.Year}-${String(getMonthIndex(d.Month) + 1).padStart(2, '0')}`);
    });
    
    const uniqueMonthYears = Array.from(monthYearSet)
        .sort((a, b) => new Date(a + '-01') - new Date(b + '-01'))
        .slice(-12);
    
    if (uniqueMonthYears.length === 0) {
        container.innerHTML = `
            <div class="trends-heatmap-placeholder">
                📊 No recent monthly data available
            </div>
        `;
        return;
    }
    
    const states = [...new Set(monthlyAverageData.map(d => d.State))]
        .filter(state => state && state.trim() !== '')
        .sort();
    
    if (states.length === 0) {
        container.innerHTML = `
            <div class="trends-heatmap-placeholder">
                📊 No state data found
            </div>
        `;
        return;
    }
    
    const heatmapData = [];
    states.forEach(state => {
        const stateRow = { state: state, costs: [] };
        
        uniqueMonthYears.forEach(monthYear => {
            const [year, month] = monthYear.split('-');
            const monthName = getMonthName(parseInt(month) - 1);
            
            const stateDataForMonth = monthlyAverageData.filter(d => 
                d.State === state && 
                d.Year === parseInt(year) && 
                d.Month === monthName
            );
            
            if (stateDataForMonth.length > 0) {
                const priceMap = {};
                stateDataForMonth.forEach(item => {
                    priceMap[item.Commodity] = item.Value;
                });
                
                const dietCost = calculateDietCostFromPrices(priceMap, selectedHeatmapFamilySize);
                stateRow.costs.push(Math.round(dietCost));
            } else {
                stateRow.costs.push(null);
            }
        });
        
        heatmapData.push(stateRow);
    });
    
    const monthHeaders = uniqueMonthYears.map(monthYear => {
        const [year, month] = monthYear.split('-');
        const monthName = getMonthName(parseInt(month) - 1);
        return `${monthName.substr(0, 3)}'${year.substr(2)}`;
    });
    
    const allCosts = heatmapData.flatMap(row => row.costs).filter(cost => cost !== null);
    const minCost = Math.min(...allCosts);
    const maxCost = Math.max(...allCosts);
    
    let heatmapHTML = `
        <div class="diet-heatmap">
            <div class="header-row">
                <div class="header-spacer"></div>
                ${monthHeaders.map(header => `<div class="date-header">${header}</div>`).join('')}
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
                    
                    const intensity = (cost - minCost) / (maxCost - minCost);
                    
                    let backgroundColor, textColor;
                    
                    if (intensity <= 0.2) {
                        backgroundColor = `rgb(230, 245, 255)`;
                        textColor = '#333';
                    } else if (intensity <= 0.4) {
                        backgroundColor = `rgb(180, 220, 255)`;
                        textColor = '#333';
                    } else if (intensity <= 0.6) {
                        backgroundColor = `rgb(120, 180, 255)`;
                        textColor = '#fff';
                    } else if (intensity <= 0.8) {
                        backgroundColor = `rgb(60, 140, 220)`;
                        textColor = '#fff';
                    } else {
                        backgroundColor = `rgb(0, 112, 204)`;
                        textColor = '#fff';
                    }
                    
                    const familySizeText = selectedHeatmapFamilySize === 1 ? '1 person' : 'family of 4';
                    return `<div class="day-cell" style="background: ${backgroundColor}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 600;" title="${row.state}: Rs ${cost.toLocaleString()}/month (${familySizeText})">${cost.toLocaleString()}</div>`;
                }).join('')}
            </div>
        `;
    });
    
    heatmapHTML += '</div>';
    
    container.innerHTML = heatmapHTML;
}

function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

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
        
        document.getElementById('highPricesList').innerHTML = '<div class="states-loading">Select commodity to view data</div>';
        document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">Select commodity to view data</div>';
    });
    
    mapCommoditySelect.addEventListener('change', function() {
        mapSearchBtn.disabled = !this.value;
        
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

function setupMonthlyMapControls() {
    const monthlyMapMonth = document.getElementById('monthlyMapMonth');
    const monthlyMapYear = document.getElementById('monthlyMapYear');
    const monthlyMapGroup = document.getElementById('monthlyMapGroup');
    const monthlyMapCommodity = document.getElementById('monthlyMapCommodity');
    const monthlyMapSearch = document.getElementById('monthlyMapSearch');
    
    if (!monthlyMapMonth || !monthlyMapYear || !monthlyMapGroup || !monthlyMapCommodity || !monthlyMapSearch) {
        console.warn('Monthly map controls not found');
        return;
    }
    
    monthlyMapMonth.addEventListener('change', function() {
        if (monthlyMapGroup.value && monthlyMapCommodity.value) {
            monthlyMapSearch.disabled = false;
        }
    });
    
    monthlyMapYear.addEventListener('change', function() {
        if (monthlyMapGroup.value && monthlyMapCommodity.value) {
            monthlyMapSearch.disabled = false;
        }
    });
    
    monthlyMapGroup.addEventListener('change', function() {
        const selectedGroup = this.value;
        
        if (selectedGroup && COMMODITY_GROUPS[selectedGroup]) {
            const commodities = COMMODITY_GROUPS[selectedGroup];
            monthlyMapCommodity.innerHTML = '<option value="">Select commodity</option>' +
                commodities.map(commodity => `<option value="${commodity}">${commodity}</option>`).join('');
            monthlyMapCommodity.disabled = false;
        } else {
            monthlyMapCommodity.innerHTML = '<option value="">Select commodity</option>';
            monthlyMapCommodity.disabled = true;
            monthlyMapSearch.disabled = true;
        }
        
        monthlyMapCommodity.value = '';
        monthlyMapSearch.disabled = true;
    });
    
    monthlyMapCommodity.addEventListener('change', function() {
        monthlyMapSearch.disabled = !this.value;
    });
    
    monthlyMapSearch.addEventListener('click', function() {
        const selectedMonth = monthlyMapMonth.value;
        const selectedYear = parseInt(monthlyMapYear.value);
        const selectedGroup = monthlyMapGroup.value;
        const selectedCommodity = monthlyMapCommodity.value;
        
        if (selectedMonth && selectedYear && selectedGroup && selectedCommodity) {
            console.log(`Generating monthly map: ${selectedCommodity} - ${selectedMonth} ${selectedYear}`);
            generateMonthlyIndiaMap(selectedGroup, selectedCommodity, selectedMonth, selectedYear);
        }
    });
    
    console.log('Monthly map controls event listeners setup complete');
}

function setupDietChartDownload() {
    const downloadDietChartBtn = document.getElementById('downloadDietChart');
    if (downloadDietChartBtn) {
        downloadDietChartBtn.addEventListener('click', function() {
            if (nationalDietChart) {
                const originalCanvas = nationalDietChart.canvas;
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                const padding = 40;
                tempCanvas.width = originalCanvas.width + (padding * 2);
                tempCanvas.height = originalCanvas.height + (padding * 2);
                
                tempCtx.fillStyle = '#FFFFFF';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                tempCtx.drawImage(originalCanvas, padding, padding);
                
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

function setupRegionalChartControls() {
    const regionalChartGroup = document.getElementById('regionalChartGroup');
    const regionalChartCommodity = document.getElementById('regionalChartCommodity');
    const stateSelectionToggle = document.getElementById('stateSelectionToggle');
    const stateSelectionDropdown = document.getElementById('stateSelectionDropdown');
    const stateSearchInput = document.getElementById('stateSearchInput');
    const timeRangeButtons = document.querySelectorAll('.time-range-btn');
    
    if (!regionalChartGroup || !regionalChartCommodity || !stateSelectionToggle) {
        console.warn('Regional chart controls not found');
        return;
    }
    
    populateStatesDropdown();
    
    regionalChartGroup.addEventListener('change', function() {
        const selectedGroup = this.value;
        selectedRegionalGroup = selectedGroup;
        
        if (selectedGroup && COMMODITY_GROUPS[selectedGroup]) {
            const commodities = COMMODITY_GROUPS[selectedGroup];
            regionalChartCommodity.innerHTML = '<option value="">Choose Commodity</option>' +
                commodities.map(commodity => `<option value="${commodity}">${commodity}</option>`).join('');
            regionalChartCommodity.disabled = false;
        } else {
            regionalChartCommodity.innerHTML = '<option value="">Choose Commodity</option>';
            regionalChartCommodity.disabled = true;
        }
        
        regionalChartCommodity.value = '';
        selectedRegionalCommodity = '';
        hideRegionalChart();
    });
    
    regionalChartCommodity.addEventListener('change', function() {
        selectedRegionalCommodity = this.value;
        updateRegionalChart();
    });
    
    stateSelectionToggle.addEventListener('click', function() {
        const dropdown = stateSelectionDropdown;
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        const arrow = this.querySelector('span:last-child');
        arrow.textContent = isVisible ? '▼' : '▲';
    });
    
    document.addEventListener('click', function(e) {
        if (!stateSelectionToggle.contains(e.target) && !stateSelectionDropdown.contains(e.target)) {
            stateSelectionDropdown.style.display = 'none';
            const arrow = stateSelectionToggle.querySelector('span:last-child');
            arrow.textContent = '▼';
        }
    });
    
    if (stateSearchInput) {
        stateSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const checkboxItems = document.querySelectorAll('.state-checkbox-item');
            
            checkboxItems.forEach(item => {
                const stateName = item.textContent.toLowerCase();
                item.style.display = stateName.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    }
    
    timeRangeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            timeRangeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedRegionalTimeRange = this.dataset.range;
            updateRegionalChart();
        });
    });

    const clearButton = document.getElementById('clearRegionalChart');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            regionalChartGroup.value = '';
            regionalChartCommodity.innerHTML = '<option value="">Choose Commodity</option>';
            regionalChartCommodity.disabled = true;
            
            const checkboxes = document.querySelectorAll('#stateCheckboxContainer input[type="checkbox"]');
            checkboxes.forEach(checkbox => checkbox.checked = false);
            
            const displayElement = document.getElementById('stateSelectionText');
            if (displayElement) displayElement.textContent = 'Choose States...';
            
            timeRangeButtons.forEach(btn => btn.classList.remove('active'));
            const allDataBtn = document.querySelector('.time-range-btn[data-range="all"]');
            if (allDataBtn) allDataBtn.classList.add('active');
            
            if (stateSearchInput) stateSearchInput.value = '';
            
            const checkboxItems = document.querySelectorAll('.state-checkbox-item');
            checkboxItems.forEach(item => item.style.display = 'flex');
            
            selectedRegionalStates = [];
            selectedRegionalTimeRange = 'all';
            selectedRegionalCommodity = '';
            selectedRegionalGroup = '';
            
            if (regionalChart) {
                regionalChart.destroy();
                regionalChart = null;
            }
            
            console.log('Regional chart filters cleared');
        });
    }

    console.log('Regional chart controls setup complete');
}

function populateStatesDropdown() {
    const container = document.getElementById('stateCheckboxContainer');
    if (!container || !monthlyAverageData || monthlyAverageData.length === 0) {
        return;
    }
    
    const allStates = [...new Set(monthlyAverageData.map(d => d.State))]
        .filter(state => state && state.trim() !== '')
        .sort();
    
    if (allStates.length === 0) {
        container.innerHTML = '<div style="padding: 1rem; text-align: center; color: #666;">No states available</div>';
        return;
    }
    
    container.innerHTML = allStates.map(state => `
        <div class="state-checkbox-item">
            <input type="checkbox" id="state-${state.replace(/\s+/g, '-')}" value="${state}">
            <label for="state-${state.replace(/\s+/g, '-')}">${state}</label>
        </div>
    `).join('');
    
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSelectedStates();
            updateStateSelectionDisplay();
            updateRegionalChart();
        });
    });
    
    console.log('States dropdown populated with', allStates.length, 'states');
}

function updateSelectedStates() {
    const checkboxes = document.querySelectorAll('#stateCheckboxContainer input[type="checkbox"]:checked');
    selectedRegionalStates = Array.from(checkboxes).map(cb => cb.value);
}

function updateStateSelectionDisplay() {
    const displayElement = document.getElementById('stateSelectionText');
    if (!displayElement) return;
    
    if (selectedRegionalStates.length === 0) {
        displayElement.textContent = 'Choose States...';
    } else if (selectedRegionalStates.length === 1) {
        displayElement.textContent = selectedRegionalStates[0];
    } else if (selectedRegionalStates.length <= 3) {
        displayElement.textContent = selectedRegionalStates.join(', ');
    } else {
        displayElement.textContent = `${selectedRegionalStates.length} states selected`;
    }
}

function updateRegionalChart() {
    if (!selectedRegionalCommodity || selectedRegionalStates.length === 0) {
        hideRegionalChart();
        return;
    }
    
    showRegionalChart();
    generateRegionalChart();
}

function showRegionalChart() {
    const chartSection = document.getElementById('regionalChartSection');
    const downloadBtn = document.getElementById('downloadRegionalChart');
    const downloadDataBtn = document.getElementById('downloadRegionalData');
    
    if (chartSection) chartSection.style.display = 'block';
    if (downloadBtn) downloadBtn.style.display = 'inline-flex';
    if (downloadDataBtn) downloadDataBtn.style.display = 'inline-flex';
}

function hideRegionalChart() {
    const chartSection = document.getElementById('regionalChartSection');
    const downloadBtn = document.getElementById('downloadRegionalChart');
    const downloadDataBtn = document.getElementById('downloadRegionalData');
    
    if (chartSection) chartSection.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (downloadDataBtn) downloadDataBtn.style.display = 'none';
    
    if (regionalChart) {
        regionalChart.destroy();
        regionalChart = null;
    }
}

function generateRegionalChart() {
    const canvas = document.getElementById('regionalHistoricalChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (regionalChart) {
        regionalChart.destroy();
        regionalChart = null;
    }
    
    const chartData = getRegionalChartData();
    
    if (chartData.length === 0) {
        console.warn('No data available for regional chart');
        return;
    }
    
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
                const padding = 70;
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
    
    const colors = ['#0070CC', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF8C42', '#6A4C93'];
    const datasets = selectedRegionalStates.map((state, index) => {
        const stateData = chartData.filter(d => d.state === state);
        
        return {
            label: state,
            data: stateData.map(d => ({
                x: d.date,
                y: d.value
            })),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 1,
            pointHoverRadius: 6
        };
    });
    
    regionalChart = new Chart(ctx, {
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
                        padding: 15,
                        boxWidth: 8,
                        boxHeight: 8
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

function getRegionalChartData() {
    if (!monthlyAverageData || monthlyAverageData.length === 0) {
        return [];
    }
    
    let filteredData = monthlyAverageData.filter(d => 
        d.Commodity === selectedRegionalCommodity && 
        selectedRegionalStates.includes(d.State)
    );
    
    if (selectedRegionalTimeRange !== 'all') {
        const monthsBack = REGIONAL_TIME_RANGES[selectedRegionalTimeRange];
        if (monthsBack) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - monthsBack);
            
            filteredData = filteredData.filter(d => {
                const itemDate = new Date(d.Year, getMonthIndex(d.Month), 1);
                return itemDate >= startDate;
            });
        }
    }
    
    return filteredData.map(d => ({
        state: d.State,
        date: new Date(d.Year, getMonthIndex(d.Month), 1),
        value: d.Value
    })).sort((a, b) => a.date - b.date);
}

function setupRegionalChartDownload() {
    const downloadChartBtn = document.getElementById('downloadRegionalChart');
    const downloadDataBtn = document.getElementById('downloadRegionalData');
    
    if (downloadChartBtn) {
        downloadChartBtn.addEventListener('click', function() {
            if (regionalChart) {
                const originalCanvas = regionalChart.canvas;
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                const padding = 40;
                tempCanvas.width = originalCanvas.width + (padding * 2);
                tempCanvas.height = originalCanvas.height + (padding * 2);
                
                tempCtx.fillStyle = '#FFFFFF';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                tempCtx.drawImage(originalCanvas, padding, padding);
                
                const commodity = selectedRegionalCommodity.replace(/[^a-zA-Z0-9]/g, '');
                const states = selectedRegionalStates.length > 3 ? 
                    `${selectedRegionalStates.length}states` : 
                    selectedRegionalStates.join('-').replace(/[^a-zA-Z0-9-]/g, '');
                const timeRange = selectedRegionalTimeRange;
                const dateStr = new Date().toISOString().split('T')[0];
                const filename = `regional-${commodity}-${states}-${timeRange}-${dateStr}.jpg`;
                
                const link = document.createElement('a');
                link.download = filename;
                link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
                link.click();
            }
        });
    }
    
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', function() {
            downloadRegionalData();
        });
    }
}

function downloadRegionalData() {
    if (!selectedRegionalCommodity || selectedRegionalStates.length === 0) {
        alert('Please select commodity and states first');
        return;
    }
    
    const chartData = getRegionalChartData();
    if (chartData.length === 0) {
        alert('No data available for download');
        return;
    }
    
    const csvHeader = 'Date,State,Commodity,Price\n';
    const csvContent = chartData.map(item => {
        const dateStr = item.date.toISOString().split('T')[0];
        return `${dateStr},${item.state},${selectedRegionalCommodity},${item.value.toFixed(2)}`;
    }).join('\n');
    
    const fullCsv = csvHeader + csvContent;
    
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const commodity = selectedRegionalCommodity.replace(/[^a-zA-Z0-9]/g, '');
    const states = selectedRegionalStates.length > 3 ? 
        `${selectedRegionalStates.length}states` : 
        selectedRegionalStates.join('-').replace(/[^a-zA-Z0-9-]/g, '');
    const timeRange = selectedRegionalTimeRange;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `regional-data-${commodity}-${states}-${timeRange}-${dateStr}.csv`;
    
    link.href = url;
    link.click();
    
    window.URL.revokeObjectURL(url);
}

function updateKPIs(commodity, selectedDate = null) {
    if (!stateData || stateData.length === 0) {
        const kpiElements = {
            avgPrice: document.getElementById('avgPrice'),
            maxPrice: document.getElementById('maxPrice'),
            minPrice: document.getElementById('minPrice'),
            modalPrice: document.getElementById('modalPrice')
        };
        
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
    
    const summaryData = getSummaryDataFromSheet(commodity, selectedDate);
    
    const kpiElements = {
        avgPrice: document.getElementById('avgPrice'),
        maxPrice: document.getElementById('maxPrice'),
        minPrice: document.getElementById('minPrice'),
        modalPrice: document.getElementById('modalPrice')
    };
    
    if (summaryData) {
        if (kpiElements.avgPrice) kpiElements.avgPrice.textContent = `Rs ${summaryData.average}/kg`;
        if (kpiElements.maxPrice) kpiElements.maxPrice.textContent = `Rs ${summaryData.maximum}/kg`;
        if (kpiElements.minPrice) kpiElements.minPrice.textContent = `Rs ${summaryData.minimum}/kg`;
        if (kpiElements.modalPrice) kpiElements.modalPrice.textContent = `Rs ${summaryData.modal}/kg`;
    } else {
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

function generateIndiaMap(group, commodity, selectedDate = null) {
    const mapContainer = document.getElementById('indiaMap');
    if (!mapContainer) return;
    
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
            '#A9E1FF',
            '#88C3FF',
            '#67A6FF',
            '#428BEA',
            '#0070CC'
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

function generateMonthlyIndiaMap(group, commodity, month, year) {
    const mapContainer = document.getElementById('monthlyIndiaMap');
    if (!mapContainer) return;
    
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
    
    if (!monthlyAverageData || monthlyAverageData.length === 0) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Monthly Data Not Available</h4>
                <p>Unable to load monthly average data from the data source.</p>
                <p>Map functionality requires monthly data to be loaded successfully.</p>
            </div>
        `;
        return;
    }
    
    mapContainer.innerHTML = '';
    
    const commodityMonthlyData = monthlyAverageData.filter(d => 
        d.Commodity === commodity && 
        d.Month === month && 
        d.Year === year
    );
    
    if (commodityMonthlyData.length === 0) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #666; padding: 40px;">
                <h4>No Data Available</h4>
                <p>No data found for ${commodity} in ${month} ${year}</p>
            </div>
        `;
        return;
    }
    
    const prices = commodityMonthlyData.map(d => d.Value);
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
            '#A9E1FF',
            '#88C3FF',
            '#67A6FF',
            '#428BEA',
            '#0070CC'
        ]);
    
    const width = mapContainer.clientWidth || 600;
    const height = mapContainer.clientHeight || 400;
    
    const svg = d3.select('#monthlyIndiaMap')
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
            const stateDataEntry = commodityMonthlyData.find(sd => {
                const mappedName = getMapStateName(sd.State);
                return mappedName === stateName || sd.State === stateName;
            });
            
            if (stateDataEntry) {
                return colorScale(stateDataEntry.Value);
            }
            return '#f0f0f0';
        })
        .on('mouseover', function(event, d) {
            const stateName = d.properties.ST_NM || d.properties.NAME_1 || d.properties.name;
            const stateDataEntry = commodityMonthlyData.find(sd => {
                const mappedName = getMapStateName(sd.State);
                return mappedName === stateName || sd.State === stateName;
            });
            
            tooltip.transition()
                .duration(200)
                .style('opacity', .9);
            
            const tooltipContent = stateDataEntry 
                ? `<strong>${stateName}</strong><br/>${commodity}: Rs ${stateDataEntry.Value.toFixed(2)}/kg<br/>${month} ${year} Average`
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
    
    createMonthlyGradientLegend(minPrice, maxPrice);
    
    console.log(`Monthly map generated: ${commodity} - ${month} ${year}, Price range: Rs ${minPrice.toFixed(2)} - Rs ${maxPrice.toFixed(2)}`);
}

function createMonthlyGradientLegend(minPrice, maxPrice) {
    const legendContainer = document.getElementById('monthlyMapLegend');
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

function initializeMapWithRice() {
    const mapGroupSelect = document.getElementById('mapGroup');
    const mapCommoditySelect = document.getElementById('mapCommodity');
    const mapSearchBtn = document.getElementById('mapSearch');
    
    if (!mapGroupSelect || !mapCommoditySelect || !mapSearchBtn) return;
    
    mapGroupSelect.value = 'Food Grains';
    
    const changeEvent = new Event('change');
    mapGroupSelect.dispatchEvent(changeEvent);
    
    setTimeout(() => {
        if (mapCommoditySelect.options.length > 1) {
            mapCommoditySelect.value = 'Rice';
            const commodityChangeEvent = new Event('change');
            mapCommoditySelect.dispatchEvent(commodityChangeEvent);
            
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

document.addEventListener('DOMContentLoaded', function() {
    setupDietChartDownload();
    setupRegionalChartDownload();
    
    if (typeof initializeDashboard === 'function') {
        console.log('Dashboard initialization completed');
    }
});