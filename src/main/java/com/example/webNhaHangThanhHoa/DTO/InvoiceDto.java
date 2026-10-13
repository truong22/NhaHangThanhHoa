package com.example.webNhaHangThanhHoa.DTO;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class InvoiceDto {

    private Long id;

    private String invoiceCode;

    // Order
    private Long orderId;
    private String orderCode;

    // Customer
    private Long customerId;
    private String customerName;
    private String customerPhone;

    // Table
    private Long tableId;
    private String tableName;

    // Danh sách món
    private List<InvoiceItemDto> items;

    // Tiền
    private BigDecimal subtotal;

    private BigDecimal discountPercent;

    private BigDecimal discountAmount;

    private BigDecimal totalAmount;

    // Invoice
    private String status;
    private LocalDateTime issuedAt;

    // Payment
    private String paymentMethod;
    private String paymentStatus;
    private LocalDateTime paidAt;
}