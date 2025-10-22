// QLBH Admin API - Google Apps Script Backend
// File: QLBH_AdminApp/api/QLBH_Admin_API.js

/**
 * Main entry point for GET requests
 */
function doGet(e) {
  try {
    var action = e.parameter.action;
    var data = {};
    
    switch(action) {
      case 'getDashboard':
        data = getDashboardData();
        break;
      case 'getTonKho':
        data = getTonKhoData(e.parameter);
        break;
      case 'getNhapHang':
        data = getNhapHangData(e.parameter);
        break;
      case 'getBanHang':
        data = getBanHangData(e.parameter);
        break;
      case 'getXuatHuy':
        data = getXuatHuyData(e.parameter);
        break;
      case 'getBaoCao':
        data = getBaoCaoData(e.parameter);
        break;
      case 'searchIMEI':
        data = searchIMEIHistory(e.parameter);
        break;
      default:
        data = { error: 'Action not found' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main entry point for POST requests
 */
function doPost(e) {
  try {
    var action = e.parameter.action;
    var result = {};
    
    switch(action) {
      case 'updateTonKho':
        result = updateTonKhoRecord(e.parameter);
        break;
      case 'addTonKho':
        result = addTonKhoRecord(e.parameter);
        break;
      case 'updateNhapHang':
        result = updateNhapHangRecord(e.parameter);
        break;
      case 'addNhapHang':
        result = addNhapHangRecord(e.parameter);
        break;
      case 'updateBanHang':
        result = updateBanHangRecord(e.parameter);
        break;
      case 'addBanHang':
        result = addBanHangRecord(e.parameter);
        break;
      case 'updateXuatHuy':
        result = updateXuatHuyRecord(e.parameter);
        break;
      case 'addXuatHuy':
        result = addXuatHuyRecord(e.parameter);
        break;
      case 'generateBaoCao':
        result = generateBaoCaoData();
        break;
      case 'syncData':
        result = syncDataOperation();
        break;
      case 'calculateProfit':
        result = calculateProfitOperation();
        break;
      case 'compareTonKho':
        result = compareTonKhoOperation();
        break;
      case 'backupData':
        result = backupDataOperation();
        break;
      default:
        result = { error: 'Action not found' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get dashboard statistics
 */
function getDashboardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Get TonKho count
    var tonKhoSheet = ss.getSheetByName('TonKho');
    var totalTonKho = 0;
    if (tonKhoSheet) {
      var headerRow = findHeaderRow(tonKhoSheet);
      totalTonKho = tonKhoSheet.getLastRow() - headerRow;
    }
    
    // Get current month sales
    var currentMonth = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM');
    var banHangSheet = ss.getSheetByName('BanHangT' + currentMonth);
    var totalBan = 0;
    var totalRevenue = 0;
    if (banHangSheet) {
      var headerRow = findHeaderRow(banHangSheet);
      totalBan = banHangSheet.getLastRow() - headerRow;
      
      // Calculate revenue
      var headers = banHangSheet.getRange(headerRow, 1, 1, banHangSheet.getLastColumn()).getValues()[0]
                                .map(h => h.toString().trim().toUpperCase());
      var giaBanIndex = headers.indexOf('GIÁ BÁN');
      if (giaBanIndex >= 0) {
        var data = banHangSheet.getRange(headerRow + 1, giaBanIndex + 1, totalBan, 1).getValues();
        totalRevenue = data.reduce((sum, row) => {
          var value = row[0];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
      }
    }
    
    // Get current month imports
    var nhapHangSheet = ss.getSheetByName('NhapHang');
    var totalNhap = 0;
    if (nhapHangSheet) {
      var headerRow = findHeaderRow(nhapHangSheet);
      var headers = nhapHangSheet.getRange(headerRow, 1, 1, nhapHangSheet.getLastColumn()).getValues()[0]
                                 .map(h => h.toString().trim().toUpperCase());
      var ngayNhapIndex = headers.indexOf('NGÀY NHẬP');
      if (ngayNhapIndex >= 0) {
        var data = nhapHangSheet.getRange(headerRow + 1, ngayNhapIndex + 1, nhapHangSheet.getLastRow() - headerRow, 1).getValues();
        var currentYear = new Date().getFullYear();
        var currentMonthNum = parseInt(currentMonth);
        
        totalNhap = data.filter(row => {
          var date = new Date(row[0]);
          return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonthNum;
        }).length;
      }
    }
    
    // Revenue by month (last 12 months)
    var revenueByMonth = [];
    for (var i = 11; i >= 0; i--) {
      var month = new Date();
      month.setMonth(month.getMonth() - i);
      var monthStr = Utilities.formatDate(month, Session.getScriptTimeZone(), 'MM');
      var monthSheet = ss.getSheetByName('BanHangT' + monthStr);
      
      var monthRevenue = 0;
      if (monthSheet) {
        var headerRow = findHeaderRow(monthSheet);
        var headers = monthSheet.getRange(headerRow, 1, 1, monthSheet.getLastColumn()).getValues()[0]
                               .map(h => h.toString().trim().toUpperCase());
        var giaBanIndex = headers.indexOf('GIÁ BÁN');
        if (giaBanIndex >= 0) {
          var data = monthSheet.getRange(headerRow + 1, giaBanIndex + 1, monthSheet.getLastRow() - headerRow, 1).getValues();
          monthRevenue = data.reduce((sum, row) => {
            var value = row[0];
            return sum + (typeof value === 'number' ? value : 0);
          }, 0);
        }
      }
      revenueByMonth.push(monthRevenue);
    }
    
    // Top products data
    var productsData = {
      labels: ['iPhone 17 Pro Max', 'iPhone 16 Pro', 'iPhone 15 Pro Max', 'Khác'],
      data: [30, 25, 20, 25] // Mock data - should be calculated from actual data
    };
    
    return {
      success: true,
      totalTonKho: totalTonKho,
      totalRevenue: totalRevenue,
      totalNhap: totalNhap,
      totalBan: totalBan,
      revenueByMonth: revenueByMonth,
      productsData: productsData
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get TonKho data with pagination and filters
 */
function getTonKhoData(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tonKhoSheet = ss.getSheetByName('TonKho');
  
  if (!tonKhoSheet) {
    return { success: false, error: 'TonKho sheet not found' };
  }
  
  try {
    var headerRow = findHeaderRow(tonKhoSheet);
    var headers = tonKhoSheet.getRange(headerRow, 1, 1, tonKhoSheet.getLastColumn()).getValues()[0]
                             .map(h => h.toString().trim().toUpperCase());
    
    var page = parseInt(params.page) || 1;
    var pageSize = parseInt(params.pageSize) || 20;
    var search = params.search || '';
    var dongMay = params.dongMay || '';
    var dungLuong = params.dungLuong || '';
    
    // Get all data
    var allData = tonKhoSheet.getRange(headerRow + 1, 1, tonKhoSheet.getLastRow() - headerRow, tonKhoSheet.getLastColumn()).getValues();
    
    // Apply filters
    var filteredData = allData.filter(row => {
      if (search) {
        var searchLower = search.toLowerCase();
        var imei = (row[headers.indexOf('IMEI')] || '').toString().toLowerCase();
        var dongMayValue = (row[headers.indexOf('DÒNG MÁY')] || '').toString().toLowerCase();
        if (!imei.includes(searchLower) && !dongMayValue.includes(searchLower)) {
          return false;
        }
      }
      
      if (dongMay) {
        var rowDongMay = (row[headers.indexOf('DÒNG MÁY')] || '').toString();
        if (rowDongMay !== dongMay) {
          return false;
        }
      }
      
      if (dungLuong) {
        var rowDungLuong = (row[headers.indexOf('DUNG LƯỢNG')] || '').toString();
        if (rowDungLuong !== dungLuong) {
          return false;
        }
      }
      
      return true;
    });
    
    // Pagination
    var total = filteredData.length;
    var startIndex = (page - 1) * pageSize;
    var endIndex = Math.min(startIndex + pageSize, total);
    var pageData = filteredData.slice(startIndex, endIndex);
    
    // Convert to objects
    var items = pageData.map(row => {
      var item = {};
      headers.forEach((header, index) => {
        item[header.toLowerCase().replace(/\s+/g, '')] = row[index];
      });
      return item;
    });
    
    return {
      success: true,
      items: items,
      total: total,
      page: page,
      pageSize: pageSize
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get NhapHang data with pagination and filters
 */
function getNhapHangData(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var nhapHangSheet = ss.getSheetByName('NhapHang');
  
  if (!nhapHangSheet) {
    return { success: false, error: 'NhapHang sheet not found' };
  }
  
  try {
    var headerRow = findHeaderRow(nhapHangSheet);
    var headers = nhapHangSheet.getRange(headerRow, 1, 1, nhapHangSheet.getLastColumn()).getValues()[0]
                               .map(h => h.toString().trim().toUpperCase());
    
    var page = parseInt(params.page) || 1;
    var pageSize = parseInt(params.pageSize) || 20;
    var search = params.search || '';
    var dateFrom = params.dateFrom || '';
    var dateTo = params.dateTo || '';
    var nhaCungCap = params.nhaCungCap || '';
    
    // Get all data
    var allData = nhapHangSheet.getRange(headerRow + 1, 1, nhapHangSheet.getLastRow() - headerRow, nhapHangSheet.getLastColumn()).getValues();
    
    // Apply filters
    var filteredData = allData.filter(row => {
      if (search) {
        var searchLower = search.toLowerCase();
        var imei = (row[headers.indexOf('IMEI')] || '').toString().toLowerCase();
        var ncc = (row[headers.indexOf('NHÀ CUNG CẤP')] || '').toString().toLowerCase();
        if (!imei.includes(searchLower) && !ncc.includes(searchLower)) {
          return false;
        }
      }
      
      if (dateFrom) {
        var ngayNhap = new Date(row[headers.indexOf('NGÀY NHẬP')]);
        var fromDate = new Date(dateFrom);
        if (ngayNhap < fromDate) {
          return false;
        }
      }
      
      if (dateTo) {
        var ngayNhap = new Date(row[headers.indexOf('NGÀY NHẬP')]);
        var toDate = new Date(dateTo);
        if (ngayNhap > toDate) {
          return false;
        }
      }
      
      if (nhaCungCap) {
        var rowNCC = (row[headers.indexOf('NHÀ CUNG CẤP')] || '').toString();
        if (rowNCC !== nhaCungCap) {
          return false;
        }
      }
      
      return true;
    });
    
    // Pagination
    var total = filteredData.length;
    var startIndex = (page - 1) * pageSize;
    var endIndex = Math.min(startIndex + pageSize, total);
    var pageData = filteredData.slice(startIndex, endIndex);
    
    // Convert to objects
    var items = pageData.map(row => {
      var item = {};
      headers.forEach((header, index) => {
        item[header.toLowerCase().replace(/\s+/g, '')] = row[index];
      });
      return item;
    });
    
    return {
      success: true,
      items: items,
      total: total,
      page: page,
      pageSize: pageSize
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get BanHang data for specific month
 */
function getBanHangData(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var month = params.month || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM');
  var banHangSheet = ss.getSheetByName('BanHangT' + month);
  
  if (!banHangSheet) {
    return { success: false, error: 'BanHang sheet for month ' + month + ' not found' };
  }
  
  try {
    var headerRow = findHeaderRow(banHangSheet);
    var headers = banHangSheet.getRange(headerRow, 1, 1, banHangSheet.getLastColumn()).getValues()[0]
                              .map(h => h.toString().trim().toUpperCase());
    
    var page = parseInt(params.page) || 1;
    var pageSize = parseInt(params.pageSize) || 20;
    
    // Get all data
    var allData = banHangSheet.getRange(headerRow + 1, 1, banHangSheet.getLastRow() - headerRow, banHangSheet.getLastColumn()).getValues();
    
    // Pagination
    var total = allData.length;
    var startIndex = (page - 1) * pageSize;
    var endIndex = Math.min(startIndex + pageSize, total);
    var pageData = allData.slice(startIndex, endIndex);
    
    // Convert to objects
    var items = pageData.map(row => {
      var item = {};
      headers.forEach((header, index) => {
        item[header.toLowerCase().replace(/\s+/g, '')] = row[index];
      });
      return item;
    });
    
    // Calculate summary
    var summary = {
      totalSales: total,
      totalRevenue: 0,
      totalProfit: 0
    };
    
    var giaBanIndex = headers.indexOf('GIÁ BÁN');
    var loiNhuanIndex = headers.indexOf('LỢI NHUẬN');
    
    if (giaBanIndex >= 0) {
      var revenueData = banHangSheet.getRange(headerRow + 1, giaBanIndex + 1, total, 1).getValues();
      summary.totalRevenue = revenueData.reduce((sum, row) => {
        var value = row[0];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    }
    
    if (loiNhuanIndex >= 0) {
      var profitData = banHangSheet.getRange(headerRow + 1, loiNhuanIndex + 1, total, 1).getValues();
      summary.totalProfit = profitData.reduce((sum, row) => {
        var value = row[0];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    }
    
    return {
      success: true,
      items: items,
      total: total,
      page: page,
      pageSize: pageSize,
      summary: summary
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get XuatHuy data
 */
function getXuatHuyData(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var xuatHuySheet = ss.getSheetByName('XuatHuy');
  
  if (!xuatHuySheet) {
    return { success: false, error: 'XuatHuy sheet not found' };
  }
  
  try {
    var headerRow = findHeaderRow(xuatHuySheet);
    var headers = xuatHuySheet.getRange(headerRow, 1, 1, xuatHuySheet.getLastColumn()).getValues()[0]
                              .map(h => h.toString().trim().toUpperCase());
    
    var page = parseInt(params.page) || 1;
    var pageSize = parseInt(params.pageSize) || 20;
    
    // Get all data
    var allData = xuatHuySheet.getRange(headerRow + 1, 1, xuatHuySheet.getLastRow() - headerRow, xuatHuySheet.getLastColumn()).getValues();
    
    // Pagination
    var total = allData.length;
    var startIndex = (page - 1) * pageSize;
    var endIndex = Math.min(startIndex + pageSize, total);
    var pageData = allData.slice(startIndex, endIndex);
    
    // Convert to objects
    var items = pageData.map(row => {
      var item = {};
      headers.forEach((header, index) => {
        item[header.toLowerCase().replace(/\s+/g, '')] = row[index];
      });
      return item;
    });
    
    return {
      success: true,
      items: items,
      total: total,
      page: page,
      pageSize: pageSize
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Search IMEI history
 */
function searchIMEIHistory(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var imeiList = params.imeiList || [];
  
  if (!Array.isArray(imeiList)) {
    imeiList = [imeiList];
  }
  
  try {
    var history = [];
    
    // Search in NhapHang
    var nhapHangSheet = ss.getSheetByName('NhapHang');
    if (nhapHangSheet) {
      var headerRow = findHeaderRow(nhapHangSheet);
      var headers = nhapHangSheet.getRange(headerRow, 1, 1, nhapHangSheet.getLastColumn()).getValues()[0]
                                 .map(h => h.toString().trim().toUpperCase());
      
      var data = nhapHangSheet.getRange(headerRow + 1, 1, nhapHangSheet.getLastRow() - headerRow, nhapHangSheet.getLastColumn()).getValues();
      
      data.forEach(row => {
        var imei = (row[headers.indexOf('IMEI')] || '').toString().trim().toUpperCase();
        if (imeiList.includes(imei)) {
          history.push({
            type: 'Nhập',
            imei: imei,
            date: row[headers.indexOf('NGÀY NHẬP')],
            dongMay: row[headers.indexOf('DÒNG MÁY')],
            dungLuong: row[headers.indexOf('DUNG LƯỢNG')],
            mauSac: row[headers.indexOf('MÀU SẮC')],
            supplier: row[headers.indexOf('NHÀ CUNG CẤP')],
            customer: '',
            txIn: row[headers.indexOf('TX_NHAP')],
            txOut: '',
            priceIn: row[headers.indexOf('GIÁ NHẬP')],
            priceOut: '',
            profit: ''
          });
        }
      });
    }
    
    // Search in BanHangTxx sheets
    var sheets = ss.getSheets();
    sheets.forEach(sheet => {
      var sheetName = sheet.getName();
      if (sheetName.indexOf('BanHangT') === 0) {
        var headerRow = findHeaderRow(sheet);
        var headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0]
                           .map(h => h.toString().trim().toUpperCase());
        
        var data = sheet.getRange(headerRow + 1, 1, sheet.getLastRow() - headerRow, sheet.getLastColumn()).getValues();
        
        data.forEach(row => {
          var imei = (row[headers.indexOf('IMEI')] || '').toString().trim().toUpperCase();
          if (imeiList.includes(imei)) {
            history.push({
              type: 'Bán',
              imei: imei,
              date: row[headers.indexOf('NGÀY BÁN')],
              dongMay: row[headers.indexOf('DÒNG MÁY')],
              dungLuong: row[headers.indexOf('DUNG LƯỢNG')],
              mauSac: row[headers.indexOf('MÀU SẮC')],
              supplier: row[headers.indexOf('NHÀ CUNG CẤP')],
              customer: row[headers.indexOf('KHÁCH HÀNG')],
              txIn: row[headers.indexOf('TX_NHAP')],
              txOut: row[headers.indexOf('TX_XUAT')],
              priceIn: row[headers.indexOf('GIÁ NHẬP')],
              priceOut: row[headers.indexOf('GIÁ BÁN')],
              profit: row[headers.indexOf('LỢI NHUẬN')]
            });
          }
        });
      }
    });
    
    // Sort by date
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      success: true,
      history: history
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get BaoCao data
 */
function getBaoCaoData(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var baoCaoSheet = ss.getSheetByName('BaoCao');
  
  if (!baoCaoSheet) {
    return { success: false, error: 'BaoCao sheet not found' };
  }
  
  try {
    var headerRow = findHeaderRow(baoCaoSheet);
    var headers = baoCaoSheet.getRange(headerRow, 1, 1, baoCaoSheet.getLastColumn()).getValues()[0]
                             .map(h => h.toString().trim().toUpperCase());
    
    // Get all data
    var allData = baoCaoSheet.getRange(headerRow + 1, 1, baoCaoSheet.getLastRow() - headerRow, baoCaoSheet.getLastColumn()).getValues();
    
    // Convert to objects
    var items = allData.map(row => {
      var item = {};
      headers.forEach((header, index) => {
        item[header.toLowerCase().replace(/\s+/g, '')] = row[index];
      });
      return item;
    });
    
    // Calculate summary
    var summary = {
      totalQuantity: 0,
      totalValue: 0
    };
    
    var soLuongIndex = headers.indexOf('SỐ LƯỢNG');
    var giaTriIndex = headers.indexOf('GIÁ TRỊ');
    
    if (soLuongIndex >= 0) {
      summary.totalQuantity = allData.reduce((sum, row) => {
        var value = row[soLuongIndex];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    }
    
    if (giaTriIndex >= 0) {
      summary.totalValue = allData.reduce((sum, row) => {
        var value = row[giaTriIndex];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    }
    
    return {
      success: true,
      items: items,
      summary: summary
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to find header row
 */
function findHeaderRow(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return 1;
  
  for (var i = 1; i <= Math.min(5, lastRow); i++) {
    var range = sheet.getRange(i, 1, 1, sheet.getLastColumn());
    var values = range.getValues()[0];
    
    // Check if this row contains typical header values
    var hasHeaders = values.some(value => {
      var str = value.toString().trim().toUpperCase();
      return str.includes('STT') || str.includes('IMEI') || str.includes('DÒNG MÁY');
    });
    
    if (hasHeaders) {
      return i;
    }
  }
  
  return 1; // Default to first row
}

// Placeholder functions for POST operations
function updateTonKhoRecord(params) {
  return { success: true, message: 'Update TonKho record - Implementation needed' };
}

function addTonKhoRecord(params) {
  return { success: true, message: 'Add TonKho record - Implementation needed' };
}

function updateNhapHangRecord(params) {
  return { success: true, message: 'Update NhapHang record - Implementation needed' };
}

function addNhapHangRecord(params) {
  return { success: true, message: 'Add NhapHang record - Implementation needed' };
}

function updateBanHangRecord(params) {
  return { success: true, message: 'Update BanHang record - Implementation needed' };
}

function addBanHangRecord(params) {
  return { success: true, message: 'Add BanHang record - Implementation needed' };
}

function updateXuatHuyRecord(params) {
  return { success: true, message: 'Update XuatHuy record - Implementation needed' };
}

function addXuatHuyRecord(params) {
  return { success: true, message: 'Add XuatHuy record - Implementation needed' };
}

function generateBaoCaoData() {
  return { success: true, message: 'Generate BaoCao data - Implementation needed' };
}

function syncDataOperation() {
  return { success: true, message: 'Sync data operation - Implementation needed' };
}

function calculateProfitOperation() {
  return { success: true, message: 'Calculate profit operation - Implementation needed' };
}

function compareTonKhoOperation() {
  return { success: true, message: 'Compare TonKho operation - Implementation needed' };
}

function backupDataOperation() {
  return { success: true, message: 'Backup data operation - Implementation needed' };
}
