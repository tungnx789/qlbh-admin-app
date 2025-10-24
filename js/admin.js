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
        // DON'T auto-load dashboard - wait for user to click refresh button
        console.log('init - App initialized - No auto-load');
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
        console.log('refreshAllBaoCao called');
        this.clearCache('baocao');
        this.clearCache('topproducts');
        // Clear all localStorage for development
        if (this.DISABLE_CACHE) {
            localStorage.clear();
        }
        
        // Load lại cả hai bảng
        await this.loadBaoCao();
        await this.loadTopProducts();
    }
    
    // Refresh chỉ Báo Cáo Tồn Kho
    async refreshBaoCaoTonKho() {
        console.log('refreshBaoCaoTonKho called');
        this.clearCache('baocao');
        // Clear all localStorage for development
        if (this.DISABLE_CACHE) {
            localStorage.clear();
        }
        await this.loadBaoCaoTonKhoOnly(); // Gọi hàm mới
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
        // Revenue Chart - Sửa để hiển thị đúng tháng hiện tại
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
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
        }
    }

    updateCharts(data) {
        if (this.revenueChart && data.revenueByMonth) {
            this.revenueChart.data.datasets[0].data = data.revenueByMonth;
            this.revenueChart.update();
        }
    }

    // TonKho Methods
    async loadTonKho() {
        const params = {
            page: this.currentPage,
            pageSize: this.pageSize,
            ...this.filters.tonkho
        };
        
        const response = await this.callAPI('getTonKho', params);
        if (response && response.success) {
            this.renderTonKhoTable(response.data);
            this.updateTonKhoPagination(response.data);
        }
    }

    renderTonKhoTable(data) {
        const tbody = document.getElementById('tonkhoTableBody');
        tbody.innerHTML = '';

        if (!data.rows || data.rows.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="11" class="text-center">Không có dữ liệu</td>';
            tbody.appendChild(row);
            return;
        }

        data.rows.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(this.currentPage - 1) * this.pageSize + index + 1}</td>
                <td>${item[5] || ''}</td>  <!-- IMEI -->
                <td>${item[6] || ''}</td>  <!-- IMEI V5 -->
                <td>${item[2] || ''}</td>  <!-- DÒNG MÁY -->
                <td>${item[3] || ''}</td>  <!-- DUNG LƯỢNG -->
                <td>${item[4] || ''}</td>  <!-- MÀU SẮC -->
                <td>${this.formatCurrency(item[7] || 0)}</td>  <!-- GIÁ NHẬP -->
                <td>${item[8] || ''}</td>  <!-- NHÀ CUNG CẤP -->
                <td>${this.formatDate(item[1])}</td>  <!-- NGÀY NHẬP -->
                <td><span class="status-badge active">Hoạt động</span></td>
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

    updateTonKhoPagination(data) {
        const totalPages = Math.ceil(data.totalRows / this.pageSize);
        document.getElementById('tonkhoPageInfo').textContent = `Trang ${this.currentPage} / ${totalPages}`;
        
        document.getElementById('prevTonKhoBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextTonKhoBtn').disabled = this.currentPage >= totalPages;
    }

    async applyTonKhoFilters() {
        this.filters.tonkho = {
            search: document.getElementById('searchTonKho').value,
            dongMay: document.getElementById('filterDongMay').value,
            dungLuong: document.getElementById('filterDungLuong').value
        };
        this.currentPage = 1;
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
        // Check cache first
        const cachedData = this.getCacheData('baocao');
        if (cachedData.data) {
            this.renderBaoCaoTable(cachedData.data);
            this.updateBaoCaoSummary(cachedData.data);
            this.updateLastUpdateTime('baocao');
            return;
        }
        
        const customDays = document.getElementById('topProductsDays')?.value || 120;
        const response = await this.callAPI('getBaoCao', { days: customDays });
        
        console.log('loadBaoCaoTonKhoOnly - Input value:', document.getElementById('topProductsDays')?.value);
        console.log('loadBaoCaoTonKhoOnly - Parsed days:', customDays);
        console.log('loadBaoCaoTonKhoOnly - API call with days:', customDays);
        
        if (response && response.success) {
            this.setCacheData('baocao', response.data);
            this.renderBaoCaoTable(response.data);
            this.updateBaoCaoSummary(response.data);
            this.updateLastUpdateTime('baocao');
        } else {
            this.showError('Lỗi tải dữ liệu báo cáo tồn kho');
        }
    }

    // BaoCao Methods - Load cả 2 bảng
    async loadBaoCao() {
        // Check cache first
        const cachedData = this.getCacheData('baocao');
        if (cachedData.data) {
            this.renderBaoCaoTable(cachedData.data);
            this.updateBaoCaoSummary(cachedData.data);
            this.updateLastUpdateTime('baocao');
            
            // Load TOP SẢN PHẨM from cache if available
            const cachedTopProducts = this.getCacheData('topproducts');
            if (cachedTopProducts.data) {
                this.renderTopProductsTable(cachedTopProducts.data);
                this.updateLastUpdateTime('topproducts');
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
            this.updateLastUpdateTime('baocao');
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
            this.updateLastUpdateTime('topproducts');
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

    // Pagination Methods
    prevTonKhoPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadTonKho();
        }
    }

    nextTonKhoPage() {
        this.currentPage++;
        this.loadTonKho();
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
        return d.toLocaleDateString('vi-VN');
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

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.admin = new QLBHAdmin();
    console.log('QLBH Admin App initialized');
});
