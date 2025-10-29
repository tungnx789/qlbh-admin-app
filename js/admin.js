// QLBH Admin App JavaScript
class QLBHAdmin {
    constructor() {
        // ✅ CHECK AUTHENTICATION FIRST
        this.checkAuth();
        
        this.currentModule = 'dashboard';
        this.currentPage = 1;
        this.pageSize = 50;  // Default 50 for Nhập Hàng (can be overridden per module)
        this.filters = {};
        this.data = {};
        
        // Cache system for all tabs
        this.cacheData = {
            dashboard: { data: null, lastUpdate: null },
            tonkho: { data: null, lastUpdate: null },
            nhaphang: { data: null, lastUpdate: null },
            banhang: { data: null, lastUpdate: null },
            xuathuy: { data: null, lastUpdate: null },
            search: { data: null, lastUpdate: null },
            baocao: { data: null, lastUpdate: null },
            topproducts: { data: null, lastUpdate: null }
        };
        
        // Disable cache for development - set to false for production
        this.DISABLE_CACHE = false;
        
        this.init();
    }
    
    checkAuth() {
        // Check if user is logged in
        const adminEmail = localStorage.getItem('adminEmail');
        const adminToken = localStorage.getItem('adminToken');
        const expiresAt = parseInt(localStorage.getItem('adminExpiresAt') || '0', 10);
        
        // Allow access to login page without auth
        const currentPath = window.location.pathname;
        if (currentPath.includes('login.html')) {
            return;
        }
        
        // Check if session exists
        if (!adminEmail || !adminToken) {
            // Not logged in, redirect to login page
            console.log('Not authenticated, redirecting to login...');
            window.location.href = 'login.html';
            return;
        }
        
        // Check if session has expired (7 days)
        const now = Date.now();
        if (expiresAt === 0 || now > expiresAt) {
            // Session expired, clear storage and redirect
            console.log('Session expired, redirecting to login...');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminExpiresAt');
            localStorage.removeItem('adminLoginTime');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('User authenticated:', adminEmail);
        
        // Update user email in header
        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) {
            userEmailEl.textContent = adminEmail;
        }
    }
    
    logout() {
        // Clear all auth data
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminExpiresAt');
        localStorage.removeItem('adminLoginTime');
        
        // Redirect to login
        window.location.href = 'login.html';
    }

    init() {
        this.setupEventListeners();
        this.initRouting();
        this.setupCharts(); // ✅ Khởi tạo đồ thị ngay từ đầu
        // DON'T auto-load dashboard - wait for user to click refresh button
        console.log('init - App initialized - Charts setup, no auto-load');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const module = e.currentTarget.dataset.module;
                if (module) {
                    // Use hash navigation instead of direct switch
                    window.location.hash = module;
                }
            });
        });

        // Search inputs
        document.getElementById('searchTonKho')?.addEventListener('input', 
            this.debounce(() => this.applyTonKhoFilters(), 500));
        document.getElementById('searchNhapHang')?.addEventListener('input', 
            this.debounce(() => this.applyNhapHangFilters(), 500));
        document.getElementById('imeiSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchIMEI();
        });
        
        // Removed auto-load on input change - user must click button
    }

    initRouting() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash && hash !== this.currentModule) {
                this.switchModule(hash);
            }
        });
        
        // Set initial route
        const hash = window.location.hash.substring(1);
        if (hash) {
            this.switchModule(hash);
        }
    }

    switchModule(moduleName) {
        // Update URL hash
        window.location.hash = moduleName;
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleName}"]`).classList.add('active');
        
        // Update modules
        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });
        document.getElementById(moduleName).classList.add('active');
        
        this.currentModule = moduleName;
        this.currentPage = 1;
        
        // Set page size based on module
        if (moduleName === 'tonkho' || moduleName === 'nhaphang') {
            this.pageSize = 50;
            // Update the select element to reflect this
            const selectElement = document.getElementById(`${moduleName}PageSize`);
            if (selectElement) {
                selectElement.value = '50';
            }
        }
        
        // DON'T auto-load data - wait for user to click refresh button
        console.log('switchModule - Switched to:', moduleName, '- No auto-load');
    }

    // Cache Methods with localStorage persistence
    getCacheData(module) {
        // Skip cache if disabled
        if (this.DISABLE_CACHE) {
            return { data: null, lastUpdate: null };
        }
        
        // Try memory first
        if (this.cacheData[module].data) {
            return this.cacheData[module];
        }
        
        // Try localStorage
        try {
            const cached = localStorage.getItem(`qlbh_cache_${module}`);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                this.cacheData[module] = parsedCache;
                return parsedCache;
            }
        } catch (e) {
            console.warn('Error reading cache from localStorage:', e);
        }
        
        return { data: null, lastUpdate: null };
    }
    
    setCacheData(module, data) {
        const cacheData = {
            data: data,
            lastUpdate: new Date().toLocaleString('vi-VN')
        };
        
        this.cacheData[module] = cacheData;
        
        // Save to localStorage
        try {
            localStorage.setItem(`qlbh_cache_${module}`, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('Error saving cache to localStorage:', e);
        }
    }
    
    clearCache(module) {
        this.cacheData[module] = { data: null, lastUpdate: null };
        
        // Remove from localStorage
        try {
            localStorage.removeItem(`qlbh_cache_${module}`);
        } catch (e) {
            console.warn('Error removing cache from localStorage:', e);
        }
    }
    
    updateLastUpdateTime(module) {
        const lastUpdateElement = document.getElementById(`${module}LastUpdate`);
        if (lastUpdateElement && this.cacheData[module].lastUpdate) {
            lastUpdateElement.textContent = `Cập nhật lần cuối: ${this.cacheData[module].lastUpdate}`;
        }
    }
    
    // Refresh Methods
    async refreshDashboard() {
        this.clearCache('dashboard');
        await this.loadDashboard();
    }
    
    async refreshTonKho() {
        this.clearCache('tonkho');
        await this.loadTonKho();
    }
    
    async refreshNhapHang() {
        this.clearCache('nhaphang');
        await this.loadNhapHang();
    }
    
    async refreshBanHang() {
        this.clearCache('banhang');
        await this.loadBanHang();
    }
    
    async refreshXuatHuy() {
        this.clearCache('xuathuy');
        await this.loadXuatHuy();
    }
    
    async refreshTonKho() {
        console.log('refreshTonKho called');
        this.clearCache('tonkho');
        // Clear all localStorage for development
        if (this.DISABLE_CACHE) {
            localStorage.clear();
        }
        await this.loadTonKho();
    }
    
    async refreshBaoCao() {
        this.clearCache('baocao');
        await this.loadBaoCao();
    }
    
    async refreshTopProducts() {
        console.log('refreshTopProducts called');
        this.clearCache('topproducts');
        // Clear all localStorage for development
        if (this.DISABLE_CACHE) {
            localStorage.clear();
        }
        await this.loadTopProducts();
    }
    
    // Refresh tất cả bảng trong tab Báo Cáo
    async refreshAllBaoCao() {
        console.log('🔄 refreshAllBaoCao called');
        this.clearCache('baocao');
        this.clearCache('topproducts');
        // Clear all localStorage for development
        if (this.DISABLE_CACHE) {
            localStorage.clear();
        }
        
        console.log('🔄 About to call loadBaoCao');
        // Load lại cả hai bảng
        await this.loadBaoCao();
        console.log('🔄 About to call loadTopProducts');
        await this.loadTopProducts();
        console.log('✅ Finished refreshAllBaoCao');
    }
    
    // Refresh chỉ Báo Cáo Tồn Kho
    async refreshBaoCaoTonKho() {
        console.log('🔄 refreshBaoCaoTonKho called');
        this.clearCache('baocao');
        // Clear all localStorage for development
        if (this.DISABLE_CACHE) {
            localStorage.clear();
        }
        console.log('🔄 About to call loadBaoCaoTonKhoOnly');
        await this.loadBaoCaoTonKhoOnly();
        console.log('✅ Finished refreshBaoCaoTonKho');
    }

    // API Methods
    async callAPI(action, params = {}) {
        this.showLoading();
        try {
            const url = new URL('https://script.google.com/macros/s/AKfycbwHKQghzT89gptdUeew01jyQx1amCyIUSwtIecvWbFetRIpBIQmLINsA3HDPI33rbax/exec');
            url.searchParams.append('action', action);
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });

            const response = await fetch(url);
            const data = await response.json();
            
            this.hideLoading();
            return data;
        } catch (error) {
            this.hideLoading();
            this.showError('Lỗi kết nối API: ' + error.message);
            return null;
        }
    }

    // Dashboard Methods
    async loadDashboard() {
        // Check cache first
        const cachedData = this.getCacheData('dashboard');
        if (cachedData.data) {
            this.updateDashboardStats(cachedData.data);
            this.updateCharts(cachedData.data);
            this.updateLastUpdateTime('dashboard');
            return;
        }
        
        const response = await this.callAPI('getDashboard');
        if (response && response.success) {
            this.setCacheData('dashboard', response.data);
            this.updateDashboardStats(response.data);
            this.updateCharts(response.data);
            this.updateLastUpdateTime('dashboard');
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalTonKho').textContent = data.totalTonKho || 0;
        document.getElementById('totalRevenue').textContent = this.formatCurrency(data.totalRevenue || 0);
        document.getElementById('totalProfit').textContent = this.formatCurrency(data.totalProfit || 0);
        document.getElementById('totalBan').textContent = data.totalBan || 0;
        
        // Update month titles with current month
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        const revenueTitle = document.getElementById('revenueMonthTitle');
        const profitTitle = document.getElementById('profitMonthTitle');
        const banTitle = document.getElementById('banMonthTitle');
        if (revenueTitle) {
            revenueTitle.textContent = `Doanh Thu Tháng ${currentMonth}`;
        }
        if (profitTitle) {
            profitTitle.textContent = `Lợi Nhuận Tháng ${currentMonth}`;
        }
        if (banTitle) {
            banTitle.textContent = `Bán Tháng ${currentMonth}`;
        }
    }

    setupCharts() {
        console.log('🎨 setupCharts - Initializing charts...');
        // Revenue Chart - Sửa để hiển thị đúng tháng hiện tại
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
            console.log('📊 setupCharts - Found revenueChart canvas, creating chart...');
            // Lấy tháng hiện tại
            const currentMonth = new Date().getMonth(); // 0-11
            const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
            
            // Tạo labels từ tháng hiện tại trở về trước 12 tháng
            const labels = [];
            const data = [];
            
            for (let i = 11; i >= 0; i--) {
                const monthIndex = (currentMonth - i + 12) % 12;
                labels.push(monthLabels[monthIndex]);
                data.push(0); // Sẽ được cập nhật từ API
            }
            
            console.log('📊 setupCharts - Labels:', labels);
            console.log('📊 setupCharts - Current month:', currentMonth);
            
            this.revenueChart = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Doanh Thu (VNĐ)',
                        data: data,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ setupCharts - Revenue chart created successfully');
        } else {
            console.log('❌ setupCharts - revenueChart canvas not found');
        }
    }

    updateCharts(data) {
        console.log('🔄 updateCharts - Updating charts with data:', data);
        if (this.revenueChart && data.revenueByMonth) {
            console.log('📊 updateCharts - Updating revenue chart with data:', data.revenueByMonth);
            this.revenueChart.data.datasets[0].data = data.revenueByMonth;
            this.revenueChart.update();
            console.log('✅ updateCharts - Revenue chart updated successfully');
        } else {
            console.log('❌ updateCharts - Chart not found or no revenueByMonth data');
        }
    }

    // TonKho Methods - Client-side Pagination
    async loadTonKho() {
        // Check if filters are active - if yes, use filtered data and don't reload
        if (typeof tonKhoFilterState !== 'undefined' && tonKhoFilterState.filteredData) {
            console.log('🔍 loadTonKho - Filters are active, using filtered data instead of reloading');
            this.renderTonKhoTableWithPagination(tonKhoFilterState.filteredData);
            this.updateTonKhoPaginationClientSide(tonKhoFilterState.filteredData);
            this.updateLastUpdateTime('tonkho');
            return;
        }
        
        // Only clear filtered data when loading fresh data (no active filters)
        if (typeof tonKhoFilterState !== 'undefined') {
            tonKhoFilterState.filteredData = null;
        }
        
        // Check cache first
        const cachedData = this.getCacheData('tonkho');
        if (cachedData.data) {
            console.log('📦 loadTonKho - Using cached data');
            this.renderTonKhoTableWithPagination(cachedData.data);
            this.updateTonKhoPaginationClientSide(cachedData.data);
            this.updateLastUpdateTime('tonkho');
            return;
        }
        
        console.log('🌐 loadTonKho - Loading all data from API');
        // Load all data at once for client-side pagination
        const params = {
            page: 1,
            pageSize: 999999, // Load all records
            ...this.filters.tonkho
        };
        
        const response = await this.callAPI('getTonKho', params);
        if (response && response.success) {
            // Store all data in cache
            this.setCacheData('tonkho', response.data);
            this.renderTonKhoTableWithPagination(response.data);
            this.updateTonKhoPaginationClientSide(response.data);
            this.updateLastUpdateTime('tonkho');
            console.log('✅ loadTonKho - All data loaded and cached');
        }
    }
    
    renderTonKhoTableWithPagination(data) {
        console.log('🎨 renderTonKhoTableWithPagination - Starting render');
        console.log('🎨 renderTonKhoTableWithPagination - Data:', data);
        
        const tbody = document.getElementById('tonkhoTableBody');
        if (!tbody) {
            console.error('❌ renderTonKhoTableWithPagination - tbody not found');
            return;
        }
        
        tbody.innerHTML = '';

        if (!data.rows || data.rows.length === 0) {
            console.log('🎨 renderTonKhoTableWithPagination - No data to render');
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="11" class="text-center">Không có dữ liệu</td>';
            tbody.appendChild(row);
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = data.rows.slice(startIndex, endIndex);
        
        console.log(`📄 renderTonKhoTableWithPagination - Page ${this.currentPage}, showing ${pageData.length} items (${startIndex}-${endIndex-1})`);
        console.log(`📄 renderTonKhoTableWithPagination - PageSize: ${this.pageSize}, Total rows: ${data.rows.length}`);

        pageData.forEach((item, index) => {
            const row = document.createElement('tr');
            // Debug log để kiểm tra thứ tự cột
            console.log('renderTonKhoTable - Item data:', item);
            console.log('renderTonKhoTable - Headers:', data.headers);
            
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${this.formatDate(item[1])}</td>  <!-- NGÀY NHẬP -->
                <td>${item[2] || ''}</td>  <!-- DÒNG MÁY -->
                <td>${item[3] || ''}</td>  <!-- DUNG LƯỢNG -->
                <td>${item[4] || ''}</td>  <!-- MÀU SẮC -->
                <td>${item[5] || ''}</td>  <!-- IMEI -->
                <td>${item[6] || ''}</td>  <!-- IMEI V5 -->
                <td>${this.formatCurrency(item[7] || 0)}</td>  <!-- GIÁ NHẬP -->
                <td>${item[8] || ''}</td>  <!-- NHÀ CUNG CẤP -->
                <td>${item[10] || ''}</td>  <!-- MÔ TẢ NHẬP (bỏ qua item[9] = ĐIỆN THOẠI) -->
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editTonKhoItem(${startIndex + index})" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTonKhoItem(${startIndex + index})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log('✅ renderTonKhoTableWithPagination - Render completed');
    }
    
    updateTonKhoPaginationClientSide(data) {
        const totalRows = data.rows ? data.rows.length : 0;
        const totalPages = Math.ceil(totalRows / this.pageSize);
        const pageInfo = document.getElementById('tonkhoPageInfo');
        
        if (pageInfo) {
            pageInfo.textContent = `Trang ${this.currentPage} / ${totalPages} (${totalRows} bản ghi)`;
        }
        
        // Update total records count
        const totalRecordsEl = document.getElementById('tonkhoTotalRecordsCount');
        if (totalRecordsEl) {
            const cachedData = this.getCacheData('tonkho');
            if (cachedData && cachedData.data) {
                totalRecordsEl.textContent = cachedData.data.rows ? cachedData.data.rows.length : 0;
            } else {
                totalRecordsEl.textContent = totalRows;
            }
        }
        
        const prevBtn = document.getElementById('prevTonKhoBtn');
        const nextBtn = document.getElementById('nextTonKhoBtn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            prevBtn.style.opacity = this.currentPage <= 1 ? '0.5' : '1';
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
            nextBtn.style.opacity = this.currentPage >= totalPages ? '0.5' : '1';
        }
        
        // Update page size selector
        const pageSizeSelect = document.getElementById('tonkhoPageSize');
        if (pageSizeSelect) {
            pageSizeSelect.value = this.pageSize;
        }
        
        console.log(`📊 updateTonKhoPaginationClientSide - Page ${this.currentPage}/${totalPages}, ${totalRows} total records`);
    }

    async applyTonKhoFilters() {
        this.filters.tonkho = {
            search: document.getElementById('searchTonKho').value,
            dongMay: document.getElementById('filterDongMay').value,
            dungLuong: document.getElementById('filterDungLuong').value
        };
        this.currentPage = 1;
        // Clear cache when filters change
        this.clearCache('tonkho');
        await this.loadTonKho();
    }

    // NhapHang Methods
    async loadNhapHang() {
        // Check if filters are active - if yes, use filtered data and don't reload
        if (typeof nhapHangFilterState !== 'undefined' && nhapHangFilterState.filteredData) {
            this.renderNhapHangTableWithPagination(nhapHangFilterState.filteredData);
            this.updateNhapHangPaginationClientSide(nhapHangFilterState.filteredData);
            this.updateLastUpdateTime('nhaphang');
            return;
        }
        
        // Only clear filtered data when loading fresh data (no active filters)
        if (typeof nhapHangFilterState !== 'undefined') {
            nhapHangFilterState.filteredData = null;
        }
        
        // Check cache first
        const cachedData = this.getCacheData('nhaphang');
        if (cachedData.data) {
            this.renderNhapHangTable(cachedData.data);
            this.updateNhapHangPagination(cachedData.data);
            this.updateLastUpdateTime('nhaphang');
            return;
        }
        const params = {
            page: 1,
            pageSize: 999999, // Load all records for client-side filtering
            ...this.filters.nhaphang
        };
        
        const response = await this.callAPI('getNhapHang', params);
        if (response && response.success) {
            // Store all data in cache
            this.setCacheData('nhaphang', response.data);
            this.renderNhapHangTable(response.data);
            this.updateNhapHangPagination(response.data);
            this.updateLastUpdateTime('nhaphang');
        }
    }

    renderNhapHangTableWithPagination(data) {
        const tbody = document.getElementById('nhaphangTableBody');
        if (!tbody) {
            return;
        }
        
        tbody.innerHTML = '';

        if (!data.rows || data.rows.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="11" class="text-center">Không có dữ liệu</td>';
            tbody.appendChild(row);
            return;
        }
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = data.rows.slice(startIndex, endIndex);
        
        pageData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${this.formatDate(item[1])}</td>  <!-- NGÀY NHẬP -->
                <td>${item[2] || ''}</td>  <!-- DÒNG MÁY -->
                <td>${item[3] || ''}</td>  <!-- DUNG LƯỢNG -->
                <td>${item[4] || ''}</td>  <!-- MÀU SẮC -->
                <td>${item[5] || ''}</td>  <!-- IMEI -->
                <td>${item[6] || ''}</td>  <!-- IMEI V5 -->
                <td>${this.formatCurrency(item[7] || 0)}</td>  <!-- GIÁ NHẬP -->
                <td>${item[8] || ''}</td>  <!-- NHÀ CUNG CẤP -->
                <td>${item[10] || ''}</td>  <!-- MÔ TẢ NHẬP (bỏ qua item[9] = ĐIỆN THOẠI) -->
                <td>
                    <button class="btn btn-sm btn-primary">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    renderNhapHangTable(data) {
        this.renderNhapHangTableWithPagination(data);
    }

    updateNhapHangPaginationClientSide(data) {
        const totalPages = Math.ceil(data.rows.length / this.pageSize) || 1;
        const pageInfoEl = document.getElementById('nhaphangPageInfo');
        if (pageInfoEl) {
            pageInfoEl.textContent = `Trang ${this.currentPage} / ${totalPages} (${data.rows.length} bản ghi)`;
        }
        
        // Update total records count
        const totalRecordsEl = document.getElementById('nhaphangTotalRecordsCount');
        if (totalRecordsEl) {
            const cachedData = this.getCacheData('nhaphang');
            if (cachedData && cachedData.data) {
                totalRecordsEl.textContent = cachedData.data.rows ? cachedData.data.rows.length : 0;
            } else {
                totalRecordsEl.textContent = data.rows.length;
            }
        }
        
        const prevBtn = document.getElementById('prevNhapHangBtn');
        const nextBtn = document.getElementById('nextNhapHangBtn');
        
        if (prevBtn && nextBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }
    
    updateNhapHangPagination(data) {
        this.updateNhapHangPaginationClientSide(data);
    }

    async prevNhapHangPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            
            // Check if filters are active - use filtered data
            const dataToRender = (typeof nhapHangFilterState !== 'undefined' && nhapHangFilterState.filteredData) 
                ? nhapHangFilterState.filteredData 
                : this.getCacheData('nhaphang')?.data;
                
            if (dataToRender) {
                this.renderNhapHangTableWithPagination(dataToRender);
                this.updateNhapHangPaginationClientSide(dataToRender);
            }
        }
    }

    async nextNhapHangPage() {
        // Check if filters are active - use filtered data
        const dataToCheck = (typeof nhapHangFilterState !== 'undefined' && nhapHangFilterState.filteredData) 
            ? nhapHangFilterState.filteredData 
            : this.getCacheData('nhaphang')?.data;
            
        if (dataToCheck) {
            const totalPages = Math.ceil(dataToCheck.rows.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderNhapHangTableWithPagination(dataToCheck);
                this.updateNhapHangPaginationClientSide(dataToCheck);
            }
        }
    }

    changeNhapHangPageSize() {
        const selectEl = document.getElementById('nhaphangPageSize');
        if (selectEl) {
            this.pageSize = parseInt(selectEl.value);
            this.currentPage = 1;
            
            // Check if filters are active - use filtered data
            const dataToRender = (typeof nhapHangFilterState !== 'undefined' && nhapHangFilterState.filteredData) 
                ? nhapHangFilterState.filteredData 
                : this.getCacheData('nhaphang')?.data;
                
            if (dataToRender) {
                this.renderNhapHangTableWithPagination(dataToRender);
                this.updateNhapHangPaginationClientSide(dataToRender);
            }
        }
    }

    async applyNhapHangFilters() {
        this.filters.nhaphang = {
            search: document.getElementById('searchNhapHang').value,
            dateFrom: document.getElementById('nhapDateFrom').value,
            dateTo: document.getElementById('nhapDateTo').value,
            nhaCungCap: document.getElementById('filterNCC').value
        };
        this.currentPage = 1;
        await this.loadNhapHang();
    }

    // BanHang Methods
    async loadBanHang() {
        // Check if filters are active - if yes, use filtered data and don't reload
        if (typeof banHangFilterState !== 'undefined' && banHangFilterState.filteredData) {
            this.renderBanHangTableWithPagination(banHangFilterState.filteredData);
            this.updateBanHangPaginationClientSide(banHangFilterState.filteredData);
            this.updateLastUpdateTime('banhang');
            return;
        }
        
        // Only clear filtered data when loading fresh data (no active filters)
        if (typeof banHangFilterState !== 'undefined') {
            banHangFilterState.filteredData = null;
        }
        
        // Check cache first
        const cachedData = this.getCacheData('banhang');
        if (cachedData.data) {
            this.renderBanHangTable(cachedData.data);
            this.updateBanHangPagination(cachedData.data);
            this.updateLastUpdateTime('banhang');
            return;
        }
    }

    renderBanHangTable(data) {
        this.renderBanHangTableWithPagination(data);
    }

    renderBanHangTableWithPagination(data) {
        const tbody = document.getElementById('banhangTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (!data.rows || data.rows.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="14" class="text-center">Không có dữ liệu</td>';
            tbody.appendChild(row);
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = data.rows.slice(startIndex, endIndex);

        console.log('🔍 renderBanHangTable - First item structure:', pageData[0]);
        console.log('🔍 renderBanHangTable - Total columns:', pageData[0] ? pageData[0].length : 0);
        
        pageData.forEach((item, index) => {
            if (index === 0) {
                console.log('🔍 renderBanHangTable - First row data (full):', item);
                console.log('🔍 renderBanHangTable - item[0] (month):', item[0]);
                console.log('🔍 renderBanHangTable - item[1] onwards:', item.slice(1));
                
                // Print each index for debugging
                console.log('📋 Detailed breakdown:');
                for (let i = 1; i < item.length; i++) {
                    console.log(`  item[${i}] = ${item[i]} (type: ${typeof item[i]})`);
                }
            }
            
            const row = document.createElement('tr');
            // Based on actual log data:
            // item[1] = STT (skip)
            // item[2] = NGÀY BÁN
            // item[3] = DÒNG MÁY
            // item[4] = DUNG LƯỢNG
            // item[5] = MÀU SẮC
            // item[6] = IMEI
            // item[7] = IMEI V5
            // item[8] = GIÁ BÁN
            // item[9] = KHÁCH HÀNG
            // item[10] = empty
            // item[11] = empty
            // item[12] = GIÁ NHẬP (1300)
            // item[13] = LỢI NHUẬN (11000)
            // item[14] = NGÀY NHẬP ("2025-07-31T17:00:00.000Z")
            // item[15] = NHÀ CUNG CẤP ("K/lẻ Nguyễn Thị Hương")
            // item[16] = MÔ TẢ NHẬP ("Viền phẩy ít, có đk,pin 83")
            
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${this.formatDate(item[2])}</td>  <!-- NGÀY BÁN -->
                <td>${item[3] || ''}</td>  <!-- DÒNG MÁY -->
                <td>${item[4] || ''}</td>  <!-- DUNG LƯỢNG -->
                <td>${item[5] || ''}</td>  <!-- MÀU SẮC -->
                <td>${item[6] || ''}</td>  <!-- IMEI -->
                <td>${item[7] || ''}</td>  <!-- IMEI V5 -->
                <td>${this.formatCurrency(item[8] || 0)}</td>  <!-- GIÁ BÁN -->
                <td>${item[9] || ''}</td>  <!-- KHÁCH HÀNG -->
                <td>${this.formatCurrency(item[12] || 0)}</td>  <!-- LỢI NHUẬN -->
                <td>${this.formatCurrency(item[13] || 0)}</td>  <!-- GIÁ NHẬP -->
                <td>${item[14] instanceof Date ? this.formatDate(item[14]) : (item[14] ? this.formatDate(new Date(item[14])) : '')}</td>  <!-- NGÀY NHẬP -->
                <td>${item[15] || ''}</td>  <!-- NHÀ CUNG CẤP -->
                <td>${item[16] || ''}</td>  <!-- MÔ TẢ NHẬP -->
            `;
            tbody.appendChild(row);
        });
    }

    updateBanHangPagination(data) {
        this.updateBanHangPaginationClientSide(data);
    }

    updateBanHangPaginationClientSide(data) {
        const totalPages = Math.ceil(data.rows.length / this.pageSize) || 1;
        const pageInfoEl = document.getElementById('banhangPageInfo');
        if (pageInfoEl) {
            pageInfoEl.textContent = `Trang ${this.currentPage} / ${totalPages} (${data.rows.length} bản ghi)`;
        }
        
        // Update total records count
        const totalRecordsEl = document.getElementById('banhangTotalRecordsCount');
        if (totalRecordsEl) {
            const cachedData = this.getCacheData('banhang');
            if (cachedData && cachedData.data) {
                totalRecordsEl.textContent = cachedData.data.rows ? cachedData.data.rows.length : 0;
            } else {
                totalRecordsEl.textContent = data.rows.length;
            }
        }
        
        const prevBtn = document.getElementById('prevBanHangBtn');
        const nextBtn = document.getElementById('nextBanHangBtn');
        
        if (prevBtn && nextBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }

    async prevBanHangPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            
            // Check if filters are active - use filtered data
            const dataToRender = (typeof banHangFilterState !== 'undefined' && banHangFilterState.filteredData) 
                ? banHangFilterState.filteredData 
                : this.getCacheData('banhang')?.data;
                
            if (dataToRender) {
                this.renderBanHangTableWithPagination(dataToRender);
                this.updateBanHangPaginationClientSide(dataToRender);
            }
        }
    }

    async nextBanHangPage() {
        // Check if filters are active - use filtered data
        const dataToCheck = (typeof banHangFilterState !== 'undefined' && banHangFilterState.filteredData) 
            ? banHangFilterState.filteredData 
            : this.getCacheData('banhang')?.data;
            
        if (dataToCheck) {
            const totalPages = Math.ceil(dataToCheck.rows.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderBanHangTableWithPagination(dataToCheck);
                this.updateBanHangPaginationClientSide(dataToCheck);
            }
        }
    }

    changeBanHangPageSize() {
        const selectEl = document.getElementById('banhangPageSize');
        if (selectEl) {
            this.pageSize = parseInt(selectEl.value);
            this.currentPage = 1;
            
            // Check if filters are active - use filtered data
            const dataToRender = (typeof banHangFilterState !== 'undefined' && banHangFilterState.filteredData) 
                ? banHangFilterState.filteredData 
                : this.getCacheData('banhang')?.data;
                
            if (dataToRender) {
                this.renderBanHangTableWithPagination(dataToRender);
                this.updateBanHangPaginationClientSide(dataToRender);
            }
        }
    }

    // XuatHuy Methods
    async loadXuatHuy() {
        const params = {
            page: this.currentPage,
            pageSize: this.pageSize
        };
        
        const response = await this.callAPI('getXuatHuy', params);
        if (response && response.success) {
            this.renderXuatHuyTable(response.data);
            this.updateXuatHuyPagination(response.data);
        }
    }

    renderXuatHuyTable(data) {
        const tbody = document.getElementById('xuathuyTableBody');
        tbody.innerHTML = '';

        if (!data.rows || data.rows.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="13" class="text-center">Không có dữ liệu</td>';
            tbody.appendChild(row);
            return;
        }

        data.rows.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(this.currentPage - 1) * this.pageSize + index + 1}</td>
                <td>${this.formatDate(item[1])}</td>  <!-- NGÀY XUẤT HỦY -->
                <td>${item[7] || ''}</td>  <!-- LOẠI XUẤT HỦY -->
                <td>${item[5] || ''}</td>  <!-- IMEI -->
                <td>${item[6] || ''}</td>  <!-- IMEI V5 -->
                <td>${item[2] || ''}</td>  <!-- DÒNG MÁY -->
                <td>${item[3] || ''}</td>  <!-- DUNG LƯỢNG -->
                <td>${item[4] || ''}</td>  <!-- MÀU SẮC -->
                <td>${this.formatCurrency(item[8] || 0)}</td>  <!-- GIÁ NHẬP -->
                <td>${item[9] || ''}</td>  <!-- NHÀ CUNG CẤP -->
                <td>${this.formatCurrency(item[14] || 0)}</td>  <!-- PHÍ XUẤT HỦY -->
                <td>${item[15] || ''}</td>  <!-- MÔ TẢ XUẤT HỦY -->
                <td>
                    <button class="btn btn-sm btn-primary">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateXuatHuyPagination(data) {
        const totalPages = Math.ceil(data.totalRows / this.pageSize);
        document.getElementById('xuathuyPageInfo').textContent = `Trang ${this.currentPage} / ${totalPages}`;
        
        document.getElementById('prevXuatHuyBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextXuatHuyBtn').disabled = this.currentPage >= totalPages;
    }

    // IMEI Search Methods
    async searchIMEI() {
        const imeiInput = document.getElementById('imeiSearch').value.trim();
        if (!imeiInput) {
            this.showError('Vui lòng nhập IMEI để tìm kiếm');
            return;
        }

        const response = await this.callAPI('searchIMEI', { imei: imeiInput });
        
        if (response && response.success) {
            this.renderIMEIResults(response.data.history);
        }
    }

    renderIMEIResults(data) {
        const resultsDiv = document.getElementById('imeiResults');
        const timelineDiv = document.getElementById('imeiTimeline');
        
        resultsDiv.style.display = 'block';
        timelineDiv.innerHTML = '';

        data.forEach(item => {
            const timelineItem = document.createElement('div');
            timelineItem.className = `timeline-item ${item.type.toLowerCase()}`;
            timelineItem.innerHTML = `
                <div class="timeline-header">
                    <strong>${item.type}</strong> - ${this.formatDate(item.date)}
                </div>
                <div class="timeline-content">
                    <p><strong>IMEI:</strong> ${item.imei}</p>
                    <p><strong>Dòng Máy:</strong> ${item.dongMay}</p>
                    <p><strong>Dung Lượng:</strong> ${item.dungLuong}</p>
                    <p><strong>Màu Sắc:</strong> ${item.mauSac}</p>
                    ${item.priceOut ? `<p><strong>Giá Bán:</strong> ${this.formatCurrency(item.priceOut)}</p>` : ''}
                    ${item.customer ? `<p><strong>Khách Hàng:</strong> ${item.customer}</p>` : ''}
                    ${item.supplier ? `<p><strong>Nhà CC:</strong> ${item.supplier}</p>` : ''}
                </div>
            `;
            timelineDiv.appendChild(timelineItem);
        });
    }

    // Hàm riêng - chỉ load báo cáo tồn kho
    async loadBaoCaoTonKhoOnly() {
        console.log('🔄 loadBaoCaoTonKhoOnly called');
        
        // Check cache first
        const cachedData = this.getCacheData('baocao');
        if (cachedData.data) {
            console.log('📦 Using cached data for báo cáo tồn kho');
            this.renderBaoCaoTable(cachedData.data);
            this.updateBaoCaoSummary(cachedData.data);
            this.updateLastUpdateTime('baocao');
            return;
        }
        
        console.log('🌐 Fetching fresh data for báo cáo tồn kho');
        const customDays = document.getElementById('topProductsDays')?.value || 120;
        const response = await this.callAPI('getBaoCaoTonKho', { days: customDays });
        
        console.log('loadBaoCaoTonKhoOnly - Input value:', document.getElementById('topProductsDays')?.value);
        console.log('loadBaoCaoTonKhoOnly - Parsed days:', customDays);
        console.log('loadBaoCaoTonKhoOnly - API call with days:', customDays);
        
        if (response && response.success) {
            this.setCacheData('baocao', response.data);
            this.renderBaoCaoTable(response.data);
            this.updateBaoCaoSummary(response.data);
            this.updateLastUpdateTime('baocaoTonKho'); // ✅ Timestamp riêng cho báo cáo tồn kho
            console.log('✅ loadBaoCaoTonKhoOnly completed successfully');
        } else {
            this.showError('Lỗi tải dữ liệu báo cáo tồn kho');
            console.log('❌ loadBaoCaoTonKhoOnly failed');
        }
    }

    // BaoCao Methods - Load cả 2 bảng
    async loadBaoCao() {
        // Check cache first
        const cachedData = this.getCacheData('baocao');
        if (cachedData.data) {
            this.renderBaoCaoTable(cachedData.data);
            this.updateBaoCaoSummary(cachedData.data);
            this.updateLastUpdateTime('baocaoTonKho'); // ✅ Timestamp riêng cho báo cáo tồn kho
            
            // Load TOP SẢN PHẨM from cache if available
            const cachedTopProducts = this.getCacheData('topproducts');
            if (cachedTopProducts.data) {
                this.renderTopProductsTable(cachedTopProducts.data);
                this.updateLastUpdateTime('topProducts'); // ✅ Timestamp riêng cho TOP sản phẩm
            } else {
                await this.loadTopProducts();
            }
            return;
        }
        
        const customDays = document.getElementById('topProductsDays')?.value || 120;
        const response = await this.callAPI('getBaoCao', { days: customDays });
        
        console.log('loadBaoCao - Input value:', document.getElementById('topProductsDays')?.value);
        console.log('loadBaoCao - Parsed days:', customDays);
        console.log('loadBaoCao - API call with days:', customDays);
        
        if (response && response.success) {
            this.setCacheData('baocao', response.data);
            this.renderBaoCaoTable(response.data);
            this.updateBaoCaoSummary(response.data);
            this.updateLastUpdateTime('baocaoTonKho'); // ✅ Timestamp riêng cho báo cáo tồn kho
        }
        
        // Load TOP SẢN PHẨM khi vào tab Báo Cáo
        await this.loadTopProducts();
    }

    renderBaoCaoTable(data) {
        const tbody = document.getElementById('baocaoTableBody');
        tbody.innerHTML = '';

        if (!data.tonKhoByDongMay || data.tonKhoByDongMay.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" class="text-center">Không có dữ liệu</td>';
            tbody.appendChild(row);
            return;
        }

        data.tonKhoByDongMay.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.dongMay || ''}</td>
                <td class="text-right">${item.soLuong || 0}</td>
                <td class="text-right">${this.formatCurrency(item.giaTri || 0)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateBaoCaoSummary(data) {
        document.getElementById('totalQuantity').textContent = data.totalTonKho || 0;
        document.getElementById('totalValue').textContent = this.formatCurrency(data.totalValue || 0);
    }

    // TOP SẢN PHẨM Methods
    async loadTopProducts() {
        // Check cache first
        const cachedData = this.getCacheData('topproducts');
        if (cachedData.data) {
            this.renderTopProductsTable(cachedData.data);
            this.updateLastUpdateTime('topproducts');
            return;
        }
        
        const daysInput = document.getElementById('topProductsDays');
        const days = daysInput ? parseInt(daysInput.value) || 120 : 120;
        
        console.log('loadTopProducts - Input value:', daysInput?.value);
        console.log('loadTopProducts - Parsed days:', days);
        
        // Show loading indicator
        const loadingDiv = document.getElementById('topProductsLoading');
        const tableBody = document.getElementById('topProductsTableBody');
        
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (tableBody) tableBody.innerHTML = '';
        
        const response = await this.callAPI('getTopProducts', { days: days });
        
        console.log('loadTopProducts - API call with days:', days);
        console.log('loadTopProducts - API response:', response);
        
        // Hide loading indicator
        if (loadingDiv) loadingDiv.style.display = 'none';
        
        if (response && response.success) {
            this.setCacheData('topproducts', response.data);
            this.renderTopProductsTable(response.data);
            this.updateLastUpdateTime('topProducts'); // ✅ Timestamp riêng cho TOP sản phẩm
            console.log('✅ loadTopProducts completed successfully');
        } else {
            this.showError('Lỗi tải dữ liệu TOP sản phẩm');
            console.log('❌ loadTopProducts failed');
        }
    }

    renderTopProductsTable(data) {
        const tbody = document.getElementById('topProductsTableBody');
        tbody.innerHTML = '';
        
        if (!data || !data.products || data.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">Không có dữ liệu</td></tr>';
            return;
        }
        
        data.products.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.stt}</td>
                <td>${item.dongMay}</td>
                <td class="text-right">${item.soLuong}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Pagination Methods - Client-side for TonKho
    prevTonKhoPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            console.log(`⬅️ prevTonKhoPage - Going to page ${this.currentPage}`);
            
            // Check if filters are active - use filtered data
            const dataToRender = (typeof tonKhoFilterState !== 'undefined' && tonKhoFilterState.filteredData) 
                ? tonKhoFilterState.filteredData 
                : this.getCacheData('tonkho')?.data;
                
            if (dataToRender) {
                this.renderTonKhoTableWithPagination(dataToRender);
                this.updateTonKhoPaginationClientSide(dataToRender);
            }
        }
    }

    nextTonKhoPage() {
        // Check if filters are active - use filtered data
        const dataToCheck = (typeof tonKhoFilterState !== 'undefined' && tonKhoFilterState.filteredData) 
            ? tonKhoFilterState.filteredData 
            : this.getCacheData('tonkho')?.data;
            
        if (dataToCheck) {
            const totalPages = Math.ceil(dataToCheck.rows.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                console.log(`➡️ nextTonKhoPage - Going to page ${this.currentPage}`);
                this.renderTonKhoTableWithPagination(dataToCheck);
                this.updateTonKhoPaginationClientSide(dataToCheck);
            }
        }
    }

    prevNhapHangPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadNhapHang();
        }
    }

    nextNhapHangPage() {
        this.currentPage++;
        this.loadNhapHang();
    }

    // Removed - using new methods above

    prevXuatHuyPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadXuatHuy();
        }
    }

    nextXuatHuyPage() {
        this.currentPage++;
        this.loadXuatHuy();
    }

    // Modal Methods
    showModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

    // Utility Methods
    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showError(message) {
        alert('Lỗi: ' + message);
    }

    showSuccess(message) {
        alert('Thành công: ' + message);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }

    debounce(func, wait) {
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
}

// Global functions for HTML onclick events
function refreshDashboard() {
    if (window.admin) {
        window.admin.refreshDashboard();
    }
}

function refreshTonKho() {
    console.log('Global refreshTonKho called');
    if (window.admin) {
        window.admin.refreshTonKho();
    } else {
        console.error('Admin instance not found');
    }
}

function refreshBaoCaoTonKho() {
    console.log('Global refreshBaoCaoTonKho called');
    if (window.admin) {
        window.admin.refreshBaoCaoTonKho();
    } else {
        console.error('Admin instance not found');
    }
}

function refreshAllBaoCao() {
    if (window.admin) {
        window.admin.refreshAllBaoCao();
    }
}

function refreshTopProducts() {
    if (window.admin) {
        window.admin.refreshTopProducts();
    }
}

function addTonKho() {
    const form = `
        <div class="form-group">
            <label>IMEI</label>
            <input type="text" id="imei" required>
        </div>
        <div class="form-group">
            <label>IMEI V5</label>
            <input type="text" id="imeiV5" required>
        </div>
        <div class="form-group">
            <label>Dòng Máy</label>
            <input type="text" id="dongMay" required>
        </div>
        <div class="form-group">
            <label>Dung Lượng</label>
            <input type="text" id="dungLuong" required>
        </div>
        <div class="form-group">
            <label>Màu Sắc</label>
            <input type="text" id="mauSac" required>
        </div>
        <div class="form-group">
            <label>Giá Nhập</label>
            <input type="number" id="giaNhap" required>
        </div>
        <div class="form-group">
            <label>Nhà Cung Cấp</label>
            <input type="text" id="nhaCungCap" required>
        </div>
    `;
    admin.showModal('Thêm Tồn Kho', form);
}

function syncTonKho() {
    admin.showSuccess('Đang đồng bộ dữ liệu...');
}

function recalculateTonKho() {
    admin.showSuccess('Đang tính lại tồn kho...');
}

function addNhapHang() {
    admin.showSuccess('Chức năng đang phát triển');
}

function exportNhapHang() {
    admin.showSuccess('Đang xuất dữ liệu...');
}

function addBanHang() {
    admin.showSuccess('Chức năng đang phát triển');
}

function prevBanHangPage() {
    if (window.admin) {
        window.admin.prevBanHangPage();
    }
}

function nextBanHangPage() {
    if (window.admin) {
        window.admin.nextBanHangPage();
    }
}

function changeBanHangPageSize() {
    if (window.admin) {
        window.admin.changeBanHangPageSize();
    }
}

function addXuatHuy() {
    admin.showSuccess('Chức năng đang phát triển');
}

function exportXuatHuy() {
    admin.showSuccess('Đang xuất dữ liệu...');
}

function generateBaoCao() {
    admin.loadBaoCao();
}

function exportBaoCao() {
    admin.showSuccess('Đang xuất báo cáo...');
}

function updateBaoCao() {
    admin.loadBaoCao();
}

function syncData() {
    admin.showSuccess('Đang đồng bộ dữ liệu...');
}

function calculateProfit() {
    admin.showSuccess('Đang tính lợi nhuận...');
}

function compareTonKho() {
    admin.showSuccess('Đang đối chiếu tồn kho...');
}

function backupData() {
    admin.showSuccess('Đang tạo backup...');
}

function updateTopProducts() {
    if (window.admin) {
        window.admin.loadTopProducts();
    }
}

// Global functions for TonKho CRUD operations
async function editTonKhoItem(index) {
    if (!window.admin) {
        console.error('Admin instance not found');
        return;
    }
    
    console.log('🔄 editTonKhoItem called with index:', index);
    
    // Get current data
    let cachedData = window.admin.getCacheData('tonkho');
    if (!cachedData.data || !cachedData.data.rows) {
        console.log('📦 No cached data, loading TonKho...');
        await window.admin.loadTonKho();
        cachedData = window.admin.getCacheData('tonkho');
        
        if (!cachedData.data || !cachedData.data.rows) {
            console.error('Failed to load TonKho data');
            alert('Không thể tải dữ liệu Tồn Kho. Vui lòng thử lại.');
            return;
        }
    }
    
    const item = cachedData.data.rows[index];
    if (!item) {
        console.error('Item not found at index:', index);
        return;
    }
    
    console.log('📝 Editing item:', item);
    
    // Create edit form
    const editForm = createEditForm(item, index);
    
    // Replace the row with edit form
    const tbody = document.getElementById('tonkhoTableBody');
    const rows = tbody.querySelectorAll('tr');
    if (rows[index]) {
        rows[index].innerHTML = editForm;
        rows[index].classList.add('edit-mode');
    }
}

function createEditForm(item, index) {
    return `
        <td>${(window.admin.currentPage - 1) * window.admin.pageSize + index + 1}</td>
        <td>
            <input type="date" id="editNgayNhap_${index}" value="${formatDateForInput(item[1])}" class="form-control">
        </td>
        <td>
            <input type="text" id="editDongMay_${index}" value="${item[2] || ''}" class="form-control">
        </td>
        <td>
            <input type="text" id="editDungLuong_${index}" value="${item[3] || ''}" class="form-control">
        </td>
        <td>
            <input type="text" id="editMauSac_${index}" value="${item[4] || ''}" class="form-control">
        </td>
        <td>
            <input type="text" id="editImei_${index}" value="${item[5] || ''}" class="form-control">
        </td>
        <td>
            <input type="text" id="editImeiV5_${index}" value="${item[6] || ''}" class="form-control">
        </td>
        <td>
            <input type="number" id="editGiaNhap_${index}" value="${item[7] || 0}" class="form-control">
        </td>
        <td>
            <input type="text" id="editNhaCungCap_${index}" value="${item[8] || ''}" class="form-control">
        </td>
        <td>
            <input type="text" id="editMoTaNhap_${index}" value="${item[9] || ''}" class="form-control">
        </td>
        <td>
            <button class="btn btn-sm btn-success" onclick="saveTonKhoItem(${index})" title="Lưu">
                <i class="fas fa-save"></i>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="cancelEditTonKhoItem(${index})" title="Hủy">
                <i class="fas fa-times"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteTonKhoItem(${index})" title="Xóa">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
}

function formatDateForInput(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function saveTonKhoItem(index) {
    if (!window.admin) {
        console.error('Admin instance not found');
        return;
    }
    
    console.log('💾 saveTonKhoItem called with index:', index);
    
    // Get form data
    const formData = {
        rowIndex: index + 1, // API expects 1-based index
        ngayNhap: document.getElementById(`editNgayNhap_${index}`).value,
        dongMay: document.getElementById(`editDongMay_${index}`).value,
        dungLuong: document.getElementById(`editDungLuong_${index}`).value,
        mauSac: document.getElementById(`editMauSac_${index}`).value,
        imei: document.getElementById(`editImei_${index}`).value,
        imeiV5: document.getElementById(`editImeiV5_${index}`).value,
        giaNhap: document.getElementById(`editGiaNhap_${index}`).value,
        nhaCungCap: document.getElementById(`editNhaCungCap_${index}`).value,
        moTaNhap: document.getElementById(`editMoTaNhap_${index}`).value
    };
    
    console.log('💾 Form data:', formData);
    
    try {
        const response = await window.admin.callAPI('updateTonKhoItem', formData);
        if (response && response.success) {
            console.log('✅ Update successful');
            // Refresh TonKho data
            await window.admin.refreshTonKho();
        } else {
            console.error('❌ Update failed:', response.error);
            alert('Lỗi cập nhật: ' + (response.error || 'Không xác định'));
        }
    } catch (error) {
        console.error('❌ Update error:', error);
        alert('Lỗi cập nhật: ' + error.message);
    }
}

function cancelEditTonKhoItem(index) {
    if (!window.admin) {
        console.error('Admin instance not found');
        return;
    }
    
    console.log('❌ cancelEditTonKhoItem called with index:', index);
    
    // Refresh TonKho data to restore original row
    window.admin.refreshTonKho();
}

async function deleteTonKhoItem(index) {
    if (!window.admin) {
        console.error('Admin instance not found');
        return;
    }
    
    console.log('🗑️ deleteTonKhoItem called with index:', index);
    
    // Get item data for confirmation dialog
    let cachedData = window.admin.getCacheData('tonkho');
    if (!cachedData.data || !cachedData.data.rows) {
        console.log('📦 No cached data, loading TonKho...');
        await window.admin.loadTonKho();
        cachedData = window.admin.getCacheData('tonkho');
        
        if (!cachedData.data || !cachedData.data.rows) {
            console.error('Failed to load TonKho data');
            alert('Không thể tải dữ liệu Tồn Kho. Vui lòng thử lại.');
            return;
        }
    }
    
    const item = cachedData.data.rows[index];
    if (!item) {
        console.error('Item not found at index:', index);
        return;
    }
    
    // Confirm deletion with better warning
    const confirmMessage = `⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN item này?

📋 Thông tin item:
• IMEI: ${item[5] || 'N/A'}
• Dòng Máy: ${item[2] || 'N/A'}
• Dung Lượng: ${item[3] || 'N/A'}
• Màu Sắc: ${item[4] || 'N/A'}

🚨 Hành động này KHÔNG THỂ hoàn tác!
Item sẽ bị xóa khỏi Tồn Kho và không thể khôi phục.

Bạn có chắc chắn muốn tiếp tục?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    const formData = {
        rowIndex: index + 1 // API expects 1-based index
    };
    
    console.log('🗑️ Delete data:', formData);
    
    try {
        const response = await window.admin.callAPI('deleteTonKhoItem', formData);
        if (response && response.success) {
            console.log('✅ Delete successful');
            // Refresh TonKho data
            await window.admin.refreshTonKho();
        } else {
            console.error('❌ Delete failed:', response.error);
            alert('Lỗi xóa: ' + (response.error || 'Không xác định'));
        }
    } catch (error) {
        console.error('❌ Delete error:', error);
        alert('Lỗi xóa: ' + error.message);
    }
}

// Global functions for TonKho pagination - Client-side
function prevTonKhoPage() {
    if (!window.admin) {
        console.error('Admin instance not found');
        return;
    }
    
    console.log(`🔍 prevTonKhoPage - Current page: ${window.admin.currentPage}`);
    
    if (window.admin.currentPage > 1) {
        window.admin.currentPage--;
        console.log(`⬅️ prevTonKhoPage - Going to page ${window.admin.currentPage}`);
        
        // Check if filters are active - use filtered data
        const dataToRender = (typeof tonKhoFilterState !== 'undefined' && tonKhoFilterState.filteredData) 
            ? tonKhoFilterState.filteredData 
            : window.admin.getCacheData('tonkho')?.data;
        
        console.log('🔍 prevTonKhoPage - Using filtered data:', !!tonKhoFilterState?.filteredData);
        
        if (dataToRender) {
            console.log('🔍 prevTonKhoPage - Rows length:', dataToRender.rows ? dataToRender.rows.length : 'NO ROWS');
            
            window.admin.renderTonKhoTableWithPagination(dataToRender);
            window.admin.updateTonKhoPaginationClientSide(dataToRender);
        } else {
            console.error('❌ prevTonKhoPage - No data found');
        }
    } else {
        console.log('🔍 prevTonKhoPage - Already at first page');
    }
}

function nextTonKhoPage() {
    if (!window.admin) {
        console.error('Admin instance not found');
        return;
    }
    
    console.log(`🔍 nextTonKhoPage - Current page: ${window.admin.currentPage}`);
    
    // Check if filters are active - use filtered data
    const dataToCheck = (typeof tonKhoFilterState !== 'undefined' && tonKhoFilterState.filteredData) 
        ? tonKhoFilterState.filteredData 
        : window.admin.getCacheData('tonkho')?.data;
    
    console.log('🔍 nextTonKhoPage - Using filtered data:', !!tonKhoFilterState?.filteredData);
    
    if (dataToCheck) {
        const totalPages = Math.ceil(dataToCheck.rows.length / window.admin.pageSize);
        console.log(`🔍 nextTonKhoPage - Total pages: ${totalPages}, Current: ${window.admin.currentPage}`);
        
        if (window.admin.currentPage < totalPages) {
            window.admin.currentPage++;
            console.log(`➡️ nextTonKhoPage - Going to page ${window.admin.currentPage}`);
            window.admin.renderTonKhoTableWithPagination(dataToCheck);
            window.admin.updateTonKhoPaginationClientSide(dataToCheck);
        } else {
            console.log('🔍 nextTonKhoPage - Already at last page');
        }
    } else {
        console.error('❌ nextTonKhoPage - No data found');
    }
}

function changeTonKhoPageSize() {
    if (!window.admin) {
        console.error('Admin instance not found');
        return;
    }
    
    const pageSizeSelect = document.getElementById('tonkhoPageSize');
    if (pageSizeSelect) {
        const newPageSize = parseInt(pageSizeSelect.value);
        console.log(`🔍 changeTonKhoPageSize - Current: ${window.admin.pageSize}, New: ${newPageSize}`);
        
        if (newPageSize !== window.admin.pageSize) {
            window.admin.pageSize = newPageSize;
            window.admin.currentPage = 1; // Reset to first page
            console.log(`📄 changeTonKhoPageSize - New page size: ${newPageSize}`);
            
            // Check if filters are active - use filtered data
            const dataToRender = (typeof tonKhoFilterState !== 'undefined' && tonKhoFilterState.filteredData) 
                ? tonKhoFilterState.filteredData 
                : window.admin.getCacheData('tonkho')?.data;
                
            console.log('🔍 changeTonKhoPageSize - Using filtered data:', !!tonKhoFilterState?.filteredData);
            
            if (dataToRender) {
                console.log('🔍 changeTonKhoPageSize - Data structure:', dataToRender);
                console.log('🔍 changeTonKhoPageSize - Rows length:', dataToRender.rows ? dataToRender.rows.length : 'NO ROWS');
                
                window.admin.renderTonKhoTableWithPagination(dataToRender);
                window.admin.updateTonKhoPaginationClientSide(dataToRender);
            } else {
                console.error('❌ changeTonKhoPageSize - No data found');
            }
        } else {
            console.log('🔍 changeTonKhoPageSize - Same page size, no change needed');
        }
    } else {
        console.error('❌ changeTonKhoPageSize - Page size select not found');
    }
}

// ============================================
// MOBILE-OPTIMIZED FILTERS FOR TONKHO
// ============================================

// Global filter state
let tonKhoFilterState = {
    imeiV5: '',
    selectedDongMay: new Set(),
    selectedDungLuong: new Set(),
    allDongMayOptions: [],
    allDungLuongOptions: [],
    filteredData: null  // Store filtered data for pagination
};

let nhapHangFilterState = {
    imeiV5: '',
    selectedDongMay: new Set(),
    selectedDungLuong: new Set(),
    allDongMayOptions: [],
    allDungLuongOptions: [],
    filteredData: null  // Store filtered data for pagination
};

// Initialize mobile filters when DOM is ready
function initMobileFilters() {
    console.log('🔧 Initializing mobile filters...');
    
    // IMEI V5 Real-time filter
    const imeiV5Search = document.getElementById('imeiV5Search');
    if (imeiV5Search) {
        imeiV5Search.addEventListener('input', debounce((e) => {
            let v5 = e.target.value.trim();
            
            // Chỉ lưu giá trị đã nhập, không tự động pad
            tonKhoFilterState.imeiV5 = v5;
            
            if (v5.length === 5) {
                applyTonKhoMobileFilters();
            } else if (v5.length === 0) {
                applyTonKhoMobileFilters();
            }
        }, 300));
    }
    
    // Nhập Hàng IMEI V5 filter
    const nhapImeiV5Search = document.getElementById('nhapImeiV5Search');
    if (nhapImeiV5Search) {
        nhapImeiV5Search.addEventListener('input', debounce((e) => {
            let v5 = e.target.value.trim();
            
            // Chỉ lưu giá trị đã nhập, không tự động pad
            nhapHangFilterState.imeiV5 = v5;

            if (v5.length === 5) {
                applyNhapHangMobileFilters();
            } else if (v5.length === 0) {
                applyNhapHangMobileFilters();
            }
        }, 300));
    }
    
    // Initialize multi-select dropdowns for both modules
    initMultiSelectDropdowns();
    initNhapHangMultiSelectDropdowns();
    
    console.log('✅ Mobile filters initialized');
}

// Initialize multi-select dropdowns
function initMultiSelectDropdowns() {
    // Dong May dropdown toggle
    const dongMayBtn = document.getElementById('dongMayBtn');
    const dongMayDropdown = document.getElementById('dongMayDropdown');
    
    if (dongMayBtn && dongMayDropdown) {
        dongMayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dongMayDropdown.style.display === 'none' || !dongMayDropdown.classList.contains('show');
            
            // Close all other dropdowns first
            document.querySelectorAll('.multiselect-dropdown').forEach(d => {
                if (d !== dongMayDropdown) {
                    d.classList.remove('show');
                    d.style.display = 'none';
                }
            });
            
            if (isHidden) {
                dongMayDropdown.classList.add('show');
                dongMayDropdown.style.display = 'block';
            } else {
                dongMayDropdown.classList.remove('show');
                dongMayDropdown.style.display = 'none';
            }
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dongMayDropdown.contains(e.target) && !dongMayBtn.contains(e.target)) {
                dongMayDropdown.classList.remove('show');
                dongMayDropdown.style.display = 'none';
            }
        });
    }
    
    // Dung Luong dropdown toggle
    const dungLuongBtn = document.getElementById('dungLuongBtn');
    const dungLuongDropdown = document.getElementById('dungLuongDropdown');
    
    if (dungLuongBtn && dungLuongDropdown) {
        dungLuongBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dungLuongDropdown.style.display === 'none' || !dungLuongDropdown.classList.contains('show');
            
            // Close all other dropdowns first
            document.querySelectorAll('.multiselect-dropdown').forEach(d => {
                if (d !== dungLuongDropdown) {
                    d.classList.remove('show');
                    d.style.display = 'none';
                }
            });
            
            if (isHidden) {
                dungLuongDropdown.classList.add('show');
                dungLuongDropdown.style.display = 'block';
            } else {
                dungLuongDropdown.classList.remove('show');
                dungLuongDropdown.style.display = 'none';
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!dungLuongDropdown.contains(e.target) && !dungLuongBtn.contains(e.target)) {
                dungLuongDropdown.classList.remove('show');
                dungLuongDropdown.style.display = 'none';
            }
        });
    }
    
    // Search functionality for Dong May
    const dongMaySearchInput = document.getElementById('dongMaySearchInput');
    if (dongMaySearchInput) {
        dongMaySearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const options = document.querySelectorAll('#dongMayOptions .multiselect-option');
            
            options.forEach(option => {
                const text = option.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    }
    
    // Search functionality for Dung Luong
    const dungLuongSearchInput = document.getElementById('dungLuongSearchInput');
    if (dungLuongSearchInput) {
        dungLuongSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const options = document.querySelectorAll('#dungLuongOptions .multiselect-option');
            
            options.forEach(option => {
                const text = option.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    }
}

// Populate filter options from data
function populateFilterOptions(tonkhoData) {
    if (!tonkhoData || !tonkhoData.rows) return;
    
    console.log('🔍 populateFilterOptions - First item sample:', tonkhoData.rows[0]);
    console.log('🔍 Is array?', Array.isArray(tonkhoData.rows[0]));
    
    // Try to detect structure
    const firstItem = tonkhoData.rows[0];
    
    // Get unique Dòng Máy - Support both array and object
    const dongMaySet = new Set();
    const dungLuongSet = new Set();
    
    tonkhoData.rows.forEach(item => {
        // Try array first
        if (Array.isArray(item)) {
            if (item[2]) dongMaySet.add(item[2]);
            if (item[3]) dungLuongSet.add(item[3]);
        } else {
            // Try object with different possible property names
            if (item.dongMay) dongMaySet.add(item.dongMay);
            if (item.DÒNG_MÁY) dongMaySet.add(item.DÒNG_MÁY);
            if (item['Dòng Máy']) dongMaySet.add(item['Dòng Máy']);
            
            if (item.dungLuong) dungLuongSet.add(item.dungLuong);
            if (item.DUNG_LƯỢNG) dungLuongSet.add(item.DUNG_LƯỢNG);
            if (item['Dung Lượng']) dungLuongSet.add(item['Dung Lượng']);
        }
    });
    
    tonKhoFilterState.allDongMayOptions = [...dongMaySet].sort();
    tonKhoFilterState.allDungLuongOptions = [...dungLuongSet].sort();
    
    console.log('✅ Extracted options:', {
        dongMay: tonKhoFilterState.allDongMayOptions,
        dungLuong: tonKhoFilterState.allDungLuongOptions
    });
    
    // Render
    renderDongMayOptions();
    renderDungLuongOptions();
}

// Render Dong May options
function renderDongMayOptions() {
    const container = document.getElementById('dongMayOptions');
    if (!container) return;
    
    const options = tonKhoFilterState.allDongMayOptions;
    const selected = tonKhoFilterState.selectedDongMay;
    
    container.innerHTML = options.map(dongMay => `
        <label class="multiselect-option">
            <input 
                type="checkbox" 
                value="${dongMay}"
                ${selected.has(dongMay) ? 'checked' : ''}
                onchange="toggleDongMay('${dongMay}', this.checked)">
            <span>${dongMay}</span>
        </label>
    `).join('');
}

// Render Dung Luong options
function renderDungLuongOptions() {
    const container = document.getElementById('dungLuongOptions');
    if (!container) return;
    
    const options = tonKhoFilterState.allDungLuongOptions;
    const selected = tonKhoFilterState.selectedDungLuong;
    
    container.innerHTML = options.map(dungLuong => `
        <label class="multiselect-option">
            <input 
                type="checkbox" 
                value="${dungLuong}"
                ${selected.has(dungLuong) ? 'checked' : ''}
                onchange="toggleDungLuong('${dungLuong}', this.checked)">
            <span>${dungLuong}</span>
        </label>
    `).join('');
}

// Toggle Dong May selection
function toggleDongMay(dongMay, selected) {
    if (selected) {
        tonKhoFilterState.selectedDongMay.add(dongMay);
    } else {
        tonKhoFilterState.selectedDongMay.delete(dongMay);
    }
    
    updateDongMayCount();
    applyTonKhoMobileFilters();
}

// Toggle Dung Luong selection
function toggleDungLuong(dungLuong, selected) {
    if (selected) {
        tonKhoFilterState.selectedDungLuong.add(dungLuong);
    } else {
        tonKhoFilterState.selectedDungLuong.delete(dungLuong);
    }
    
    updateDungLuongCount();
    applyTonKhoMobileFilters();
}

// Update count displays
function updateDongMayCount() {
    const count = tonKhoFilterState.selectedDongMay.size;
    const total = tonKhoFilterState.allDongMayOptions.length;
    const countEl = document.getElementById('dongMayCount');
    
    if (countEl) {
        if (count === 0 || count === total) {
            countEl.textContent = 'Tất cả';
        } else {
            countEl.textContent = `${count}/${total}`;
        }
    }
}

function updateDungLuongCount() {
    const count = tonKhoFilterState.selectedDungLuong.size;
    const total = tonKhoFilterState.allDungLuongOptions.length;
    const countEl = document.getElementById('dungLuongCount');
    
    if (countEl) {
        if (count === 0 || count === total) {
            countEl.textContent = 'Tất cả';
        } else {
            countEl.textContent = `${count}/${total}`;
        }
    }
}

// Select All / Clear All functions
function selectAllDongMay() {
    tonKhoFilterState.allDongMayOptions.forEach(dongMay => {
        tonKhoFilterState.selectedDongMay.add(dongMay);
    });
    renderDongMayOptions();
    updateDongMayCount();
    applyTonKhoMobileFilters();
}

function clearAllDongMay() {
    tonKhoFilterState.selectedDongMay.clear();
    renderDongMayOptions();
    updateDongMayCount();
    applyTonKhoMobileFilters();
}

function selectAllDungLuong() {
    tonKhoFilterState.allDungLuongOptions.forEach(dungLuong => {
        tonKhoFilterState.selectedDungLuong.add(dungLuong);
    });
    renderDungLuongOptions();
    updateDungLuongCount();
    applyTonKhoMobileFilters();
}

function clearAllDungLuong() {
    tonKhoFilterState.selectedDungLuong.clear();
    renderDungLuongOptions();
    updateDungLuongCount();
    applyTonKhoMobileFilters();
}

// Clear all filters
function clearAllTonKhoFilters() {
    tonKhoFilterState.imeiV5 = '';
    tonKhoFilterState.selectedDongMay.clear();
    tonKhoFilterState.selectedDungLuong.clear();
    
    // Clear UI
    const imeiInput = document.getElementById('imeiV5Search');
    if (imeiInput) imeiInput.value = '';
    
    const imeiCount = document.getElementById('imeiV5Count');
    if (imeiCount) imeiCount.textContent = '';
    
    renderDongMayOptions();
    renderDungLuongOptions();
    updateDongMayCount();
    updateDungLuongCount();
    
    applyTonKhoMobileFilters();
    
    // Hide clear button after clearing
    const clearBtn = document.querySelector('.btn-clear-filters');
    if (clearBtn) clearBtn.style.display = 'none';
    
    // Hide filter summary
    const summaryEl = document.getElementById('filterSummary');
    if (summaryEl) summaryEl.style.display = 'none';
}

// Apply mobile filters
function applyTonKhoMobileFilters() {
    if (!window.admin) return;
    
    const cachedData = window.admin.getCacheData('tonkho');
    if (!cachedData || !cachedData.data || !cachedData.data.rows) {
        console.log('⚠️ No data to filter');
        return;
    }
    
    console.log('🔍 Filter Debug - Checking data structure:');
    console.log('🔍 First item:', cachedData.data.rows[0]);
    console.log('🔍 Item type:', Array.isArray(cachedData.data.rows[0]) ? 'ARRAY' : 'OBJECT');
    
    let filtered = [...cachedData.data.rows];
    
    // Helper function to get value from item
    function getValue(item, arrayIndex, objectProps) {
        if (Array.isArray(item)) {
            return item[arrayIndex] || '';
        } else {
            for (const prop of objectProps) {
                if (item[prop] !== undefined) return item[prop];
            }
            return '';
        }
    }
    
    // IMEI V5 filter - Support both array and object
    if (tonKhoFilterState.imeiV5.length === 5) {
        filtered = filtered.filter(item => {
            const imeiV5 = getValue(item, 6, ['imeiV5', 'IMEI_V5', 'IMEI V5', 'imeiV5']).toString();
            
            console.log('🔍 IMEI V5 check:', {
                input: tonKhoFilterState.imeiV5,
                itemV5: imeiV5,
                match: imeiV5.includes(tonKhoFilterState.imeiV5)
            });
            
            return imeiV5.includes(tonKhoFilterState.imeiV5);
        });
        
        // Update count
        const imeiCount = document.getElementById('imeiV5Count');
        if (imeiCount) {
            imeiCount.textContent = `${filtered.length}`;
        }
    } else {
        const imeiCount = document.getElementById('imeiV5Count');
        if (imeiCount) imeiCount.textContent = '';
    }
    
    // Dong May filter - Support both
    console.log('🔍 Applying Dòng Máy filter...');
    if (tonKhoFilterState.selectedDongMay.size > 0) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(item => {
            const dongMay = getValue(item, 2, ['dongMay', 'DÒNG_MÁY', 'Dòng Máy']);
            // Convert to string to handle type mismatch
            const dongMayStr = String(dongMay);
            const isMatch = tonKhoFilterState.selectedDongMay.has(dongMayStr);
            return isMatch;
        });
        console.log(`🔍 Dòng Máy: ${beforeCount} → ${filtered.length} rows`);
    }
    
    // Dung Luong filter - Support both
    console.log('🔍 Applying Dung Lượng filter...');
    if (tonKhoFilterState.selectedDungLuong.size > 0) {
        const beforeCount = filtered.length;
        
        console.log('🔍 Selected Dung Luong set:', Array.from(tonKhoFilterState.selectedDungLuong));
        console.log('🔍 Sample filtered items before Dung Luong filter:');
        filtered.slice(0, 3).forEach(item => {
            const dungLuong = getValue(item, 3, ['dungLuong', 'DUNG_LƯỢNG', 'Dung Lượng']);
            console.log(`  - Item[3] = "${dungLuong}" (type: ${typeof dungLuong})`);
        });
        
        filtered = filtered.filter(item => {
            const dungLuong = getValue(item, 3, ['dungLuong', 'DUNG_LƯỢNG', 'Dung Lượng']);
            // Convert to string to handle type mismatch
            const dungLuongStr = String(dungLuong);
            const isMatch = tonKhoFilterState.selectedDungLuong.has(dungLuongStr);
            
            if (!isMatch && filtered.length <= 5) {
                console.log(`🔍 No match: "${dungLuong}" (${typeof dungLuong}) → "${dungLuongStr}" not in selected set`);
            }
            
            return isMatch;
        });
        console.log(`🔍 Dung Lượng: ${beforeCount} → ${filtered.length} rows`);
    }
    
    // Display filtered data
    const hasFilters = tonKhoFilterState.imeiV5.length === 5 || 
                      tonKhoFilterState.selectedDongMay.size > 0 || 
                      tonKhoFilterState.selectedDungLuong.size > 0;
    
    console.log('✅ Final filtered count:', filtered.length);
    
    // Show/hide clear filters button
    const clearBtn = document.querySelector('.btn-clear-filters');
    if (clearBtn) {
        clearBtn.style.display = hasFilters ? 'block' : 'none';
    }
    
    // Always render with filtered data if filters exist
    if (hasFilters) {
        const filteredData = {
            ...cachedData.data,
            rows: filtered,
            totalCount: filtered.length
        };
        
        // Store filtered data for pagination
        tonKhoFilterState.filteredData = filteredData;
        
        window.admin.renderTonKhoTableWithPagination(filteredData);
        window.admin.updateTonKhoPaginationClientSide(filteredData);
        updateFilterSummary(filtered.length, cachedData.data.rows.length);
    } else {
        // Clear filtered data when no filters are active
        tonKhoFilterState.filteredData = null;
        
        window.admin.renderTonKhoTableWithPagination(cachedData.data);
        window.admin.updateTonKhoPaginationClientSide(cachedData.data);
        
        const summaryEl = document.getElementById('filterSummary');
        if (summaryEl) summaryEl.style.display = 'none';
    }
}

// Update filter summary
function updateFilterSummary(filtered, total) {
    const summaryEl = document.getElementById('filterSummary');
    const textEl = document.getElementById('filterSummaryText');
    
    if (summaryEl && textEl) {
        summaryEl.style.display = 'block';
        textEl.textContent = `Hiển thị ${filtered} / ${total} sản phẩm`;
    }
}

// Debounce helper
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

// ============================================
// NHAP HANG FILTERS
// ============================================

// Initialize Nhập Hàng multi-select dropdowns
function initNhapHangMultiSelectDropdowns() {
    const btn = document.getElementById('nhapDongMayBtn');
    const dropdown = document.getElementById('nhapDongMayDropdown');
    
    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.style.display === 'none' || !dropdown.classList.contains('show');
            
            // Close all other dropdowns first
            document.querySelectorAll('.multiselect-dropdown').forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('show');
                    d.style.display = 'none';
                }
            });
            
            if (isHidden) {
                dropdown.classList.add('show');
                dropdown.style.display = 'block';
            } else {
                dropdown.classList.remove('show');
                dropdown.style.display = 'none';
            }
        });
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.classList.remove('show');
                dropdown.style.display = 'none';
            }
        });
    }
    
    const dungLuongBtn = document.getElementById('nhapDungLuongBtn');
    const dungLuongDropdown = document.getElementById('nhapDungLuongDropdown');
    
    if (dungLuongBtn && dungLuongDropdown) {
        dungLuongBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dungLuongDropdown.style.display === 'none' || !dungLuongDropdown.classList.contains('show');
            
            // Close all other dropdowns first
            document.querySelectorAll('.multiselect-dropdown').forEach(d => {
                if (d !== dungLuongDropdown) {
                    d.classList.remove('show');
                    d.style.display = 'none';
                }
            });
            
            if (isHidden) {
                dungLuongDropdown.classList.add('show');
                dungLuongDropdown.style.display = 'block';
            } else {
                dungLuongDropdown.classList.remove('show');
                dungLuongDropdown.style.display = 'none';
            }
        });
        document.addEventListener('click', (e) => {
            if (!dungLuongDropdown.contains(e.target) && !dungLuongBtn.contains(e.target)) {
                dungLuongDropdown.classList.remove('show');
                dungLuongDropdown.style.display = 'none';
            }
        });
    }
    
    // Search for Dong May
    const searchInput = document.getElementById('nhapDongMaySearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#nhapDongMayOptions .multiselect-option').forEach(opt => {
                opt.style.display = opt.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
            });
        });
    }
    
    // Search for Dung Luong
    const searchInput2 = document.getElementById('nhapDungLuongSearchInput');
    if (searchInput2) {
        searchInput2.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#nhapDungLuongOptions .multiselect-option').forEach(opt => {
                opt.style.display = opt.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
            });
        });
    }
}

// Populate filter options for Nhập Hàng
function populateNhapHangFilterOptions(data) {
    if (!data || !data.rows) return;
    
    const dongMaySet = new Set();
    const dungLuongSet = new Set();
    
    data.rows.forEach(item => {
        if (Array.isArray(item)) {
            if (item[2]) dongMaySet.add(item[2]);  // DÒNG MÁY
            if (item[3]) dungLuongSet.add(item[3]); // DUNG LƯỢNG
        }
    });
    
    nhapHangFilterState.allDongMayOptions = [...dongMaySet].sort();
    nhapHangFilterState.allDungLuongOptions = [...dungLuongSet].sort();
    
    renderNhapDongMayOptions();
    renderNhapDungLuongOptions();
}

function renderNhapDongMayOptions() {
    const container = document.getElementById('nhapDongMayOptions');
    if (!container) return;
    
    const options = nhapHangFilterState.allDongMayOptions;
    const selected = nhapHangFilterState.selectedDongMay;
    
    container.innerHTML = options.map(item => `
        <label class="multiselect-option">
            <input type="checkbox" value="${item}" ${selected.has(item) ? 'checked' : ''}
                   onchange="toggleNhapDongMay('${item}', this.checked)">
            <span>${item}</span>
        </label>
    `).join('');
}

function renderNhapDungLuongOptions() {
    const container = document.getElementById('nhapDungLuongOptions');
    if (!container) return;
    
    const options = nhapHangFilterState.allDungLuongOptions;
    const selected = nhapHangFilterState.selectedDungLuong;
    
    container.innerHTML = options.map(item => `
        <label class="multiselect-option">
            <input type="checkbox" value="${item}" ${selected.has(item) ? 'checked' : ''}
                   onchange="toggleNhapDungLuong('${item}', this.checked)">
            <span>${item}</span>
        </label>
    `).join('');
}

function toggleNhapDongMay(dongMay, selected) {
    if (selected) {
        nhapHangFilterState.selectedDongMay.add(dongMay);
    } else {
        nhapHangFilterState.selectedDongMay.delete(dongMay);
    }
    updateNhapDongMayCount();
    renderNhapDongMayOptions();
    applyNhapHangMobileFilters();
}

function toggleNhapDungLuong(dungLuong, selected) {
    if (selected) {
        nhapHangFilterState.selectedDungLuong.add(dungLuong);
    } else {
        nhapHangFilterState.selectedDungLuong.delete(dungLuong);
    }
    updateNhapDungLuongCount();
    renderNhapDungLuongOptions();
    applyNhapHangMobileFilters();
}

function updateNhapDongMayCount() {
    const countEl = document.getElementById('nhapDongMayCount');
    if (countEl) {
        const size = nhapHangFilterState.selectedDongMay.size;
        countEl.textContent = size === 0 ? 'Tất cả' : size === 1 ? '1 đã chọn' : `${size} đã chọn`;
    }
}

function updateNhapDungLuongCount() {
    const countEl = document.getElementById('nhapDungLuongCount');
    if (countEl) {
        const size = nhapHangFilterState.selectedDungLuong.size;
        countEl.textContent = size === 0 ? 'Tất cả' : size === 1 ? '1 đã chọn' : `${size} đã chọn`;
    }
}

function selectAllNhapDongMay() {
    nhapHangFilterState.allDongMayOptions.forEach(item => nhapHangFilterState.selectedDongMay.add(item));
    updateNhapDongMayCount();
    renderNhapDongMayOptions();
    applyNhapHangMobileFilters();
}

function clearAllNhapDongMay() {
    nhapHangFilterState.selectedDongMay.clear();
    updateNhapDongMayCount();
    renderNhapDongMayOptions();
    applyNhapHangMobileFilters();
}

function selectAllNhapDungLuong() {
    nhapHangFilterState.allDungLuongOptions.forEach(item => nhapHangFilterState.selectedDungLuong.add(item));
    updateNhapDungLuongCount();
    renderNhapDungLuongOptions();
    applyNhapHangMobileFilters();
}

function clearAllNhapDungLuong() {
    nhapHangFilterState.selectedDungLuong.clear();
    updateNhapDungLuongCount();
    renderNhapDungLuongOptions();
    applyNhapHangMobileFilters();
}

function clearAllNhapHangFilters() {
    nhapHangFilterState.imeiV5 = '';
    nhapHangFilterState.selectedDongMay.clear();
    nhapHangFilterState.selectedDungLuong.clear();
    nhapHangFilterState.filteredData = null;  // Clear filtered data
    
    const imeiInput = document.getElementById('nhapImeiV5Search');
    if (imeiInput) imeiInput.value = '';
    
    renderNhapDongMayOptions();
    renderNhapDungLuongOptions();
    updateNhapDongMayCount();
    updateNhapDungLuongCount();
    
    applyNhapHangMobileFilters();
    
    const clearBtn = document.querySelector('#nhaphang .btn-clear-filters');
    if (clearBtn) clearBtn.style.display = 'none';
}

function applyNhapHangMobileFilters() {
    if (!window.admin) return;
    
    const cachedData = window.admin.getCacheData('nhaphang');
    if (!cachedData || !cachedData.data || !cachedData.data.rows) return;
    
    let filtered = [...cachedData.data.rows];
    
    function getValue(item, arrayIndex) {
        if (Array.isArray(item)) {
            return item[arrayIndex] || '';
        }
        return '';
    }
    
    // IMEI V5 filter
    if (nhapHangFilterState.imeiV5.length === 5) {
        filtered = filtered.filter(item => {
            const imeiV5 = getValue(item, 6).toString();  // IMEI V5 at index 6
            return imeiV5.includes(nhapHangFilterState.imeiV5);
        });
    }
    
    // Dong May filter
    if (nhapHangFilterState.selectedDongMay.size > 0) {
        filtered = filtered.filter(item => {
            const dongMay = getValue(item, 2);  // DÒNG MÁY at index 2
            const dongMayStr = String(dongMay);
            return nhapHangFilterState.selectedDongMay.has(dongMayStr);
        });
    }
    
    // Dung Luong filter
    if (nhapHangFilterState.selectedDungLuong.size > 0) {
        filtered = filtered.filter(item => {
            const dungLuong = getValue(item, 3);  // DUNG LƯỢNG at index 3
            const dungLuongStr = String(dungLuong);
            return nhapHangFilterState.selectedDungLuong.has(dungLuongStr);
        });
    }
    
    const hasFilters = nhapHangFilterState.imeiV5.length === 5 || 
                      nhapHangFilterState.selectedDongMay.size > 0 || 
                      nhapHangFilterState.selectedDungLuong.size > 0;
    
    const clearBtn = document.querySelector('#nhaphang .btn-clear-filters');
    if (clearBtn) {
        clearBtn.style.display = hasFilters ? 'block' : 'none';
    }
    
    if (hasFilters) {
        const filteredData = {...cachedData.data, rows: filtered, totalCount: filtered.length};
        // Store filtered data for pagination
        nhapHangFilterState.filteredData = filteredData;
        window.admin.renderNhapHangTableWithPagination(filteredData);
        window.admin.updateNhapHangPaginationClientSide(filteredData);
        updateNhapFilterSummary(filtered.length, cachedData.data.rows.length);
    } else {
        // Clear filtered data when no filters are active
        nhapHangFilterState.filteredData = null;
        window.admin.renderNhapHangTableWithPagination(cachedData.data);
        window.admin.updateNhapHangPaginationClientSide(cachedData.data);
        const summaryEl = document.getElementById('nhapFilterSummary');
        if (summaryEl) summaryEl.style.display = 'none';
    }
}

function updateNhapFilterSummary(filtered, total) {
    const summaryEl = document.getElementById('nhapFilterSummary');
    const textEl = document.getElementById('nhapFilterSummaryText');
    
    if (summaryEl && textEl) {
        summaryEl.style.display = 'block';
        textEl.textContent = `Hiển thị ${filtered} / ${total} bản ghi`;
    }
}

// Override loadNhapHang to populate filter options
const originalLoadNhapHang = QLBHAdmin.prototype.loadNhapHang;
QLBHAdmin.prototype.loadNhapHang = async function() {
    await originalLoadNhapHang.call(this);
    
    const cachedData = this.getCacheData('nhaphang');
    if (cachedData && cachedData.data) {
        populateNhapHangFilterOptions(cachedData.data);
    }
};

// Override loadTonKho to initialize filters
const originalLoadTonKho = QLBHAdmin.prototype.loadTonKho;
QLBHAdmin.prototype.loadTonKho = async function() {
    await originalLoadTonKho.call(this);
    
    // Initialize filter options after data loads
    const cachedData = this.getCacheData('tonkho');
    if (cachedData && cachedData.data) {
        populateFilterOptions(cachedData.data);
    }
};

// Global helper functions for Nhập Hàng
async function prevNhapHangPage() {
    if (window.admin) {
        await window.admin.prevNhapHangPage();
    }
}

async function nextNhapHangPage() {
    if (window.admin) {
        await window.admin.nextNhapHangPage();
    }
}

function changeNhapHangPageSize() {
    if (window.admin) {
        window.admin.changeNhapHangPageSize();
    }
}

async function refreshNhapHang() {
    if (window.admin) {
        await window.admin.refreshNhapHang();
    }
}

// ============================================
// BAN HANG FILTER STATE
// ============================================
let banHangFilterState = {
    selectedMonths: new Set(),
    khachHang: '',
    imeiV5: '',
    selectedDongMay: new Set(),
    selectedDungLuong: new Set(),
    allDongMayOptions: [],
    allDungLuongOptions: [],
    allMonthOptions: [],
    filteredData: null  // Store filtered data for pagination
};

// ============================================
// BAN HANG METHODS
// ============================================

async function refreshBanHang() {
    if (window.admin) {
        banHangFilterState.filteredData = null;
        await window.admin.loadBanHang();
    }
}

function initBanHangFilters() {
    // Initialize current month
    const currentMonth = ('0' + (new Date().getMonth() + 1)).slice(-2);
    banHangFilterState.selectedMonths.add(currentMonth);
    updateBanHangMonthCount();
    
    // Initialize month options
    banHangFilterState.allMonthOptions = Array.from({length: 12}, (_, i) => 
        ('0' + (i + 1)).slice(-2)
    );
    renderBanHangMonthOptions();
}

// Month management
function renderBanHangMonthOptions() {
    const container = document.getElementById('banhangMonthOptions');
    if (!container) return;
    
    container.innerHTML = '';
    
    banHangFilterState.allMonthOptions.forEach(month => {
        const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                          'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        const monthName = monthNames[parseInt(month) - 1];
        
        const option = document.createElement('div');
        option.className = 'multiselect-option';
        option.innerHTML = `
            <label>
                <input type="checkbox" value="${month}" 
                       ${banHangFilterState.selectedMonths.has(month) ? 'checked' : ''} 
                       onchange="toggleBanHangMonth('${month}')">
                <span>${monthName}</span>
            </label>
        `;
        // Make entire option clickable (but keep dropdown open)
        option.onclick = function(e) {
            e.stopPropagation(); // Prevent closing dropdown
            if (e.target.tagName !== 'INPUT') {
                toggleBanHangMonth(month);
            }
        };
        container.appendChild(option);
    });
    
    // Update button text
    const btnText = document.getElementById('banhangMonthBtnText');
    if (btnText && banHangFilterState.selectedMonths.size > 0) {
        const monthNames = banHangFilterState.allMonthOptions
            .filter(m => banHangFilterState.selectedMonths.has(m))
            .map(m => {
                const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
                return monthNames[parseInt(m) - 1];
            });
        btnText.textContent = monthNames.join(', ');
    } else if (btnText) {
        btnText.textContent = 'Chọn tháng';
    }
}

function toggleBanHangMonthDropdown() {
    const dropdown = document.getElementById('banhangMonthDropdown');
    if (dropdown) {
        const isShown = dropdown.classList.contains('show');
        
        // Close all other dropdowns first
        document.querySelectorAll('.multiselect-dropdown').forEach(d => {
            if (d !== dropdown) {
                d.classList.remove('show');
                d.style.display = 'none';
            }
        });
        
        if (isShown) {
            dropdown.classList.remove('show');
            dropdown.style.display = 'none';
        } else {
            dropdown.classList.add('show');
            dropdown.style.display = 'block';
        }
    }
}

function toggleBanHangMonth(month) {
    if (banHangFilterState.selectedMonths.has(month)) {
        banHangFilterState.selectedMonths.delete(month);
    } else {
        banHangFilterState.selectedMonths.add(month);
    }
    updateBanHangMonthCount();
    renderBanHangMonthOptions();
}

function updateBanHangMonthCount() {
    const countEl = document.getElementById('banhangMonthCount');
    if (countEl) {
        countEl.textContent = banHangFilterState.selectedMonths.size;
    }
}

function selectAllBanHangMonths() {
    banHangFilterState.allMonthOptions.forEach(month => {
        banHangFilterState.selectedMonths.add(month);
    });
    updateBanHangMonthCount();
    renderBanHangMonthOptions();
}

function clearAllBanHangMonths() {
    banHangFilterState.selectedMonths.clear();
    updateBanHangMonthCount();
    renderBanHangMonthOptions();
}

// Dong May and Dung Luong filters (similar to TonKho)
function renderBanHangDongMayOptions() {
    const container = document.getElementById('banhangDongMayOptions');
    if (!container) return;
    
    container.innerHTML = '';
    
    banHangFilterState.allDongMayOptions.forEach(dongMay => {
        const option = document.createElement('div');
        option.className = 'multiselect-option';
        option.innerHTML = `
            <label>
                <input type="checkbox" value="${dongMay}" 
                       ${banHangFilterState.selectedDongMay.has(dongMay) ? 'checked' : ''} 
                       onchange="toggleBanHangDongMay('${dongMay}')">
                <span>${dongMay}</span>
            </label>
        `;
        // Make entire option clickable (but keep dropdown open)
        option.onclick = function(e) {
            e.stopPropagation(); // Prevent closing dropdown
            if (e.target.tagName !== 'INPUT') {
                toggleBanHangDongMay(dongMay);
            }
        };
        container.appendChild(option);
    });
}

function toggleBanHangDongMay() {
    const dropdown = document.getElementById('banhangDongMayDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function toggleBanHangDongMay(dongMay) {
    if (banHangFilterState.selectedDongMay.has(dongMay)) {
        banHangFilterState.selectedDongMay.delete(dongMay);
    } else {
        banHangFilterState.selectedDongMay.add(dongMay);
    }
    updateBanHangDongMayCount();
    renderBanHangDongMayOptions();
    applyBanHangFilters();
}

function updateBanHangDongMayCount() {
    const countEl = document.getElementById('banhangDongMayCount');
    if (countEl) {
        countEl.textContent = banHangFilterState.selectedDongMay.size;
    }
}

function selectAllBanHangDongMay() {
    banHangFilterState.allDongMayOptions.forEach(dongMay => {
        banHangFilterState.selectedDongMay.add(dongMay);
    });
    updateBanHangDongMayCount();
    renderBanHangDongMayOptions();
    applyBanHangFilters();
}

function clearAllBanHangDongMay() {
    banHangFilterState.selectedDongMay.clear();
    updateBanHangDongMayCount();
    renderBanHangDongMayOptions();
    applyBanHangFilters();
}

function renderBanHangDungLuongOptions() {
    const container = document.getElementById('banhangDungLuongOptions');
    if (!container) return;
    
    container.innerHTML = '';
    
    banHangFilterState.allDungLuongOptions.forEach(dungLuong => {
        const option = document.createElement('div');
        option.className = 'multiselect-option';
        option.innerHTML = `
            <label>
                <input type="checkbox" value="${dungLuong}" 
                       ${banHangFilterState.selectedDungLuong.has(dungLuong) ? 'checked' : ''} 
                       onchange="toggleBanHangDungLuong('${dungLuong}')">
                <span>${dungLuong}</span>
            </label>
        `;
        // Make entire option clickable (but keep dropdown open)
        option.onclick = function(e) {
            e.stopPropagation(); // Prevent closing dropdown
            if (e.target.tagName !== 'INPUT') {
                toggleBanHangDungLuong(dungLuong);
            }
        };
        container.appendChild(option);
    });
}

function toggleBanHangDungLuong() {
    const dropdown = document.getElementById('banhangDungLuongDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function toggleBanHangDungLuong(dungLuong) {
    if (banHangFilterState.selectedDungLuong.has(dungLuong)) {
        banHangFilterState.selectedDungLuong.delete(dungLuong);
    } else {
        banHangFilterState.selectedDungLuong.add(dungLuong);
    }
    updateBanHangDungLuongCount();
    renderBanHangDungLuongOptions();
    applyBanHangFilters();
}

function updateBanHangDungLuongCount() {
    const countEl = document.getElementById('banhangDungLuongCount');
    if (countEl) {
        countEl.textContent = banHangFilterState.selectedDungLuong.size;
    }
}

function selectAllBanHangDungLuong() {
    banHangFilterState.allDungLuongOptions.forEach(dungLuong => {
        banHangFilterState.selectedDungLuong.add(dungLuong);
    });
    updateBanHangDungLuongCount();
    renderBanHangDungLuongOptions();
    applyBanHangFilters();
}

function clearAllBanHangDungLuong() {
    banHangFilterState.selectedDungLuong.clear();
    updateBanHangDungLuongCount();
    renderBanHangDungLuongOptions();
    applyBanHangFilters();
}

function clearAllBanHangFilters() {
    banHangFilterState.khachHang = '';
    banHangFilterState.imeiV5 = '';
    banHangFilterState.selectedDongMay.clear();
    banHangFilterState.selectedDungLuong.clear();
    banHangFilterState.filteredData = null;
    
    document.getElementById('banhangKhachHangSearch').value = '';
    document.getElementById('banhangImeiV5Search').value = '';
    
    renderBanHangDongMayOptions();
    renderBanHangDungLuongOptions();
    updateBanHangDongMayCount();
    updateBanHangDungLuongCount();
    
    applyBanHangFilters();
    
    const clearBtn = document.querySelector('#banhang .btn-clear-filters');
    if (clearBtn) clearBtn.style.display = 'none';
}

function applyBanHangFilters() {
    if (!window.admin) return;
    
    const cachedData = window.admin.getCacheData('banhang');
    if (!cachedData || !cachedData.data || !cachedData.data.rows) return;
    
    let filtered = [...cachedData.data.rows];
    
    function getValue(item, index) {
        if (Array.isArray(item)) {
            return item[index] || '';
        }
        return '';
    }
    
    // Khách Hàng filter
    if (banHangFilterState.khachHang) {
        filtered = filtered.filter(item => {
            const khachHang = getValue(item, 9); // Khách Hàng at index 9 in BanHang (skip item[0]=month, item[1]=STT)
            const khachHangStr = String(khachHang);
            return khachHangStr.toLowerCase().includes(banHangFilterState.khachHang.toLowerCase());
        });
    }
    
    // IMEI V5 filter
    if (banHangFilterState.imeiV5.length === 5) {
        filtered = filtered.filter(item => {
            const imeiV5 = getValue(item, 7).toString(); // IMEI V5 at index 7 in BanHang
            return imeiV5.includes(banHangFilterState.imeiV5);
        });
    }
    
    // Dong May filter
    if (banHangFilterState.selectedDongMay.size > 0) {
        filtered = filtered.filter(item => {
            const dongMay = getValue(item, 3); // Dòng Máy at index 3 in BanHang
            const dongMayStr = String(dongMay);
            return banHangFilterState.selectedDongMay.has(dongMayStr);
        });
    }
    
    // Dung Luong filter
    if (banHangFilterState.selectedDungLuong.size > 0) {
        filtered = filtered.filter(item => {
            const dungLuong = getValue(item, 4); // Dung Lượng at index 4 in BanHang
            const dungLuongStr = String(dungLuong);
            return banHangFilterState.selectedDungLuong.has(dungLuongStr);
        });
    }
    
    const hasFilters = banHangFilterState.khachHang || 
                      banHangFilterState.imeiV5.length === 5 || 
                      banHangFilterState.selectedDongMay.size > 0 || 
                      banHangFilterState.selectedDungLuong.size > 0;
    
    const clearBtn = document.querySelector('#banhang .btn-clear-filters');
    if (clearBtn) {
        clearBtn.style.display = hasFilters ? 'block' : 'none';
    }
    
    if (hasFilters) {
        const filteredData = {...cachedData.data, rows: filtered, totalCount: filtered.length};
        banHangFilterState.filteredData = filteredData;
        window.admin.renderBanHangTableWithPagination(filteredData);
        window.admin.updateBanHangPaginationClientSide(filteredData);
        updateBanHangFilterSummary(filtered.length, cachedData.data.rows.length);
    } else {
        banHangFilterState.filteredData = null;
        window.admin.renderBanHangTableWithPagination(cachedData.data);
        window.admin.updateBanHangPaginationClientSide(cachedData.data);
        const summaryEl = document.getElementById('banhangFilterSummary');
        if (summaryEl) summaryEl.style.display = 'none';
    }
}

function updateBanHangFilterSummary(filtered, total) {
    const summaryEl = document.getElementById('banhangFilterSummary');
    const textEl = document.getElementById('banhangFilterSummaryText');
    
    if (summaryEl && textEl) {
        summaryEl.style.display = 'block';
        textEl.textContent = `Hiển thị ${filtered} / ${total} bản ghi`;
    }
}

async function loadBanHangData() {
    console.log('🚀 loadBanHangData - Starting...');
    console.log('🚀 loadBanHangData - Selected months:', banHangFilterState.selectedMonths);
    
    if (banHangFilterState.selectedMonths.size === 0) {
        alert('Vui lòng chọn ít nhất một tháng');
        return;
    }
    
    if (!window.admin) {
        console.error('❌ loadBanHangData - window.admin is undefined');
        return;
    }
    
    // Show loading
    window.admin.showLoading('Đang tải dữ liệu...');
    
    try {
        const months = Array.from(banHangFilterState.selectedMonths);
        const allData = [];
        let allHeaders = null;
        
        console.log('📅 loadBanHangData - Loading data for months:', months);
        
        // Load data from all selected months
        for (const month of months) {
            console.log(`📅 loadBanHangData - Loading data for month: ${month}`);
            
            const response = await window.admin.callAPI('getBanHang', {
                month: month,
                page: 1,
                pageSize: 999999
            });
            
            console.log(`📅 loadBanHangData - Response for month ${month}:`, response);
            
            if (response && response.success && response.data && response.data.rows) {
                console.log(`✅ loadBanHangData - Month ${month} loaded ${response.data.rows.length} rows`);
                
                // Add month indicator to each row
                response.data.rows.forEach(row => {
                    allData.push([month, ...row]); // Prepend month to row
                });
                
                if (!allHeaders && response.data.headers) {
                    allHeaders = response.data.headers;
                    console.log('📋 loadBanHangData - Headers:', allHeaders);
                }
            } else {
                console.warn(`⚠️ loadBanHangData - No data for month ${month}:`, response);
            }
        }
        
        console.log(`📊 loadBanHangData - Total rows loaded: ${allData.length}`);
        
        // Store in cache
        const cacheData = {
            headers: allHeaders,
            rows: allData,
            totalRows: allData.length
        };
        
        window.admin.setCacheData('banhang', cacheData);
        
        // Populate filter options
        populateBanHangFilterOptions(cacheData);
        
        // Render table
        window.admin.renderBanHangTableWithPagination(cacheData);
        window.admin.updateBanHangPaginationClientSide(cacheData);
        window.admin.updateLastUpdateTime('banhang');
        
        console.log('✅ loadBanHangData - Completed successfully');
        window.admin.hideLoading();
    } catch (error) {
        console.error('❌ loadBanHangData - Error:', error);
        console.error('❌ loadBanHangData - Error details:', error.message, error.stack);
        window.admin.hideLoading();
        alert('Có lỗi xảy ra khi tải dữ liệu: ' + error.message);
    }
}

function populateBanHangFilterOptions(data) {
    const dongMaySet = new Set();
    const dungLuongSet = new Set();
    
    data.rows.forEach(item => {
        if (Array.isArray(item)) {
            // item structure: [month, STT, NGÀY BÁN, DÒNG MÁY, DUNG LƯỢNG, MÀU SẮC, IMEI, IMEI V5, ...]
            if (item[3]) dongMaySet.add(String(item[3])); // Dòng Máy at index 3
            if (item[4]) dungLuongSet.add(String(item[4])); // Dung Lượng at index 4
        }
    });
    
    banHangFilterState.allDongMayOptions = [...dongMaySet].sort();
    banHangFilterState.allDungLuongOptions = [...dungLuongSet].sort();
    
    console.log('📋 populateBanHangFilterOptions - Dòng Máy options:', banHangFilterState.allDongMayOptions);
    console.log('📋 populateBanHangFilterOptions - Dung Lượng options:', banHangFilterState.allDungLuongOptions);
    
    renderBanHangDongMayOptions();
    renderBanHangDungLuongOptions();
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.mobile-multiselect')) {
        // Close all dropdowns
        document.querySelectorAll('.multiselect-dropdown.show').forEach(dropdown => {
            dropdown.classList.remove('show');
            dropdown.style.display = 'none';
        });
    }
});

// ============================================
// SEARCH MODULE - Tìm Kiếm Khách Hàng
// ============================================

// Search state
let searchState = {
    customerName: '',
    selectedMonths: new Set(),
    allMonthOptions: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
    searchData: null,
    currentPage: 1,
    pageSize: 50
};

function initSearchFilters() {
    console.log('🔍 Initializing search filters...');
    
    // Default: select current month to current month
    // Format month as "01", "02", ... "12" to match API expectation
    const currentMonth = new Date().getMonth() + 1;
    for (let i = 1; i <= currentMonth; i++) {
        const monthStr = ('0' + i).slice(-2); // Format as "01", "02", etc.
        searchState.selectedMonths.add(monthStr);
    }
    
    renderSearchMonthOptions();
    updateSearchMonthCount();
    
    console.log('✅ Search filters initialized, selected months:', [...searchState.selectedMonths]);
}

function renderSearchMonthOptions() {
    const container = document.getElementById('searchMonthOptions');
    if (!container) return;
    
    container.innerHTML = '';
    
    searchState.allMonthOptions.forEach(month => {
        const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                          'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        const monthName = monthNames[parseInt(month) - 1];
        
        const option = document.createElement('div');
        option.className = 'multiselect-option';
        option.innerHTML = `
            <label>
                <input type="checkbox" value="${month}" 
                       ${searchState.selectedMonths.has(month) ? 'checked' : ''} 
                       onchange="toggleSearchMonth('${month}')">
                <span>${monthName}</span>
            </label>
        `;
        // Make entire option clickable
        option.onclick = function(e) {
            e.stopPropagation();
            if (e.target.tagName !== 'INPUT') {
                toggleSearchMonth(month);
            }
        };
        container.appendChild(option);
    });
    
    // Update button text
    const btnText = document.getElementById('searchMonthBtnText');
    if (btnText && searchState.selectedMonths.size > 0) {
        const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
        const selectedMonthArray = Array.from(searchState.selectedMonths)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(m => monthNames[parseInt(m) - 1]);
        btnText.textContent = selectedMonthArray.join(', ');
    } else if (btnText) {
        btnText.textContent = 'Chọn tháng';
    }
}

function toggleSearchMonthDropdown() {
    const dropdown = document.getElementById('searchMonthDropdown');
    if (dropdown) {
        const isShown = dropdown.classList.contains('show');
        
        // Close all other dropdowns first
        document.querySelectorAll('.multiselect-dropdown').forEach(d => {
            if (d !== dropdown) {
                d.classList.remove('show');
                d.style.display = 'none';
            }
        });
        
        if (isShown) {
            dropdown.classList.remove('show');
            dropdown.style.display = 'none';
        } else {
            dropdown.classList.add('show');
            dropdown.style.display = 'block';
        }
    }
}

function toggleSearchMonth(month) {
    if (searchState.selectedMonths.has(month)) {
        searchState.selectedMonths.delete(month);
    } else {
        searchState.selectedMonths.add(month);
    }
    updateSearchMonthCount();
    renderSearchMonthOptions();
}

function updateSearchMonthCount() {
    const countEl = document.getElementById('searchMonthCount');
    if (countEl) {
        countEl.textContent = searchState.selectedMonths.size;
    }
}

function selectAllSearchMonths() {
    searchState.allMonthOptions.forEach(month => {
        searchState.selectedMonths.add(month);
    });
    updateSearchMonthCount();
    renderSearchMonthOptions();
}

function clearAllSearchMonths() {
    searchState.selectedMonths.clear();
    updateSearchMonthCount();
    renderSearchMonthOptions();
}

async function searchCustomer() {
    const customerName = document.getElementById('customerSearch').value.trim();
    
    if (!customerName) {
        alert('Vui lòng nhập tên khách hàng');
        return;
    }
    
    if (searchState.selectedMonths.size === 0) {
        alert('Vui lòng chọn ít nhất một tháng');
        return;
    }
    
    console.log('🔍 Searching for customer:', customerName);
    console.log('🔍 Selected months:', [...searchState.selectedMonths]);
    
    searchState.currentPage = 1;
    searchState.customerName = customerName;
    
    // Load data from API
    const months = Array.from(searchState.selectedMonths);
    await loadCustomerSearchData(customerName, months);
}

async function loadCustomerSearchData(customerName, months) {
    try {
        console.log('📅 Loading data for months:', months);
        console.log('🔍 Searching for customer:', customerName);
        
        const allData = [];
        let allHeaders = null;
        
        // Load data from all selected months
        for (const month of months) {
            console.log(`📅 Loading data for month: ${month}`);
            
            const response = await window.admin.callAPI('getBanHang', {
                month: month,
                page: 1,
                pageSize: 999999
            });
            
            console.log(`📅 Response for month ${month}:`, response);
            
            if (response && response.success && response.data && response.data.rows) {
                console.log(`✅ Month ${month} loaded ${response.data.rows.length} rows`);
                
                // Add month indicator to each row (same as Bán Hàng)
                response.data.rows.forEach(row => {
                    allData.push([month, ...row]); // Prepend month to row
                });
                
                if (!allHeaders && response.data.headers) {
                    allHeaders = response.data.headers;
                    console.log('📋 Headers:', allHeaders);
                }
            } else {
                console.warn(`⚠️ No data for month ${month}:`, response);
            }
        }
        
        console.log(`📊 Total rows loaded: ${allData.length}`);
        
        // Debug: Log first item to check structure
        if (allData.length > 0) {
            console.log('🔍 First item structure:', allData[0]);
            console.log('🔍 First item length:', allData[0].length);
            console.log('🔍 First item all indexes:', allData[0].map((val, idx) => `${idx}: ${val}`));
        }
        
        // Filter by customer name AFTER prepending month
        // item structure from getBanHang: [STT, NGÀY BÁN, DÒNG MÁY, DUNG LƯỢNG, MÀU SẮC, IMEI, IMEI V5, GIÁ BÁN, KHÁCH HÀNG, empty, empty, GIÁ NHẬP, LỢI NHUẬN, NGÀY NHẬP, NHÀ CUNG CẤP, MÔ TẢ NHẬP, ...]
        // After prepending month, structure becomes: [month, STT, NGÀY BÁN, DÒNG MÁY, DUNG LƯỢNG, MÀU SẮC, IMEI, IMEI V5, GIÁ BÁN, KHÁCH HÀNG, ...]
        // So KHÁCH HÀNG is at index 9 (not 10!)
        const filteredData = allData.filter(item => {
            if (Array.isArray(item) && item.length > 9) {
                let khachHang = String(item[9] || '').toLowerCase();
                let searchTerm = customerName.toLowerCase();
                
                // Remove Vietnamese diacritics for comparison
                function removeAccents(str) {
                    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                }
                
                khachHang = removeAccents(khachHang);
                searchTerm = removeAccents(searchTerm);
                
                const matches = khachHang.includes(searchTerm);
                console.log('🔍 Checking item index 9:', String(item[9] || ''), 'normalized:', khachHang, 'search:', searchTerm, '→', matches);
                return matches;
            }
            return false;
        });
        
        console.log(`🔍 Filtered results: ${filteredData.length} rows`);
        
        // Create data structure
        const searchData = {
            headers: allHeaders,
            rows: filteredData,
            totalRows: filteredData.length
        };
        
        searchState.searchData = searchData;
        
        // Show total records
        const totalRecordsInfo = document.getElementById('customerTotalRecordsInfo');
        const totalRecordsCount = document.getElementById('customerTotalRecordsCount');
        if (totalRecordsInfo && totalRecordsCount) {
            totalRecordsInfo.style.display = 'block';
            totalRecordsCount.textContent = filteredData.length;
        }
        
        // Render table
        window.admin.renderCustomerSearchTable(searchData);
        window.admin.updateCustomerSearchPagination(searchData);
        
        console.log('✅ Customer search completed:', filteredData.length, 'results');
        
    } catch (error) {
        console.error('❌ Error loading customer search data:', error);
        window.admin.showError('Lỗi khi tải dữ liệu tìm kiếm');
    }
}

// Add methods to QLBHAdmin class
QLBHAdmin.prototype.renderCustomerSearchTable = function(data) {
    const tbody = document.getElementById('customerSearchTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (!data.rows || data.rows.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="14" class="text-center">Không tìm thấy dữ liệu</td>';
        tbody.appendChild(row);
        return;
    }

    // Calculate pagination
    const startIndex = (searchState.currentPage - 1) * searchState.pageSize;
    const endIndex = startIndex + searchState.pageSize;
    const pageData = data.rows.slice(startIndex, endIndex);
    
    pageData.forEach((item, index) => {
        const row = document.createElement('tr');
        // item structure: [month, STT, NGÀY BÁN, DÒNG MÁY, DUNG LƯỢNG, MÀU SẮC, IMEI, IMEI V5, ...]
        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${this.formatDate(item[2])}</td>  <!-- NGÀY BÁN -->
            <td>${item[3] || ''}</td>  <!-- DÒNG MÁY -->
            <td>${item[4] || ''}</td>  <!-- DUNG LƯỢNG -->
            <td>${item[5] || ''}</td>  <!-- MÀU SẮC -->
            <td>${item[6] || ''}</td>  <!-- IMEI -->
            <td>${item[7] || ''}</td>  <!-- IMEI V5 -->
            <td>${this.formatCurrency(item[8] || 0)}</td>  <!-- GIÁ BÁN -->
            <td>${item[9] || ''}</td>  <!-- KHÁCH HÀNG -->
            <td>${this.formatCurrency(item[12] || 0)}</td>  <!-- LỢI NHUẬN -->
            <td>${this.formatCurrency(item[13] || 0)}</td>  <!-- GIÁ NHẬP -->
            <td>${item[14] instanceof Date ? this.formatDate(item[14]) : (item[14] ? this.formatDate(new Date(item[14])) : '')}</td>  <!-- NGÀY NHẬP -->
            <td>${item[15] || ''}</td>  <!-- NHÀ CUNG CẤP -->
            <td>${item[16] || ''}</td>  <!-- MÔ TẢ NHẬP -->
        `;
        tbody.appendChild(row);
    });
};

QLBHAdmin.prototype.updateCustomerSearchPagination = function(data) {
    const totalPages = Math.ceil(data.rows.length / searchState.pageSize) || 1;
    const pageInfoEl = document.getElementById('customerPageInfo');
    if (pageInfoEl) {
        pageInfoEl.textContent = `Trang ${searchState.currentPage} / ${totalPages} (${data.rows.length} bản ghi)`;
    }
    
    const prevBtn = document.getElementById('prevCustomerBtn');
    const nextBtn = document.getElementById('nextCustomerBtn');
    
    if (prevBtn && nextBtn) {
        prevBtn.disabled = searchState.currentPage <= 1;
        nextBtn.disabled = searchState.currentPage >= totalPages;
    }
};

function prevCustomerPage() {
    if (searchState.currentPage > 1 && searchState.searchData) {
        searchState.currentPage--;
        window.admin.renderCustomerSearchTable(searchState.searchData);
        window.admin.updateCustomerSearchPagination(searchState.searchData);
    }
}

function nextCustomerPage() {
    if (searchState.searchData) {
        const totalPages = Math.ceil(searchState.searchData.rows.length / searchState.pageSize);
        if (searchState.currentPage < totalPages) {
            searchState.currentPage++;
            window.admin.renderCustomerSearchTable(searchState.searchData);
            window.admin.updateCustomerSearchPagination(searchState.searchData);
        }
    }
}

function changeCustomerPageSize() {
    const selectEl = document.getElementById('customerPageSize');
    if (selectEl && searchState.searchData) {
        searchState.pageSize = parseInt(selectEl.value);
        searchState.currentPage = 1;
        window.admin.renderCustomerSearchTable(searchState.searchData);
        window.admin.updateCustomerSearchPagination(searchState.searchData);
    }
}

// ============================================
// IMEI Search
// ============================================

let imeiSearchState = {
    imei: '',
    searchData: null,
    currentPage: 1,
    pageSize: 50
};

async function searchIMEI() {
    const imeiInput = document.getElementById('imeiSearchInput').value.trim();
    
    if (!imeiInput) {
        alert('Vui lòng nhập IMEI');
        return;
    }
    
    console.log('🔍 Searching IMEI:', imeiInput);
    
    imeiSearchState.currentPage = 1;
    imeiSearchState.imei = imeiInput;
    
    try {
        const response = await window.admin.callAPI('searchIMEI', { imei: imeiInput });
        
        if (response && response.success && response.data && response.data.history) {
            const history = response.data.history;
            console.log('✅ IMEI history loaded:', history.length, 'records');
            
            // Convert history to table data
            console.log('🔍 First item in history:', history[0]);
            console.log('🔍 All item keys:', Object.keys(history[0] || {}));
            
            const tableData = {
                headers: [],
                rows: history.map((item, index) => {
                    // Format date to dd-mm-yyyy (consistent with formatDate function)
                    let dateStr = '';
                    if (item.date) {
                        const date = new Date(item.date);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        dateStr = `${day}-${month}-${year}`;
                    }
                    
                    // Get description (MÔ TẢ NHẬP) from item
                    const moTaNhap = item.description || '';
                    
                    return [
                        index + 1, // STT
                        item.imei || '', // IMEI
                        item.type === 'Xuất' ? 'Bán' : item.type || '', // Loại Giao Dịch (Xuất -> Bán)
                        dateStr, // Ngày (dd/mm/yyyy)
                        item.dongMay || '', // Dòng Máy
                        item.dungLuong || '', // Dung Lượng
                        item.mauSac || '', // Màu Sắc
                        item.priceIn || '', // Giá Nhập
                        item.supplier || '', // Nhà Cung Cấp
                        moTaNhap, // Mô Tả Nhập
                        item.priceOut || '', // Giá Bán
                        item.customer || '' // Khách Hàng
                    ];
                }),
                totalRows: history.length
            };
            
            imeiSearchState.searchData = tableData;
            
            // Show total records
            const totalRecordsInfo = document.getElementById('imeiTotalRecordsInfo');
            const totalRecordsCount = document.getElementById('imeiTotalRecordsCount');
            if (totalRecordsInfo && totalRecordsCount) {
                totalRecordsInfo.style.display = 'block';
                totalRecordsCount.textContent = history.length;
            }
            
            // Render table
            window.admin.renderImeiSearchTable(tableData);
            window.admin.updateImeiSearchPagination(tableData);
            
        } else {
            alert('Không tìm thấy lịch sử giao dịch cho IMEI này');
            document.getElementById('imeiSearchTableBody').innerHTML = '<tr><td colspan="12" class="text-center">Không tìm thấy dữ liệu</td></tr>';
        }
        
    } catch (error) {
        console.error('❌ Error searching IMEI:', error);
        window.admin.showError('Lỗi khi tìm kiếm IMEI');
    }
}

QLBHAdmin.prototype.renderImeiSearchTable = function(data) {
    const tbody = document.getElementById('imeiSearchTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (!data.rows || data.rows.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="12" class="text-center">Không tìm thấy dữ liệu</td>';
        tbody.appendChild(row);
        return;
    }

    // Calculate pagination
    const startIndex = (imeiSearchState.currentPage - 1) * imeiSearchState.pageSize;
    const endIndex = startIndex + imeiSearchState.pageSize;
    const pageData = data.rows.slice(startIndex, endIndex);
    
    pageData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${item[1] || ''}</td>  <!-- IMEI -->
            <td>${item[2] || ''}</td>  <!-- Loại Giao Dịch -->
            <td>${item[3] || ''}</td>  <!-- Ngày -->
            <td>${item[4] || ''}</td>  <!-- Dòng Máy -->
            <td>${item[5] || ''}</td>  <!-- Dung Lượng -->
            <td>${item[6] || ''}</td>  <!-- Màu Sắc -->
            <td>${item[7] ? this.formatCurrency(item[7]) : ''}</td>  <!-- Giá Nhập -->
            <td>${item[8] || ''}</td>  <!-- Nhà Cung Cấp -->
            <td>${item[9] || ''}</td>  <!-- Mô Tả Nhập -->
            <td>${item[10] ? this.formatCurrency(item[10]) : ''}</td>  <!-- Giá Bán -->
            <td>${item[11] || ''}</td>  <!-- Khách Hàng -->
        `;
        tbody.appendChild(row);
    });
};

QLBHAdmin.prototype.updateImeiSearchPagination = function(data) {
    const totalPages = Math.ceil(data.rows.length / imeiSearchState.pageSize) || 1;
    const pageInfoEl = document.getElementById('imeiPageInfo');
    if (pageInfoEl) {
        pageInfoEl.textContent = `Trang ${imeiSearchState.currentPage} / ${totalPages} (${data.rows.length} bản ghi)`;
    }
    
    const prevBtn = document.getElementById('prevImeiBtn');
    const nextBtn = document.getElementById('nextImeiBtn');
    
    if (prevBtn && nextBtn) {
        prevBtn.disabled = imeiSearchState.currentPage <= 1;
        nextBtn.disabled = imeiSearchState.currentPage >= totalPages;
    }
};

function prevImeiPage() {
    if (imeiSearchState.currentPage > 1 && imeiSearchState.searchData) {
        imeiSearchState.currentPage--;
        window.admin.renderImeiSearchTable(imeiSearchState.searchData);
        window.admin.updateImeiSearchPagination(imeiSearchState.searchData);
    }
}

function nextImeiPage() {
    if (imeiSearchState.searchData) {
        const totalPages = Math.ceil(imeiSearchState.searchData.rows.length / imeiSearchState.pageSize);
        if (imeiSearchState.currentPage < totalPages) {
            imeiSearchState.currentPage++;
            window.admin.renderImeiSearchTable(imeiSearchState.searchData);
            window.admin.updateImeiSearchPagination(imeiSearchState.searchData);
        }
    }
}

function changeImeiPageSize() {
    const selectEl = document.getElementById('imeiPageSize');
    if (selectEl && imeiSearchState.searchData) {
        imeiSearchState.pageSize = parseInt(selectEl.value);
        imeiSearchState.currentPage = 1;
        window.admin.renderImeiSearchTable(imeiSearchState.searchData);
        window.admin.updateImeiSearchPagination(imeiSearchState.searchData);
    }
}

// Mobile menu toggle function
function toggleMobileNav() {
    const navContent = document.getElementById('navContent');
    if (navContent) {
        navContent.classList.toggle('show');
    }
}

// Close mobile menu when clicking on nav item
document.addEventListener('DOMContentLoaded', function() {
    window.admin = new QLBHAdmin();
    initMobileFilters();
    initBanHangFilters();
    initBanHangEventListeners();
    initSearchFilters();
    
    // Close mobile menu when clicking on nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const navContent = document.getElementById('navContent');
            if (navContent && window.innerWidth <= 768) {
                navContent.classList.remove('show');
            }
        });
    });
});

function initBanHangEventListeners() {
    // Khách Hàng input listener
    const khachHangInput = document.getElementById('banhangKhachHangSearch');
    if (khachHangInput) {
        khachHangInput.addEventListener('input', debounce((e) => {
            banHangFilterState.khachHang = e.target.value.trim();
            applyBanHangFilters();
        }, 300));
    }
    
    // IMEI V5 input listener
    const imeiV5Input = document.getElementById('banhangImeiV5Search');
    if (imeiV5Input) {
        imeiV5Input.addEventListener('input', debounce((e) => {
            let v5 = e.target.value.trim();
            banHangFilterState.imeiV5 = v5;
            
            if (v5.length === 5) {
                applyBanHangFilters();
            } else if (v5.length === 0) {
                applyBanHangFilters();
            }
        }, 300));
    }
    
    // Setup dropdown toggle
    const dongMayBtn = document.getElementById('banhangDongMayBtn');
    const dongMayDropdown = document.getElementById('banhangDongMayDropdown');
    if (dongMayBtn && dongMayDropdown) {
        dongMayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dongMayDropdown.style.display === 'none' || !dongMayDropdown.classList.contains('show');
            
            // Close all other dropdowns first
            document.querySelectorAll('.multiselect-dropdown').forEach(dropdown => {
                if (dropdown !== dongMayDropdown) {
                    dropdown.classList.remove('show');
                    dropdown.style.display = 'none';
                }
            });
            
            if (isHidden) {
                dongMayDropdown.classList.add('show');
                dongMayDropdown.style.display = 'block';
            } else {
                dongMayDropdown.classList.remove('show');
                dongMayDropdown.style.display = 'none';
            }
        });
    }
    
    const dungLuongBtn = document.getElementById('banhangDungLuongBtn');
    const dungLuongDropdown = document.getElementById('banhangDungLuongDropdown');
    if (dungLuongBtn && dungLuongDropdown) {
        dungLuongBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dungLuongDropdown.style.display === 'none' || !dungLuongDropdown.classList.contains('show');
            
            // Close all other dropdowns first
            document.querySelectorAll('.multiselect-dropdown').forEach(dropdown => {
                if (dropdown !== dungLuongDropdown) {
                    dropdown.classList.remove('show');
                    dropdown.style.display = 'none';
                }
            });
            
            if (isHidden) {
                dungLuongDropdown.classList.add('show');
                dungLuongDropdown.style.display = 'block';
            } else {
                dungLuongDropdown.classList.remove('show');
                dungLuongDropdown.style.display = 'none';
            }
        });
    }
    
    // Search functionality for Dòng Máy
    const dongMaySearch = document.getElementById('banhangDongMaySearch');
    if (dongMaySearch) {
        dongMaySearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const options = document.querySelectorAll('#banhangDongMayOptions .multiselect-option');
            options.forEach(option => {
                const text = option.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });
        });
    }
    
    // Search functionality for Dung Lượng
    const dungLuongSearch = document.getElementById('banhangDungLuongSearch');
    if (dungLuongSearch) {
        dungLuongSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const options = document.querySelectorAll('#banhangDungLuongOptions .multiselect-option');
            options.forEach(option => {
                const text = option.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });
        });
    }
}
