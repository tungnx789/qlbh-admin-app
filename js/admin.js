// QLBH Admin App JavaScript
class QLBHAdmin {
    constructor() {
        this.currentModule = 'dashboard';
        this.currentPage = 1;
        this.pageSize = 20;
        this.filters = {};
        this.data = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.setupCharts();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const module = e.currentTarget.dataset.module;
                this.switchModule(module);
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
    }

    switchModule(moduleName) {
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

        // Load module data
        switch(moduleName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'tonkho':
                this.loadTonKho();
                break;
            case 'nhaphang':
                this.loadNhapHang();
                break;
            case 'banhang':
                this.loadBanHang();
                break;
            case 'xuathuy':
                this.loadXuatHuy();
                break;
            case 'baocao':
                this.loadBaoCao();
                break;
        }
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
        const data = await this.callAPI('getDashboard');
        if (data) {
            this.updateDashboardStats(data);
            this.updateCharts(data);
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalTonKho').textContent = data.totalTonKho || 0;
        document.getElementById('totalRevenue').textContent = this.formatCurrency(data.totalRevenue || 0);
        document.getElementById('totalNhap').textContent = data.totalNhap || 0;
        document.getElementById('totalBan').textContent = data.totalBan || 0;
    }

    setupCharts() {
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
            this.revenueChart = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
                    datasets: [{
                        label: 'Doanh Thu (VNĐ)',
                        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

        // Products Chart
        const productsCtx = document.getElementById('productsChart');
        if (productsCtx) {
            this.productsChart = new Chart(productsCtx, {
                type: 'doughnut',
                data: {
                    labels: ['iPhone 17 Pro Max', 'iPhone 16 Pro', 'iPhone 15 Pro Max', 'Khác'],
                    datasets: [{
                        data: [30, 25, 20, 25],
                        backgroundColor: [
                            '#667eea',
                            '#764ba2',
                            '#f093fb',
                            '#f5576c'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
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

        if (this.productsChart && data.productsData) {
            this.productsChart.data.labels = data.productsData.labels;
            this.productsChart.data.datasets[0].data = data.productsData.data;
            this.productsChart.update();
        }
    }

    // TonKho Methods
    async loadTonKho() {
        const params = {
            page: this.currentPage,
            pageSize: this.pageSize,
            ...this.filters.tonkho
        };
        
        const data = await this.callAPI('getTonKho', params);
        if (data) {
            this.renderTonKhoTable(data);
            this.updateTonKhoPagination(data);
        }
    }

    renderTonKhoTable(data) {
        const tbody = document.getElementById('tonkhoTableBody');
        tbody.innerHTML = '';

        data.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(this.currentPage - 1) * this.pageSize + index + 1}</td>
                <td>${item.imei || ''}</td>
                <td>${item.imeiV5 || ''}</td>
                <td>${item.dongMay || ''}</td>
                <td>${item.dungLuong || ''}</td>
                <td>${item.mauSac || ''}</td>
                <td>${this.formatCurrency(item.giaNhap || 0)}</td>
                <td>${item.nhaCungCap || ''}</td>
                <td>${this.formatDate(item.ngayNhap)}</td>
                <td><span class="status-badge ${item.trangThai || 'active'}">${item.trangThai || 'Hoạt động'}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="admin.editTonKho(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="admin.deleteTonKho(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateTonKhoPagination(data) {
        const totalPages = Math.ceil(data.total / this.pageSize);
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
        
        const data = await this.callAPI('getNhapHang', params);
        if (data) {
            this.renderNhapHangTable(data);
            this.updateNhapHangPagination(data);
        }
    }

    renderNhapHangTable(data) {
        const tbody = document.getElementById('nhaphangTableBody');
        tbody.innerHTML = '';

        data.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(this.currentPage - 1) * this.pageSize + index + 1}</td>
                <td>${this.formatDate(item.ngayNhap)}</td>
                <td>${item.imei || ''}</td>
                <td>${item.imeiV5 || ''}</td>
                <td>${item.dongMay || ''}</td>
                <td>${item.dungLuong || ''}</td>
                <td>${item.mauSac || ''}</td>
                <td>${this.formatCurrency(item.giaNhap || 0)}</td>
                <td>${item.nhaCungCap || ''}</td>
                <td>${item.moTa || ''}</td>
                <td>${item.txNhap || ''}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="admin.editNhapHang(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="admin.deleteNhapHang(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateNhapHangPagination(data) {
        const totalPages = Math.ceil(data.total / this.pageSize);
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
        
        const data = await this.callAPI('getBanHang', params);
        if (data) {
            this.renderBanHangTable(data);
            this.updateBanHangPagination(data);
            this.updateBanHangSummary(data.summary);
        }
    }

    renderBanHangTable(data) {
        const tbody = document.getElementById('banhangTableBody');
        tbody.innerHTML = '';

        data.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(this.currentPage - 1) * this.pageSize + index + 1}</td>
                <td>${this.formatDate(item.ngayBan)}</td>
                <td>${item.imei || ''}</td>
                <td>${item.imeiV5 || ''}</td>
                <td>${item.dongMay || ''}</td>
                <td>${item.dungLuong || ''}</td>
                <td>${item.mauSac || ''}</td>
                <td>${this.formatCurrency(item.giaBan || 0)}</td>
                <td>${this.formatCurrency(item.giaNhap || 0)}</td>
                <td>${this.formatCurrency(item.loiNhuan || 0)}</td>
                <td>${item.khachHang || ''}</td>
                <td>${item.moTaBan || ''}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="admin.editBanHang(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="admin.deleteBanHang(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateBanHangPagination(data) {
        const totalPages = Math.ceil(data.total / this.pageSize);
        document.getElementById('banhangPageInfo').textContent = `Trang ${this.currentPage} / ${totalPages}`;
        
        document.getElementById('prevBanHangBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextBanHangBtn').disabled = this.currentPage >= totalPages;
    }

    updateBanHangSummary(summary) {
        document.getElementById('totalSales').textContent = summary.totalSales || 0;
        document.getElementById('totalRevenue').textContent = this.formatCurrency(summary.totalRevenue || 0);
        document.getElementById('totalProfit').textContent = this.formatCurrency(summary.totalProfit || 0);
    }

    // XuatHuy Methods
    async loadXuatHuy() {
        const params = {
            page: this.currentPage,
            pageSize: this.pageSize
        };
        
        const data = await this.callAPI('getXuatHuy', params);
        if (data) {
            this.renderXuatHuyTable(data);
            this.updateXuatHuyPagination(data);
        }
    }

    renderXuatHuyTable(data) {
        const tbody = document.getElementById('xuathuyTableBody');
        tbody.innerHTML = '';

        data.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(this.currentPage - 1) * this.pageSize + index + 1}</td>
                <td>${this.formatDate(item.ngayXuatHuy)}</td>
                <td>${item.loaiXuatHuy || ''}</td>
                <td>${item.imei || ''}</td>
                <td>${item.imeiV5 || ''}</td>
                <td>${item.dongMay || ''}</td>
                <td>${item.dungLuong || ''}</td>
                <td>${item.mauSac || ''}</td>
                <td>${this.formatCurrency(item.giaNhap || 0)}</td>
                <td>${item.nhaCungCap || ''}</td>
                <td>${this.formatCurrency(item.phiXuatHuy || 0)}</td>
                <td>${item.moTaXuatHuy || ''}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="admin.editXuatHuy(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="admin.deleteXuatHuy(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateXuatHuyPagination(data) {
        const totalPages = Math.ceil(data.total / this.pageSize);
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

        const imeiList = imeiInput.split(',').map(imei => imei.trim());
        const data = await this.callAPI('searchIMEI', { imeiList });
        
        if (data) {
            this.renderIMEIResults(data);
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

    // BaoCao Methods
    async loadBaoCao() {
        const customDays = document.getElementById('customDays').value;
        const data = await this.callAPI('getBaoCao', { days: customDays });
        
        if (data) {
            this.renderBaoCaoTable(data);
            this.updateBaoCaoSummary(data.summary);
        }
    }

    renderBaoCaoTable(data) {
        const tbody = document.getElementById('baocaoTableBody');
        tbody.innerHTML = '';

        data.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.dongMay || ''}</td>
                <td>${item.soLuong || 0}</td>
                <td>${this.formatCurrency(item.giaTri || 0)}</td>
                <td>${this.formatCurrency(item.giaTB || 0)}</td>
                <td>${this.formatDate(item.ngayNhapCuoi)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateBaoCaoSummary(summary) {
        document.getElementById('totalQuantity').textContent = summary.totalQuantity || 0;
        document.getElementById('totalValue').textContent = this.formatCurrency(summary.totalValue || 0);
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
    admin.loadDashboard();
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

// Initialize the app
const admin = new QLBHAdmin();
