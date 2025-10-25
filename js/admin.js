// QLBH Admin App JavaScript
class QLBHAdmin {
    constructor() {
        this.currentModule = 'dashboard';
        this.currentPage = 1;
        this.pageSize = 20;
        this.filters = {};
        this.data = {};
        
        // Cache system for all tabs
        this.cacheData = {
            dashboard: { data: null, lastUpdate: null },
            tonkho: { data: null, lastUpdate: null },
            nhaphang: { data: null, lastUpdate: null },
            banhang: { data: null, lastUpdate: null },
            xuathuy: { data: null, lastUpdate: null },
            baocao: { data: null, lastUpdate: null },
            topproducts: { data: null, lastUpdate: null }
        };
        
        // Disable cache for development - set to false for production
        this.DISABLE_CACHE = true;
        
        this.init();
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
        // Check cache first
        const cachedData = this.getCacheData('tonkho');
        if (cachedData.data) {
            console.log('📦 loadTonKho - Using cached data');
            this.renderTonKhoTableWithPagination(cachedData.data);
            this.updateTonKhoPaginationClientSide(cachedData.data);
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
            console.log('✅ loadTonKho - All data loaded and cached');
        }
    }
    
    renderTonKhoTableWithPagination(data) {
        const tbody = document.getElementById('tonkhoTableBody');
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
        
        console.log(`📄 renderTonKhoTableWithPagination - Page ${this.currentPage}, showing ${pageData.length} items (${startIndex}-${endIndex-1})`);

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
    }
    
    updateTonKhoPaginationClientSide(data) {
        const totalRows = data.rows ? data.rows.length : 0;
        const totalPages = Math.ceil(totalRows / this.pageSize);
        const pageInfo = document.getElementById('tonkhoPageInfo');
        
        if (pageInfo) {
            pageInfo.textContent = `Trang ${this.currentPage} / ${totalPages} (${totalRows} bản ghi)`;
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
        const params = {
            page: this.currentPage,
            pageSize: this.pageSize,
            ...this.filters.nhaphang
        };
        
        const response = await this.callAPI('getNhapHang', params);
        if (response && response.success) {
            this.renderNhapHangTable(response.data);
            this.updateNhapHangPagination(response.data);
        }
    }

    renderNhapHangTable(data) {
        const tbody = document.getElementById('nhaphangTableBody');
        tbody.innerHTML = '';

        if (!data.rows || data.rows.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="12" class="text-center">Không có dữ liệu</td>';
            tbody.appendChild(row);
            return;
        }

        data.rows.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(this.currentPage - 1) * this.pageSize + index + 1}</td>
                <td>${this.formatDate(item[1])}</td>  <!-- NGÀY NHẬP -->
                <td>${item[5] || ''}</td>  <!-- IMEI -->
                <td>${item[6] || ''}</td>  <!-- IMEI V5 -->
                <td>${item[2] || ''}</td>  <!-- DÒNG MÁY -->
                <td>${item[3] || ''}</td>  <!-- DUNG LƯỢNG -->
                <td>${item[4] || ''}</td>  <!-- MÀU SẮC -->
                <td>${this.formatCurrency(item[7] || 0)}</td>  <!-- GIÁ NHẬP -->
                <td>${item[8] || ''}</td>  <!-- NHÀ CUNG CẤP -->
                <td>${item[9] || ''}</td>  <!-- MÔ TẢ NHẬP -->
                <td>${item[12] || ''}</td>  <!-- TX_NHAP -->
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

    updateNhapHangPagination(data) {
        const totalPages = Math.ceil(data.totalRows / this.pageSize);
        document.getElementById('nhaphangPageInfo').textContent = `Trang ${this.currentPage} / ${totalPages}`;
        
        document.getElementById('prevNhapHangBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextNhapHangBtn').disabled = this.currentPage >= totalPages;
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
        const month = document.getElementById('monthSelector').value;
        const params = {
            month: month,
            page: this.currentPage,
            pageSize: this.pageSize
        };
        
        const response = await this.callAPI('getBanHang', params);
        if (response && response.success) {
            this.renderBanHangTable(response.data);
            this.updateBanHangPagination(response.data);
            this.updateBanHangSummary(response.data.statistics);
        }
    }

    renderBanHangTable(data) {
        const tbody = document.getElementById('banhangTableBody');
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
                <td>${this.formatDate(item[1])}</td>  <!-- NGÀY BÁN -->
                <td>${item[5] || ''}</td>  <!-- IMEI -->
                <td>${item[6] || ''}</td>  <!-- IMEI V5 -->
                <td>${item[2] || ''}</td>  <!-- DÒNG MÁY -->
                <td>${item[3] || ''}</td>  <!-- DUNG LƯỢNG -->
                <td>${item[4] || ''}</td>  <!-- MÀU SẮC -->
                <td>${this.formatCurrency(item[7] || 0)}</td>  <!-- GIÁ BÁN -->
                <td>${this.formatCurrency(item[12] || 0)}</td>  <!-- GIÁ NHẬP -->
                <td>${this.formatCurrency(item[11] || 0)}</td>  <!-- LỢI NHUẬN -->
                <td>${item[8] || ''}</td>  <!-- KHÁCH HÀNG -->
                <td>${item[10] || ''}</td>  <!-- MÔ TẢ BÁN -->
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

    updateBanHangPagination(data) {
        const totalPages = Math.ceil(data.totalRows / this.pageSize);
        document.getElementById('banhangPageInfo').textContent = `Trang ${this.currentPage} / ${totalPages}`;
        
        document.getElementById('prevBanHangBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextBanHangBtn').disabled = this.currentPage >= totalPages;
    }

    updateBanHangSummary(statistics) {
        document.getElementById('totalSales').textContent = statistics.totalBan || 0;
        document.getElementById('totalRevenue').textContent = this.formatCurrency(statistics.totalRevenue || 0);
        document.getElementById('totalProfit').textContent = this.formatCurrency(statistics.totalProfit || 0);
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
            // Re-render with cached data (no API call)
            const cachedData = this.getCacheData('tonkho');
            if (cachedData.data) {
                this.renderTonKhoTableWithPagination(cachedData.data);
                this.updateTonKhoPaginationClientSide(cachedData.data);
            }
        }
    }

    nextTonKhoPage() {
        this.currentPage++;
        console.log(`➡️ nextTonKhoPage - Going to page ${this.currentPage}`);
        // Re-render with cached data (no API call)
        const cachedData = this.getCacheData('tonkho');
        if (cachedData.data) {
            this.renderTonKhoTableWithPagination(cachedData.data);
            this.updateTonKhoPaginationClientSide(cachedData.data);
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

    prevBanHangPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadBanHang();
        }
    }

    nextBanHangPage() {
        this.currentPage++;
        this.loadBanHang();
    }

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

function loadBanHangMonth() {
    admin.loadBanHang();
}

function addBanHang() {
    admin.showSuccess('Chức năng đang phát triển');
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
    
    if (window.admin.currentPage > 1) {
        window.admin.currentPage--;
        console.log(`⬅️ prevTonKhoPage - Going to page ${window.admin.currentPage}`);
        // Re-render with cached data (no API call)
        const cachedData = window.admin.getCacheData('tonkho');
        if (cachedData.data) {
            window.admin.renderTonKhoTableWithPagination(cachedData.data);
            window.admin.updateTonKhoPaginationClientSide(cachedData.data);
        }
    }
}

function nextTonKhoPage() {
    if (!window.admin) {
        console.error('Admin instance not found');
        return;
    }
    
    // Get current data to check total pages
    const cachedData = window.admin.getCacheData('tonkho');
    if (cachedData.data) {
        const totalPages = Math.ceil(cachedData.data.rows.length / window.admin.pageSize);
        if (window.admin.currentPage < totalPages) {
            window.admin.currentPage++;
            console.log(`➡️ nextTonKhoPage - Going to page ${window.admin.currentPage}`);
            // Re-render with cached data (no API call)
            window.admin.renderTonKhoTableWithPagination(cachedData.data);
            window.admin.updateTonKhoPaginationClientSide(cachedData.data);
        }
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
        if (newPageSize !== window.admin.pageSize) {
            window.admin.pageSize = newPageSize;
            window.admin.currentPage = 1; // Reset to first page
            console.log(`📄 changeTonKhoPageSize - New page size: ${newPageSize}`);
            
            // Re-render with cached data (no API call)
            const cachedData = window.admin.getCacheData('tonkho');
            if (cachedData.data) {
                window.admin.renderTonKhoTableWithPagination(cachedData.data);
                window.admin.updateTonKhoPaginationClientSide(cachedData.data);
            }
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.admin = new QLBHAdmin();
    console.log('QLBH Admin App initialized');
});
