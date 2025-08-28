// Global Variables
let rawData = [];
let stateData = [];
let mapData = null;
let commodityChart = null;
let monthlyChart = null;
let weeklyChart = null;
let nationalDietChart = null;
let trendsChart = null;
let dietCostMapChart = null;
let selectedCommodities = [];
let selectedGroup = null;
let selectedDateRange = 'all';
let currentSection = 'diet-calculator'; // Changed default to diet-calculator
let monthlyAverageData = [];
let regionalChart = null;
let selectedRegionalStates = [];
let selectedRegionalTimeRange = 'all';
let selectedRegionalCommodity = '';
let selectedRegionalGroup = '';
let selectedHeatmapFamilySize = 1;
let monthlyMapInitialized = false;

// Diet Trends Variables
let selectedDietDateRange = '3years';
let selectedFamilySize = 4;

// Diet Cost Variables
let selectedDietPeriod = 'daily';
let dietCostData = [];

// Trends Variables
let selectedTrendsGroup = '';
let selectedTrendsCommodity = '';
let selectedTrendsAverageRange = 'monthly';

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
        setupDietCostControls();
        setupTrendsControls();
        setupMapControls();
        setupMonthlyMapControls();
        setupDietTrendsControls();
        populateDateFilter();
        populateYearDropdown();
        updateSummaryCards();
        
        await initializeDefaultSections();
        initializeMonthlyMapDefaults();
        initializeDietSection();
        
        hideLoading();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        hideLoading();
        showError('Failed to load dashboard: ' + error.message);
    }
}

// Navigation Setup - Updated for new structure
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
        if (!monthlyMapInitialized) {
            initializeMonthlyMapDefaults();
            monthlyMapInitialized = true;
        } else {
            refreshCurrentMap();
        }
    }, 100);
    break;
            
        case 'state-map':
            case 'state-map':
    setTimeout(() => {
        initializeMonthlyMapDefaults();
    }, 100);
    break;
            
        case 'trends':
            updateSummaryCards(); // Ensure latest prices are shown
            if (selectedTrendsCommodity) {
                updateTrendsChart();
            }
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

async function initializeDefaultSections() {
    return new Promise((resolve) => {
        setTimeout(() => {
            try {
                // Initialize diet calculator with default settings
                generateDietCostMap();
                updateNationalDietChart();
                
                // Initialize trends with Rice selection
                const trendsGroup = document.getElementById('trendsGroup');
                if (trendsGroup) {
                    trendsGroup.value = 'Food Grains';
                    const changeEvent = new Event('change');
                    trendsGroup.dispatchEvent(changeEvent);
                    
                    setTimeout(() => {
                        const trendsCommodity = document.getElementById('trendsCommodity');
                        if (trendsCommodity && trendsCommodity.options.length > 1) {
                            trendsCommodity.value = 'Rice';
                            const commodityChangeEvent = new Event('change');
                            trendsCommodity.dispatchEvent(commodityChangeEvent);
                        }
                    }, 200);
                }
                
                resolve();
            } catch (error) {
                console.error('Default sections initialization error:', error);
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

function getMonthOverMonthData() {
    if (!rawData || rawData.length === 0) return [];
    
    const latestDate = new Date(Math.max(...rawData.map(d => d.Date.getTime())));
    const lastMonthDate = new Date(latestDate);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    
    // Find closest date to last month
    const monthAgoData = rawData.filter(d => {
        const daysDiff = Math.abs((d.Date - lastMonthDate) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7; // Within a week of the target date
    });
    
    if (monthAgoData.length === 0) return [];
    
    // Get the closest date
    const closestDate = new Date(Math.min(...monthAgoData.map(d => d.Date.getTime())));
    return rawData.filter(d => d.Date.getTime() === closestDate.getTime());
}

function getYearOverYearData() {
    if (!rawData || rawData.length === 0) return [];
    
    const latestDate = new Date(Math.max(...rawData.map(d => d.Date.getTime())));
    const lastYearDate = new Date(latestDate);
    lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
    
    // Find closest date to last year
    const yearAgoData = rawData.filter(d => {
        const daysDiff = Math.abs((d.Date - lastYearDate) / (1000 * 60 * 60 * 24));
        return daysDiff <= 14; // Within two weeks of the target date
    });
    
    if (yearAgoData.length === 0) return [];
    
    // Get the closest date
    const closestDate = new Date(Math.min(...yearAgoData.map(d => d.Date.getTime())));
    return rawData.filter(d => d.Date.getTime() === closestDate.getTime());
}

// Diet Calculator Functions

function setupDietCostControls() {
    const dietCostButtons = document.querySelectorAll('.diet-cost-btn');
    const familySizeButtons = document.querySelectorAll('.family-size-btn');
    
    // Diet cost period toggle
    dietCostButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            dietCostButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedDietPeriod = this.dataset.period;
            updateDietCostDisplay();
            generateDietCostMap();
        });
    });
    
    // Family size buttons
    familySizeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            familySizeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedFamilySize = parseInt(this.dataset.size);
            updateNationalDietChart();
        });
    });
}

function initializeDietSection() {
    calculateDietCosts();
    generateDietCostMap();
    updateNationalDietChart();
    updateDietDataDate();
}

function calculateStateDietCosts() {
    if (!stateData || stateData.length === 0) {
        console.warn('No state data available for diet cost calculation');
        return [];
    }
    
    // Get latest date from state data
    const latestDate = new Date(Math.max(...stateData.map(d => d.Date.getTime())));
    const latestStateData = stateData.filter(d => d.Date.getTime() === latestDate.getTime());
    
    // Group by state
    const stateGroups = {};
    latestStateData.forEach(item => {
        if (!stateGroups[item.State]) {
            stateGroups[item.State] = {};
        }
        stateGroups[item.State][item.Commodity] = item.Price;
    });
    
    const stateDietCosts = [];
    
    Object.keys(stateGroups).forEach(stateName => {
        // Skip summary rows
        if (['Average Price', 'Maximum Price', 'Minimum Price', 'Modal Price'].includes(stateName)) {
            return;
        }
        
        const statePrices = stateGroups[stateName];
        
        // Calculate average prices for each food category
        const cerealsPrice = getAveragePrice(statePrices, ['Rice', 'Wheat', 'Atta (Wheat)']);
        const pulsesPrice = getAveragePrice(statePrices, ['Gram Dal', 'Tur/Arhar Dal', 'Urad Dal', 'Moong Dal', 'Masoor Dal']);
        const vegetablesPrice = getAveragePrice(statePrices, ['Potato', 'Onion', 'Tomato']);
        const oilsPrice = getAveragePrice(statePrices, ['Groundnut Oil (Packed)', 'Mustard Oil (Packed)', 'Soya Oil (Packed)', 'Sunflower Oil (Packed)']);
        const milkPrice = statePrices['Milk @'] || 0;
        const saltPrice = statePrices['Salt Pack (Iodised)'] || 0;
        const sugarPrice = statePrices['Sugar'] || 0;
        
        // Check if we have sufficient data
        const hasMinimumData = cerealsPrice > 0 && pulsesPrice > 0 && vegetablesPrice > 0;
        
        if (!hasMinimumData) {
            stateDietCosts.push({
                state: stateName,
                cost: null,
                reason: 'Insufficient commodity data'
            });
            return;
        }
        
        // Calculate daily diet cost using same formula as national
        const requirements = {
            cereals: 250,
            pulses: 85,
            vegetables: 400,
            oils: 27,
            milk: 300,
            salt: 5,
            sugar: 25
        };
        
        const dailyCost = 
            (cerealsPrice * requirements.cereals / 1000) +
            (pulsesPrice * requirements.pulses / 1000) +
            (vegetablesPrice * requirements.vegetables / 1000) +
            (oilsPrice * requirements.oils / 1000) +
            (milkPrice * requirements.milk / 1000) +
            (saltPrice * requirements.salt / 1000) +
            (sugarPrice * requirements.sugar / 1000);
        
        stateDietCosts.push({
            state: stateName,
            cost: dailyCost,
            reason: null
        });
    });
    
    return stateDietCosts.filter(s => s.cost !== null && s.cost > 0);
}

function generateDietCostMap() {
    const mapContainer = document.getElementById('dietCostMap');
    if (!mapContainer) return;
    
    if (typeof d3 === 'undefined' || !window.d3Loaded) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Map Library Not Available</h4>
                <p>D3.js library failed to load. Map functionality is temporarily disabled.</p>
            </div>
        `;
        return;
    }
    
    if (!mapData) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Map Data Not Available</h4>
                <p>Unable to load India map data.</p>
            </div>
        `;
        return;
    }
    
    mapContainer.innerHTML = '';
    
    const dietCostData = calculateStateDietCosts();
    if (dietCostData.length === 0) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #666; padding: 40px;">
                <h4>No Diet Cost Data</h4>
                <p>Unable to calculate diet costs from available state data.</p>
            </div>
        `;
        return;
    }
    
    // Calculate cost range for color scaling
    const costs = dietCostData.map(d => d.cost);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    
    // Create color scale (green to red)
    const colorScale = d3.scaleLinear()
    .domain([
        minCost, 
        minCost + (maxCost - minCost) * 0.25,
        minCost + (maxCost - minCost) * 0.5,
        minCost + (maxCost - minCost) * 0.75,
        maxCost
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
    
    const svg = d3.select('#dietCostMap')
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
            const stateDataEntry = dietCostData.find(sd => {
                const mappedName = getMapStateName(sd.state);
                return mappedName === stateName || sd.state === stateName;
            });
            
            if (stateDataEntry && stateDataEntry.cost) {
                return colorScale(stateDataEntry.cost);
            }
            return '#f0f0f0';
        })
        .on('mouseover', function(event, d) {
            const stateName = d.properties.ST_NM || d.properties.NAME_1 || d.properties.name;
            const stateDataEntry = dietCostData.find(sd => {
                const mappedName = getMapStateName(sd.state);
                return mappedName === stateName || sd.state === stateName;
            });
            
            tooltip.transition()
                .duration(200)
                .style('opacity', .9);
            
            let tooltipContent;
            if (stateDataEntry && stateDataEntry.cost) {
                const displayCost = selectedDietPeriod === 'monthly' ? 
                    (stateDataEntry.cost * 30).toFixed(0) : 
                    stateDataEntry.cost.toFixed(2);
                const period = selectedDietPeriod === 'monthly' ? 'month' : 'day';
                tooltipContent = `<strong>${stateName}</strong><br/>Diet Cost: Rs ${displayCost}/${period}`;
            } else {
                tooltipContent = `<strong>${stateName}</strong><br/>No diet cost data`;
            }
            
            tooltip.html(tooltipContent)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function(d) {
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
    
    // Create legend inside the SVG
const legend = svg.append('g')
    .attr('class', 'map-legend-overlay')
    .attr('transform', `translate(20, ${height - 50})`);

// Legend background
legend.append('rect')
    .attr('width', 200)
    .attr('height', 35)
    .attr('fill', 'rgba(255, 255, 255, 0.95)')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 1)
    .attr('rx', 4);

// Legend title
legend.append('text')
    .attr('x', 100)
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('font-weight', 'bold')
    .attr('fill', '#0070CC')
    .text(`Diet Cost Range (Rs/${selectedDietPeriod === 'monthly' ? 'month' : 'day'})`);

// Calculate display values (same dynamic logic)
const minDisplay = selectedDietPeriod === 'monthly' ? (minCost * 30).toFixed(0) : minCost.toFixed(2);
const maxDisplay = selectedDietPeriod === 'monthly' ? (maxCost * 30).toFixed(0) : maxCost.toFixed(2);

// Min value
legend.append('text')
    .attr('x', 15)
    .attr('y', 30)
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .attr('fill', '#333')
    .text(`Rs ${minDisplay}`);

// Gradient bar
legend.append('rect')
    .attr('x', 65)
    .attr('y', 23)
    .attr('width', 70)
    .attr('height', 8)
    .attr('fill', 'url(#dietCostGradient)')
    .attr('stroke', '#333')
    .attr('stroke-width', 0.5);

// Max value
legend.append('text')
    .attr('x', 185)
    .attr('y', 30)
    .attr('text-anchor', 'end')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .attr('fill', '#333')
    .text(`Rs ${maxDisplay}`);

// Define gradient
const defs = svg.append('defs');
const gradient = defs.append('linearGradient')
    .attr('id', 'dietCostGradient')
    .attr('x1', '0%')
    .attr('x2', '100%');

gradient.append('stop').attr('offset', '0%').attr('stop-color', '#A9E1FF');
gradient.append('stop').attr('offset', '25%').attr('stop-color', '#88C3FF');
gradient.append('stop').attr('offset', '50%').attr('stop-color', '#67A6FF');
gradient.append('stop').attr('offset', '75%').attr('stop-color', '#428BEA');
gradient.append('stop').attr('offset', '100%').attr('stop-color', '#0070CC');
    
    // Update national statistics
    updateNationalDietStats(dietCostData);
}

function createDietCostLegend(minCost, maxCost) {
    const legendContainer = document.getElementById('dietMapLegend');
    if (!legendContainer) return;
    
    const minDisplay = selectedDietPeriod === 'monthly' ? (minCost * 30).toFixed(0) : minCost.toFixed(2);
    const maxDisplay = selectedDietPeriod === 'monthly' ? (maxCost * 30).toFixed(0) : maxCost.toFixed(2);
    const period = selectedDietPeriod === 'monthly' ? 'month' : 'day';
    
    const legendHTML = `
        <div class="legend-title">Diet Cost Range (Rs/${period})</div>
        <div class="legend-bar-container">
            <span class="legend-min">Rs ${minDisplay}</span>
            <div style="width: 120px; height: 10px; background: linear-gradient(to right, #A9E1FF, #88C3FF, #67A6FF, #428BEA, #0070CC); border: 1px solid #ccc; border-radius: 2px;"></div>
            <span class="legend-max">Rs ${maxDisplay}</span>
        </div>
    `;
    legendContainer.innerHTML = legendHTML;
}

function updateNationalDietStats(stateDietCosts) {
    if (!stateDietCosts || stateDietCosts.length === 0) return;
    
    const costs = stateDietCosts.map(s => s.cost);
    const nationalAvg = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    
    const sortedCosts = [...stateDietCosts].sort((a, b) => b.cost - a.cost);
    const highest = sortedCosts[0];
    const lowest = sortedCosts[sortedCosts.length - 1];
    
    // Update national statistics display
    const elements = {
        nationalAvgCost: document.getElementById('nationalAvgCost'),
        highestStateCost: document.getElementById('highestStateCost'),
        lowestStateCost: document.getElementById('lowestStateCost'),
        familyAvgCost: document.getElementById('familyAvgCost')
    };
    
    const period = selectedDietPeriod === 'monthly' ? 'month' : 'day';
    const multiplier = selectedDietPeriod === 'monthly' ? 30 : 1;
    
    if (elements.nationalAvgCost) {
        elements.nationalAvgCost.textContent = `Rs ${(nationalAvg * multiplier).toFixed(2)}/${period}`;
    }
    if (elements.highestStateCost) {
        elements.highestStateCost.textContent = `${highest.state}: Rs ${(highest.cost * multiplier).toFixed(2)}`;
    }
    if (elements.lowestStateCost) {
        elements.lowestStateCost.textContent = `${lowest.state}: Rs ${(lowest.cost * multiplier).toFixed(2)}`;
    }
    if (elements.familyAvgCost) {
        const familyCost = nationalAvg * 4 * multiplier;
        elements.familyAvgCost.textContent = `Rs ${familyCost.toFixed(2)}/${period}`;
      const dietDataDateElement = document.getElementById('dietDataDate');
    if (dietDataDateElement && stateData && stateData.length > 0) {
        const latestDate = new Date(Math.max(...stateData.map(d => d.Date.getTime())));
        const formattedDate = latestDate.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        dietDataDateElement.textContent = formattedDate;
    }
}
    }

function updateDietCostDisplay() {
    // This function can be used to update any additional diet cost displays
    // Currently, the main display is handled by updateNationalDietStats
    if (dietCostData && dietCostData.length > 0) {
        updateNationalDietStats(dietCostData);
    }
}

function getAveragePrice(priceMap, commodities) {
    const prices = commodities.map(commodity => priceMap[commodity] || 0).filter(price => price > 0);
    return prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
}

function getMapStateName(dataStateName) {
    return STATE_NAME_MAPPINGS[dataStateName] || dataStateName;
}

// Trends Section Functions

function setupTrendsControls() {
    const trendsGroup = document.getElementById('trendsGroup');
    const trendsCommodity = document.getElementById('trendsCommodity');
    const trendsAverageRange = document.getElementById('trendsAverageRange');
    const downloadTrendsChart = document.getElementById('downloadTrendsChart');
    const downloadTrendsData = document.getElementById('downloadTrendsData');
    
    if (!trendsGroup || !trendsCommodity || !trendsAverageRange) {
        console.warn('Trends controls not found');
        return;
    }
    
    // Group selection
    trendsGroup.addEventListener('change', function() {
        const selectedGroup = this.value;
        selectedTrendsGroup = selectedGroup;
        
        if (selectedGroup && COMMODITY_GROUPS[selectedGroup]) {
            const commodities = COMMODITY_GROUPS[selectedGroup];
            trendsCommodity.innerHTML = '<option value="">Select Commodity</option>' +
                commodities.map(commodity => `<option value="${commodity}">${commodity}</option>`).join('');
            trendsCommodity.disabled = false;
            trendsAverageRange.disabled = true;
        } else {
            trendsCommodity.innerHTML = '<option value="">Select Commodity</option>';
            trendsCommodity.disabled = true;
            trendsAverageRange.disabled = true;
        }
        
        trendsCommodity.value = '';
        selectedTrendsCommodity = '';
        hideTrendsChart();
    });
    
    // Commodity selection
    trendsCommodity.addEventListener('change', function() {
        selectedTrendsCommodity = this.value;
        if (this.value) {
            trendsAverageRange.disabled = false;
            updateTrendsChart();
        } else {
            trendsAverageRange.disabled = true;
            hideTrendsChart();
        }
    });
    
    // Average range selection
    trendsAverageRange.addEventListener('change', function() {
        selectedTrendsAverageRange = this.value;
        if (selectedTrendsCommodity) {
            updateTrendsChart();
        }
    });
    
    // Download controls
    if (downloadTrendsChart) {
        downloadTrendsChart.addEventListener('click', function() {
            downloadTrendsChartImage();
        });
    }
    
    if (downloadTrendsData) {
        downloadTrendsData.addEventListener('click', function() {
            downloadTrendsDataCSV();
        });
    }
}

function updateSummaryCards() {
    const latestData = getLatestData();
    const previousData = getPreviousData();
    const monthData = getMonthOverMonthData();
    const yearData = getYearOverYearData();
    
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
        const monthItem = monthData.find(p => p.Commodity === item.Commodity);
        const yearItem = yearData.find(p => p.Commodity === item.Commodity);
        
        // Daily change
        let dailyChange = '';
        if (prevItem) {
            const change = item.Price - prevItem.Price;
            if (Math.abs(change) >= 0.01) {
                const sign = change > 0 ? '+' : '';
                const arrow = change > 0 ? ' ↗️' : ' ↘️';
                dailyChange = `${sign}₹${change.toFixed(2)}${arrow}`;
            } else {
                dailyChange = '±₹0.00';
            }
        } else {
            dailyChange = '--';
        }
        
        // Monthly change
        let monthlyChange = '';
        if (monthItem) {
            const change = item.Price - monthItem.Price;
            if (Math.abs(change) >= 0.01) {
                const sign = change > 0 ? '+' : '';
                monthlyChange = `${sign}₹${change.toFixed(2)} (1M)`;
            } else {
                monthlyChange = '±₹0.00 (1M)';
            }
        } else {
            monthlyChange = '-- (1M)';
        }
        
        // Yearly change
        let yearlyChange = '';
        if (yearItem) {
            const change = item.Price - yearItem.Price;
            if (Math.abs(change) >= 0.01) {
                const sign = change > 0 ? '+' : '';
                yearlyChange = `${sign}₹${change.toFixed(2)} (1Y)`;
            } else {
                yearlyChange = '±₹0.00 (1Y)';
            }
        } else {
            yearlyChange = '-- (1Y)';
        }
        
        return `
            <div class="summary-card">
                <div class="commodity-name">${item.Commodity}</div>
                <div class="commodity-price">Rs ${item.Price.toFixed(2)}/kg</div>
                <div class="price-change ${dailyChange.includes('+') ? 'positive' : dailyChange.includes('-') ? 'negative' : ''}" style="font-size: 0.65rem;">
                    Daily: ${dailyChange}
                </div>
                <div class="price-change ${monthlyChange.includes('+') ? 'positive' : monthlyChange.includes('-') ? 'negative' : ''}" style="font-size: 0.65rem;">
                    ${monthlyChange}
                </div>
                <div class="price-change ${yearlyChange.includes('+') ? 'positive' : yearlyChange.includes('-') ? 'negative' : ''}" style="font-size: 0.65rem;">
                    ${yearlyChange}
                </div>
            </div>
        `;
    }).join('');
    
    summaryGrid.innerHTML = commodityCards;
}

function updateTrendsChart() {
    if (!selectedTrendsCommodity) {
        hideTrendsChart();
        return;
    }
    
    showTrendsChart();
    generateTrendsChart();
}

function showTrendsChart() {
    const chartSection = document.getElementById('trendsChartSection');
    const downloadBtn = document.getElementById('downloadTrendsChart');
    const downloadDataBtn = document.getElementById('downloadTrendsData');
    
    if (chartSection) chartSection.style.display = 'block';
    if (downloadBtn) downloadBtn.style.display = 'inline-flex';
    if (downloadDataBtn) downloadDataBtn.style.display = 'inline-flex';
}

function hideTrendsChart() {
    const chartSection = document.getElementById('trendsChartSection');
    const downloadBtn = document.getElementById('downloadTrendsChart');
    const downloadDataBtn = document.getElementById('downloadTrendsData');
    
    if (chartSection) chartSection.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (downloadDataBtn) downloadDataBtn.style.display = 'none';
    
    if (trendsChart) {
        trendsChart.destroy();
        trendsChart = null;
    }
}

function generateTrendsChart() {
    const canvas = document.getElementById('trendsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (trendsChart) {
        trendsChart.destroy();
        trendsChart = null;
    }
    
    // Update chart title
    const chartTitle = document.getElementById('trendsChartTitle');
    if (chartTitle) {
        const rangeText = selectedTrendsAverageRange === 'weekly' ? 'Weekly Average (7-Day Rolling)' : 'Monthly Average';
        chartTitle.textContent = `${selectedTrendsCommodity} - ${rangeText}`;
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
            logo.src = 'https://raw.githubusercontent.com/vijayjadhav01/commodity-dashboard/main/Logo.png';
        }
    };
    
    let chartData;
    if (selectedTrendsAverageRange === 'weekly') {
        chartData = calculateSingleCommodityWeeklyAverages(selectedTrendsCommodity);
    } else {
        chartData = calculateSingleCommodityMonthlyAverages(selectedTrendsCommodity);
    }
    
    if (chartData.length === 0) {
        console.warn('No data available for trends chart');
        return;
    }
    
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: selectedTrendsCommodity,
                data: chartData.map(d => ({ x: d.date, y: d.price })),
                borderColor: '#0070CC',
                backgroundColor: '#0070CC20',
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointRadius: 1,
                pointHoverRadius: 5
            }]
        },
        plugins: [logoPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: selectedTrendsAverageRange === 'weekly' ? 'month' : 'month',
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
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Price (Rs/kg)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            if (selectedTrendsAverageRange === 'weekly') {
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            } else {
                                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                            }
                        },
                        label: function(context) {
                            const avgType = selectedTrendsAverageRange === 'weekly' ? '7-day avg' : 'monthly avg';
                            return `${context.dataset.label}: Rs ${context.parsed.y.toFixed(2)}/kg (${avgType})`;
                        }
                    }
                }
            }
        }
    });
}

function calculateSingleCommodityMonthlyAverages(commodity) {
    let filteredData = rawData.filter(d => d.Commodity === commodity);
    
    const monthlyGroups = {};
    
    filteredData.forEach(item => {
        const monthKey = `${item.Date.getFullYear()}-${String(item.Date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyGroups[monthKey]) {
            monthlyGroups[monthKey] = {
                date: new Date(item.Date.getFullYear(), item.Date.getMonth(), 1),
                prices: []
            };
        }
        
        monthlyGroups[monthKey].prices.push(item.Price);
    });
    
    return Object.keys(monthlyGroups)
        .sort()
        .map(monthKey => {
            const monthGroup = monthlyGroups[monthKey];
            const avgPrice = monthGroup.prices.reduce((sum, price) => sum + price, 0) / monthGroup.prices.length;
            
            return {
                date: monthGroup.date,
                price: avgPrice
            };
        });
}

function calculateSingleCommodityWeeklyAverages(commodity) {
    let filteredData = rawData.filter(d => d.Commodity === commodity);
    
    filteredData.sort((a, b) => a.Date - b.Date);
    
    const uniqueDates = [...new Set(filteredData.map(d => d.Date.getTime()))]
        .sort((a, b) => a - b)
        .map(timestamp => new Date(timestamp));
    
    const rollingData = [];
    
    uniqueDates.forEach((currentDate, index) => {
        if (index >= 6) {
            const sevenDayPrices = [];
            
            for (let i = 6; i >= 0; i--) {
                const targetDate = uniqueDates[index - i];
                const dayData = filteredData.filter(d => d.Date.getTime() === targetDate.getTime());
                
                if (dayData.length > 0) {
                    const avgPrice = dayData.reduce((sum, d) => sum + d.Price, 0) / dayData.length;
                    sevenDayPrices.push(avgPrice);
                }
            }
            
            if (sevenDayPrices.length > 0) {
                const rollingAvg = sevenDayPrices.reduce((sum, price) => sum + price, 0) / sevenDayPrices.length;
                rollingData.push({
                    date: currentDate,
                    price: rollingAvg
                });
            }
        }
    });
    
    return rollingData;
}

function downloadTrendsChartImage() {
    if (trendsChart) {
        const originalCanvas = trendsChart.canvas;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        const padding = 40;
        tempCanvas.width = originalCanvas.width + (padding * 2);
        tempCanvas.height = originalCanvas.height + (padding * 2);
        
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        tempCtx.drawImage(originalCanvas, padding, padding);
        
        const commodity = selectedTrendsCommodity.replace(/[^a-zA-Z0-9]/g, '');
        const range = selectedTrendsAverageRange;
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `trends-${commodity}-${range}-${dateStr}.jpg`;
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
        link.click();
    }
}

function downloadTrendsDataCSV() {
    if (!selectedTrendsCommodity) {
        alert('Please select a commodity first');
        return;
    }
    
    let chartData;
    if (selectedTrendsAverageRange === 'weekly') {
        chartData = calculateSingleCommodityWeeklyAverages(selectedTrendsCommodity);
    } else {
        chartData = calculateSingleCommodityMonthlyAverages(selectedTrendsCommodity);
    }
    
    if (chartData.length === 0) {
        alert('No data available for download');
        return;
    }
    
    const csvHeader = 'Date,Commodity,AverageType,Price\n';
    const csvContent = chartData.map(item => {
        const dateStr = item.date.toISOString().split('T')[0];
        const avgType = selectedTrendsAverageRange === 'weekly' ? '7-Day Rolling' : 'Monthly';
        return `${dateStr},${selectedTrendsCommodity},${avgType},${item.price.toFixed(2)}`;
    }).join('\n');
    
    const fullCsv = csvHeader + csvContent;
    
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const commodity = selectedTrendsCommodity.replace(/[^a-zA-Z0-9]/g, '');
    const range = selectedTrendsAverageRange;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `trends-data-${commodity}-${range}-${dateStr}.csv`;
    
    link.href = url;
    link.click();
    
    window.URL.revokeObjectURL(url);
}

// State Map Section Functions

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
            updateTopStatesContext();
        }
    });
    
    monthlyMapYear.addEventListener('change', function() {
        if (monthlyMapGroup.value && monthlyMapCommodity.value) {
            monthlyMapSearch.disabled = false;
            updateTopStatesContext();
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
        resetTopStates();
    });
    
    monthlyMapCommodity.addEventListener('change', function() {
        monthlyMapSearch.disabled = !this.value;
        if (this.value) {
            updateTopStatesContext();
        } else {
            resetTopStates();
        }
    });
    
    monthlyMapSearch.addEventListener('click', function() {
        const selectedMonth = monthlyMapMonth.value;
        const selectedYear = parseInt(monthlyMapYear.value);
        const selectedGroup = monthlyMapGroup.value;
        const selectedCommodity = monthlyMapCommodity.value;
        
        if (selectedMonth && selectedYear && selectedGroup && selectedCommodity) {
            generateMonthlyIndiaMap(selectedGroup, selectedCommodity, selectedMonth, selectedYear);
            updateTopStatesFromMonthlyData(selectedCommodity, selectedMonth, selectedYear);
        }
    });
}

function updateTopStatesFromMonthlyData(commodity, month, year) {
    if (!monthlyAverageData || monthlyAverageData.length === 0) {
        document.getElementById('highPricesList').innerHTML = '<div class="states-loading">No monthly data available</div>';
        document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">No monthly data available</div>';
        return;
    }

    const commodityMonthlyData = monthlyAverageData.filter(d => 
        d.Commodity === commodity && 
        d.Month === month && 
        d.Year === year
    );

    if (commodityMonthlyData.length === 0) {
        document.getElementById('highPricesList').innerHTML = '<div class="states-loading">No data available for selected commodity/period</div>';
        document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">No data available for selected commodity/period</div>';
        return;
    }

    const sortedStates = [...commodityMonthlyData].sort((a, b) => b.Value - a.Value);
    
    const top5High = sortedStates.slice(0, 5);
    const highPricesHTML = top5High.map((state, index) => `
        <div class="state-item">
            <span class="state-rank">${index + 1}.</span>
            <span class="state-name">${state.State}</span>
            <span class="state-price">Rs ${state.Value.toFixed(2)}</span>
        </div>
    `).join('');

    const top5Low = sortedStates.slice(-5).reverse();
    const lowPricesHTML = top5Low.map((state, index) => `
        <div class="state-item">
            <span class="state-rank">${index + 1}.</span>
            <span class="state-name">${state.State}</span>
            <span class="state-price">Rs ${state.Value.toFixed(2)}</span>
        </div>
    `).join('');

    document.getElementById('highPricesList').innerHTML = highPricesHTML;
    document.getElementById('lowPricesList').innerHTML = lowPricesHTML;
    
    // Update subtitles with context
    updateTopStatesContext();
}

function updateTopStatesContext() {
    const monthlyMapMonth = document.getElementById('monthlyMapMonth');
    const monthlyMapYear = document.getElementById('monthlyMapYear');
    const monthlyMapCommodity = document.getElementById('monthlyMapCommodity');
    
    const highPricesSubtitle = document.getElementById('highPricesSubtitle');
    const lowPricesSubtitle = document.getElementById('lowPricesSubtitle');
    
    if (monthlyMapCommodity && monthlyMapCommodity.value && 
        monthlyMapMonth && monthlyMapYear) {
        
        const contextText = `${monthlyMapCommodity.value} - ${monthlyMapMonth.value} ${monthlyMapYear.value}`;
        
        if (highPricesSubtitle) highPricesSubtitle.textContent = contextText;
        if (lowPricesSubtitle) lowPricesSubtitle.textContent = contextText;
    }
}

function resetTopStates() {
    document.getElementById('highPricesList').innerHTML = '<div class="states-loading">Select commodity to view data</div>';
    document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">Select commodity to view data</div>';
    
    const highPricesSubtitle = document.getElementById('highPricesSubtitle');
    const lowPricesSubtitle = document.getElementById('lowPricesSubtitle');
    
    if (highPricesSubtitle) highPricesSubtitle.textContent = 'Select commodity to view data';
    if (lowPricesSubtitle) lowPricesSubtitle.textContent = 'Select commodity to view data';
}

function generateMonthlyIndiaMap(group, commodity, month, year) {
    const mapContainer = document.getElementById('monthlyIndiaMap');
    if (!mapContainer) return;
    
    if (typeof d3 === 'undefined' || !window.d3Loaded) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Map Library Not Available</h4>
                <p>D3.js library failed to load. Map functionality is temporarily disabled.</p>
            </div>
        `;
        return;
    }
    
    if (!mapData) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Map Data Not Available</h4>
                <p>Unable to load India map data.</p>
            </div>
        `;
        return;
    }
    
    if (!monthlyAverageData || monthlyAverageData.length === 0) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Monthly Data Not Available</h4>
                <p>Unable to load monthly average data from the data source.</p>
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
                    updateTopStatesFromMonthlyData('Rice', month, year);
                }, 200);
            }
        }, 200);
    }
    
    console.log(`Monthly map initialized with defaults: ${month} ${year}, Rice`);
}

function refreshCurrentMap() {
    const monthlyMapMonth = document.getElementById('monthlyMapMonth');
    const monthlyMapYear = document.getElementById('monthlyMapYear');
    const monthlyMapGroup = document.getElementById('monthlyMapGroup');
    const monthlyMapCommodity = document.getElementById('monthlyMapCommodity');
    
    if (monthlyMapCommodity && monthlyMapCommodity.value && 
        monthlyMapMonth && monthlyMapYear && monthlyMapGroup) {
        generateMonthlyIndiaMap(
            monthlyMapGroup.value, 
            monthlyMapCommodity.value, 
            monthlyMapMonth.value, 
            parseInt(monthlyMapYear.value)
        );
        updateTopStatesFromMonthlyData(
            monthlyMapCommodity.value, 
            monthlyMapMonth.value, 
            parseInt(monthlyMapYear.value)
        );
    }
}

function setupMapControls() {
    // This function is maintained for backwards compatibility
    // but daily map functionality has been removed from the state map section
    console.log('Daily map controls are no longer used in the restructured dashboard');
}

function populateDateFilter() {
    // This function is maintained for backwards compatibility
    // but daily date filter is no longer used in the state map section
    console.log('Daily date filter is no longer used in the restructured dashboard');
}

// State Map Section Functions

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
            updateTopStatesContext();
        }
    });
    
    monthlyMapYear.addEventListener('change', function() {
        if (monthlyMapGroup.value && monthlyMapCommodity.value) {
            monthlyMapSearch.disabled = false;
            updateTopStatesContext();
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
        resetTopStates();
    });
    
    monthlyMapCommodity.addEventListener('change', function() {
        monthlyMapSearch.disabled = !this.value;
        if (this.value) {
            updateTopStatesContext();
        } else {
            resetTopStates();
        }
    });
    
    monthlyMapSearch.addEventListener('click', function() {
        const selectedMonth = monthlyMapMonth.value;
        const selectedYear = parseInt(monthlyMapYear.value);
        const selectedGroup = monthlyMapGroup.value;
        const selectedCommodity = monthlyMapCommodity.value;
        
        if (selectedMonth && selectedYear && selectedGroup && selectedCommodity) {
            generateMonthlyIndiaMap(selectedGroup, selectedCommodity, selectedMonth, selectedYear);
            updateTopStatesFromMonthlyData(selectedCommodity, selectedMonth, selectedYear);
        }
    });
}

function updateTopStatesFromMonthlyData(commodity, month, year) {
    if (!monthlyAverageData || monthlyAverageData.length === 0) {
        document.getElementById('highPricesList').innerHTML = '<div class="states-loading">No monthly data available</div>';
        document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">No monthly data available</div>';
        return;
    }

    const commodityMonthlyData = monthlyAverageData.filter(d => 
        d.Commodity === commodity && 
        d.Month === month && 
        d.Year === year
    );

    if (commodityMonthlyData.length === 0) {
        document.getElementById('highPricesList').innerHTML = '<div class="states-loading">No data available for selected commodity/period</div>';
        document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">No data available for selected commodity/period</div>';
        return;
    }

    const sortedStates = [...commodityMonthlyData].sort((a, b) => b.Value - a.Value);
    
    const top5High = sortedStates.slice(0, 5);
    const highPricesHTML = top5High.map((state, index) => `
        <div class="state-item">
            <span class="state-rank">${index + 1}.</span>
            <span class="state-name">${state.State}</span>
            <span class="state-price">Rs ${state.Value.toFixed(2)}</span>
        </div>
    `).join('');

    const top5Low = sortedStates.slice(-5).reverse();
    const lowPricesHTML = top5Low.map((state, index) => `
        <div class="state-item">
            <span class="state-rank">${index + 1}.</span>
            <span class="state-name">${state.State}</span>
            <span class="state-price">Rs ${state.Value.toFixed(2)}</span>
        </div>
    `).join('');

    document.getElementById('highPricesList').innerHTML = highPricesHTML;
    document.getElementById('lowPricesList').innerHTML = lowPricesHTML;
    
    // Update subtitles with context
    updateTopStatesContext();
}

function updateTopStatesContext() {
    const monthlyMapMonth = document.getElementById('monthlyMapMonth');
    const monthlyMapYear = document.getElementById('monthlyMapYear');
    const monthlyMapCommodity = document.getElementById('monthlyMapCommodity');
    
    const highPricesSubtitle = document.getElementById('highPricesSubtitle');
    const lowPricesSubtitle = document.getElementById('lowPricesSubtitle');
    
    if (monthlyMapCommodity && monthlyMapCommodity.value && 
        monthlyMapMonth && monthlyMapYear) {
        
        const contextText = `${monthlyMapCommodity.value} - ${monthlyMapMonth.value} ${monthlyMapYear.value}`;
        
        if (highPricesSubtitle) highPricesSubtitle.textContent = contextText;
        if (lowPricesSubtitle) lowPricesSubtitle.textContent = contextText;
    }
}

function resetTopStates() {
    document.getElementById('highPricesList').innerHTML = '<div class="states-loading">Select commodity to view data</div>';
    document.getElementById('lowPricesList').innerHTML = '<div class="states-loading">Select commodity to view data</div>';
    
    const highPricesSubtitle = document.getElementById('highPricesSubtitle');
    const lowPricesSubtitle = document.getElementById('lowPricesSubtitle');
    
    if (highPricesSubtitle) highPricesSubtitle.textContent = 'Select commodity to view data';
    if (lowPricesSubtitle) lowPricesSubtitle.textContent = 'Select commodity to view data';
}

function generateMonthlyIndiaMap(group, commodity, month, year) {
    const mapContainer = document.getElementById('monthlyIndiaMap');
    if (!mapContainer) return;
    
    if (typeof d3 === 'undefined' || !window.d3Loaded) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Map Library Not Available</h4>
                <p>D3.js library failed to load. Map functionality is temporarily disabled.</p>
            </div>
        `;
        return;
    }
    
    if (!mapData) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Map Data Not Available</h4>
                <p>Unable to load India map data.</p>
            </div>
        `;
        return;
    }
    
    if (!monthlyAverageData || monthlyAverageData.length === 0) {
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 40px;">
                <h4>Monthly Data Not Available</h4>
                <p>Unable to load monthly average data from the data source.</p>
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
                    updateTopStatesFromMonthlyData('Rice', month, year);
                }, 200);
            }
        }, 200);
    }
    
    console.log(`Monthly map initialized with defaults: ${month} ${year}, Rice`);
}

function setupMapControls() {
    // This function is maintained for backwards compatibility
    // but daily map functionality has been removed from the state map section
    console.log('Daily map controls are no longer used in the restructured dashboard');
}

function populateDateFilter() {
    // This function is maintained for backwards compatibility
    // but daily date filter is no longer used in the state map section
    console.log('Daily date filter is no longer used in the restructured dashboard');
}

// Diet Trends and Chart Functions

function setupDietTrendsControls() {
    const familySizeButtons = document.querySelectorAll('.family-size-btn');
    const downloadDietChart = document.getElementById('downloadDietChart');

    familySizeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            familySizeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedFamilySize = parseInt(this.dataset.size);
            updateNationalDietChart();
        });
    });

    if (downloadDietChart) {
        downloadDietChart.addEventListener('click', function() {
            downloadDietChartImage();
        });
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
    
    const nationalData = calculateNationalDietCosts('3years', selectedFamilySize);
    
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

function calculateNationalDietCosts(rangeKey, familySize) {
    if (rawData.length === 0) return [];
    
    const filteredData = filterDataByDateRange(rawData, rangeKey);
    if (filteredData.length === 0) return [];
    
    const monthlyGroups = {};
    
    filteredData.forEach(item => {
        const monthKey = `${item.Date.getFullYear()}-${String(item.Date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = item.Date.toLocaleDateString('en-US', { 
    month: 'short', 
    year: rangeKey === 'all' || rangeKey === '6years' || rangeKey === '3years' ? 'numeric' : undefined 
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

function downloadDietChartImage() {
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
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `diet-trends-${familySize}-3years-${dateStr}.jpg`;
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
        link.click();
    }
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

function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

// Event Listeners and Helper Functions

function setupEventListeners() {
    // Set up general event listeners for the dashboard
    document.addEventListener('change', function(e) {
        // Handle any remaining checkbox changes for backwards compatibility
        if (e.target.classList.contains('commodity-checkbox-input')) {
            updateSelectedCommodities();
            updateChart();
        }
    });
    
    // Handle any remaining date filter buttons for backwards compatibility
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
    
    // Handle group tabs for backwards compatibility
    document.querySelectorAll('.group-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const group = this.dataset.group;
            selectGroup(group);
        });
    });
}

// Backwards compatibility functions for old trends system
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
    // Backwards compatibility function for old chart system
    const chartSection = document.getElementById('chartSection');
    const combinedAveragesSection = document.getElementById('combinedAveragesSection');
    
    if (selectedCommodities.length === 0) {
        if (chartSection) chartSection.style.display = 'none';
        if (combinedAveragesSection) combinedAveragesSection.style.display = 'none';
        return;
    }
    
    if (chartSection) chartSection.style.display = 'block';
    if (combinedAveragesSection) combinedAveragesSection.style.display = 'block';
    generateChart();
}

function generateChart() {
    // Backwards compatibility function - this would generate the old multi-commodity chart
    console.log('Old chart generation function - replaced by new trends system');
}

// Utility functions for map state name handling
function getMapStateName(dataStateName) {
    return STATE_NAME_MAPPINGS[dataStateName] || dataStateName;
}

// Helper function to calculate price changes for summary cards
function calculatePriceChange(currentPrice, previousPrice) {
    if (!previousPrice || previousPrice === 0) return null;
    
    const change = currentPrice - previousPrice;
    const percentChange = (change / previousPrice) * 100;
    
    return {
        absolute: change,
        percent: percentChange,
        direction: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable'
    };
}

// Helper function for date formatting
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    return date.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
}

// Helper function for price formatting
function formatPrice(price, decimals = 2) {
    return `Rs ${price.toFixed(decimals)}`;
}

// Helper function for percentage formatting
function formatPercentage(percent, decimals = 1) {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(decimals)}%`;
}

// Helper function to get commodity group for a commodity
function getCommodityGroup(commodity) {
    for (const [group, commodities] of Object.entries(COMMODITY_GROUPS)) {
        if (commodities.includes(commodity)) {
            return group;
        }
    }
    return null;
}

// Helper function to validate date ranges
function isValidDateRange(startDate, endDate) {
    return startDate instanceof Date && 
           endDate instanceof Date && 
           !isNaN(startDate.getTime()) && 
           !isNaN(endDate.getTime()) && 
           startDate <= endDate;
}

// Helper function to get date range text
function getDateRangeText(days) {
    if (days <= 30) return 'Last Month';
    if (days <= 90) return 'Last 3 Months';
    if (days <= 180) return 'Last 6 Months';
    if (days <= 365) return 'Last Year';
    return 'All Time';
}

// Helper function to debounce function calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Helper function to throttle function calls
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Helper function to check if data is stale
function isDataStale(lastUpdate, thresholdHours = 24) {
    if (!lastUpdate) return true;
    
    const now = new Date();
    const threshold = thresholdHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    return (now - lastUpdate) > threshold;
}

// Helper function to generate unique IDs
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to safely get nested object properties
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Helper function to group array items by property
function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        groups[groupKey] = groups[groupKey] || [];
        groups[groupKey].push(item);
        return groups;
    }, {});
}

// Helper function to sort array of objects by multiple properties
function multiSort(array, sortKeys) {
    return array.sort((a, b) => {
        for (const key of sortKeys) {
            const direction = key.startsWith('-') ? -1 : 1;
            const prop = key.replace(/^-/, '');
            
            if (a[prop] < b[prop]) return -1 * direction;
            if (a[prop] > b[prop]) return 1 * direction;
        }
        return 0;
    });
}

// Helper function to calculate statistics for an array of numbers
function calculateStats(numbers) {
    if (!numbers || numbers.length === 0) return null;
    
    const sorted = numbers.slice().sort((a, b) => a - b);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;
    
    return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: mean,
        median: sorted.length % 2 === 0 
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)],
        sum: sum,
        count: numbers.length
    };
}

// Helper function to format large numbers
function formatLargeNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function updateDietDataDate() {
    const dietDataDateElement = document.getElementById('dietDataDate');
    if (dietDataDateElement) {
        if (stateData && stateData.length > 0) {
            const latestDate = new Date(Math.max(...stateData.map(d => d.Date.getTime())));
            const formattedDate = latestDate.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            dietDataDateElement.textContent = formattedDate;
        } else {
            dietDataDateElement.textContent = 'Loading...';
        }
    }
}

// Error handling helper
function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    // You could extend this to send error reports to a logging service
    const errorMessage = error.message || 'An unexpected error occurred';
    
    // Show user-friendly error message
    if (context) {
        showError(`${context}: ${errorMessage}`);
    } else {
        showError(errorMessage);
    }
}

// Initialize error boundary for uncaught errors
window.addEventListener('error', function(event) {
    handleError(event.error, 'Uncaught Error');
});

window.addEventListener('unhandledrejection', function(event) {
    handleError(event.reason, 'Unhandled Promise Rejection');
});

// Performance monitoring helper
function measurePerformance(name, fn) {
    return async function(...args) {
        const startTime = performance.now();
        try {
            const result = await fn.apply(this, args);
            const endTime = performance.now();
            console.log(`${name} took ${endTime - startTime} milliseconds`);
            return result;
        } catch (error) {
            const endTime = performance.now();
            console.log(`${name} failed after ${endTime - startTime} milliseconds`);
            throw error;
        }
    };
}

// Final Setup and Initialization Functions

// DOM Content Loaded Event Handler
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all dashboard components
    initializeDashboard();
    
    // Set up global error handling
    setupErrorHandling();
    
    // Set up performance monitoring for key functions
    setupPerformanceMonitoring();
    
    console.log('Dashboard initialization completed');
});

// Setup error handling for the application
function setupErrorHandling() {
    // Handle chart.js errors
    Chart.defaults.plugins.tooltip.enabled = true;
    Chart.defaults.plugins.tooltip.displayColors = false;
    
    // Handle D3.js errors
    if (typeof d3 !== 'undefined') {
        d3.select('body').on('error', function(error) {
            console.error('D3.js error:', error);
        });
    }
}

// Setup performance monitoring
function setupPerformanceMonitoring() {
    // Wrap key functions with performance monitoring
    if (typeof performance !== 'undefined' && performance.mark) {
        const originalGenerateDietCostMap = generateDietCostMap;
        generateDietCostMap = measurePerformance('generateDietCostMap', originalGenerateDietCostMap);
        
        const originalUpdateSummaryCards = updateSummaryCards;
        updateSummaryCards = measurePerformance('updateSummaryCards', originalUpdateSummaryCards);
        
        const originalGenerateMonthlyIndiaMap = generateMonthlyIndiaMap;
        generateMonthlyIndiaMap = measurePerformance('generateMonthlyIndiaMap', originalGenerateMonthlyIndiaMap);
    }
}

// Data refresh functionality
function refreshDashboardData() {
    showLoading('Refreshing data...');
    
    return Promise.all([
        loadMainData(),
        loadStateData(),
        loadMonthlyAverageData()
    ]).then(() => {
        // Update all sections with new data
        updateSummaryCards();
        generateDietCostMap();
        updateNationalDietChart();
        
        // Refresh current section if it needs data
        handleSectionSwitch(currentSection);
        
        hideLoading();
        console.log('Dashboard data refreshed successfully');
    }).catch(error => {
        hideLoading();
        handleError(error, 'Data Refresh');
    });
}

// Check for data updates periodically
function startDataRefreshInterval() {
    // Refresh data every 30 minutes
    setInterval(() => {
        if (!document.hidden) { // Only refresh if page is visible
            refreshDashboardData();
        }
    }, 30 * 60 * 1000);
}

// Handle page visibility changes
function setupPageVisibilityHandling() {
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Check if data is stale when page becomes visible
            const lastRefresh = localStorage.getItem('lastDataRefresh');
            if (!lastRefresh || isDataStale(new Date(lastRefresh), 1)) {
                refreshDashboardData().then(() => {
                    localStorage.setItem('lastDataRefresh', new Date().toISOString());
                });
            }
        }
    });
}

// Export functions for potential use in browser console debugging
window.dashboardDebug = {
    refreshData: refreshDashboardData,
    getCurrentSection: () => currentSection,
    getRawData: () => rawData,
    getStateData: () => stateData,
    getMonthlyData: () => monthlyAverageData,
    switchToSection: switchSection,
    generateDietMap: generateDietCostMap,
    updatePrices: updateSummaryCards
};

// Cleanup function for when page is unloaded
function cleanup() {
    // Destroy all chart instances
    if (commodityChart) commodityChart.destroy();
    if (monthlyChart) monthlyChart.destroy();
    if (weeklyChart) weeklyChart.destroy();
    if (nationalDietChart) nationalDietChart.destroy();
    if (trendsChart) trendsChart.destroy();
    if (regionalChart) regionalChart.destroy();
    
    // Remove event listeners to prevent memory leaks
    document.removeEventListener('visibilitychange', setupPageVisibilityHandling);
    
    // Clear any running intervals
    clearInterval(window.dataRefreshInterval);
}

// Setup cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Enhanced initialization for specific sections
function initializeSection(sectionName) {
    switch(sectionName) {
        case 'diet-calculator':
            initializeDietSection();
            break;
        case 'state-map':
            initializeMonthlyMapDefaults();
            break;
        case 'trends':
            updateSummaryCards();
            break;
        default:
            console.log(`No specific initialization for section: ${sectionName}`);
    }
}

// Validate data integrity
function validateData() {
    const validations = [];
    
    // Validate raw data
    if (!rawData || rawData.length === 0) {
        validations.push('Raw commodity data is missing or empty');
    }
    
    // Validate state data
    if (!stateData || stateData.length === 0) {
        validations.push('State-wise data is missing - some features may not work');
    }
    
    // Validate monthly data
    if (!monthlyAverageData || monthlyAverageData.length === 0) {
        validations.push('Monthly average data is missing - some features may not work');
    }
    
    // Validate map data
    if (!mapData) {
        validations.push('Map data is missing - maps will not render');
    }
    
    // Check for recent data
    if (rawData && rawData.length > 0) {
        const latestDate = new Date(Math.max(...rawData.map(d => d.Date.getTime())));
        const daysSinceUpdate = (new Date() - latestDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 7) {
            validations.push(`Data is ${Math.floor(daysSinceUpdate)} days old - may not reflect current prices`);
        }
    }
    
    if (validations.length > 0) {
        console.warn('Data validation issues:', validations);
        return false;
    }
    
    return true;
}

// Enhanced error reporting
function reportError(error, context, additionalInfo = {}) {
    const errorReport = {
        message: error.message || 'Unknown error',
        context: context || 'Unknown context',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        stack: error.stack,
        additionalInfo
    };
    
    console.error('Error Report:', errorReport);
    
    // You could send this to an error tracking service
    // Example: sendToErrorTrackingService(errorReport);
}

// Feature detection and fallbacks
function checkFeatureSupport() {
    const features = {
        d3: typeof d3 !== 'undefined',
        chart: typeof Chart !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        localStorage: typeof localStorage !== 'undefined',
        canvas: !!document.createElement('canvas').getContext,
        svg: !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect
    };
    
    const unsupported = Object.entries(features)
        .filter(([feature, supported]) => !supported)
        .map(([feature]) => feature);
    
    if (unsupported.length > 0) {
        console.warn('Unsupported features:', unsupported);
        showError(`Some features may not work properly. Unsupported: ${unsupported.join(', ')}`);
    }
    
    return features;
}

// Initialize with feature detection
async function enhancedInitialization() {
    try {
        // Check feature support
        const features = checkFeatureSupport();
        
        if (!features.fetch) {
            throw new Error('Fetch API not supported - dashboard cannot load data');
        }
        
        // Initialize dashboard
        await initializeDashboard();
        
        // Validate loaded data
        const dataValid = validateData();
        if (!dataValid) {
            console.warn('Data validation failed - some features may not work correctly');
        }
        
        // Setup additional features if supported
        if (features.localStorage) {
            setupPageVisibilityHandling();
            startDataRefreshInterval();
        }
        
        console.log('Enhanced initialization completed successfully');
        
    } catch (error) {
        reportError(error, 'Enhanced Initialization');
        showError('Dashboard initialization failed. Please refresh the page.');
    }
}

// Browser compatibility checks
function checkBrowserCompatibility() {
    const minVersions = {
        chrome: 60,
        firefox: 55,
        safari: 12,
        edge: 79
    };
    
    // Basic ES6 feature check
    try {
        eval('const test = () => {}; class Test {}');
    } catch (e) {
        showError('Your browser does not support modern JavaScript features required for this dashboard.');
        return false;
    }
    
    return true;
}

// Final initialization call
if (checkBrowserCompatibility()) {
    document.addEventListener('DOMContentLoaded', enhancedInitialization);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        showError('Browser compatibility issue detected. Please use a modern browser.');
    });
}

// Service worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
        console.log('Service Worker registered successfully:', registration.scope);
    }).catch(function(error) {
        console.log('Service Worker registration failed:', error);
    });
}

// Accessibility enhancements
function enhanceAccessibility() {
    // Add ARIA labels to charts
    document.querySelectorAll('canvas').forEach(canvas => {
        if (!canvas.getAttribute('aria-label')) {
            canvas.setAttribute('aria-label', 'Interactive chart showing commodity price data');
            canvas.setAttribute('role', 'img');
        }
    });
    
    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-navigation');
    });
}

// Initialize accessibility enhancements
document.addEventListener('DOMContentLoaded', enhanceAccessibility);

// Export for debugging and testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeDashboard,
        refreshDashboardData,
        validateData,
        checkFeatureSupport,
        dashboardDebug: window.dashboardDebug
    };
}
