package com.example.webNhaHangThanhHoa.DTO;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class OrderItemDto {

    private Long id;

    private Long orderId;

    private String orderCode;

    private Long tableId;

    private String tableName;

    private Long productId;

    private String productName;

    private Integer quantity;

    private BigDecimal unitPrice;

    private BigDecimal subtotal;

    private String note;

    private String status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
