package com.example.webNhaHangThanhHoa.DTO;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class PaymentDto {

    private Long id;

    // Invoice
    private Long invoiceId;
    private String invoiceCode;

    // Tiền
    private BigDecimal amount;

    // Thanh toán
    private String paymentMethod;

    private String status;

    private String transactionCode;

    private LocalDateTime paidAt;

    private LocalDateTime createdAt;
}
