package com.example.webNhaHangThanhHoa.DTO;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RevenueDto {

    // Khoảng thời gian thống kê
    private LocalDate fromDate;
    private LocalDate toDate;

    // Tổng doanh thu
    private BigDecimal totalRevenue;

    // Tổng số hóa đơn đã thanh toán
    private Long totalInvoices;

    // Trung bình tiền / hóa đơn
    private BigDecimal averageInvoice;

    // Tổng số món đã bán
    private Long totalItemsSold;

    // Chi tiết các món
    private List<RevenueItemDto> items;

    // Món bán chạy nhất
    private RevenueItemDto bestSellingItem;

    // Doanh thu theo ngày
    private List<RevenueByDateDto> revenueByDate;

    // Doanh thu theo phương thức thanh toán
    private List<RevenueByPaymentDto> revenueByPayment;
}