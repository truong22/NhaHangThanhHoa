package com.example.webNhaHangThanhHoa.DTO;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class OrderDto {

    private Long id;

    private String orderCode;

    private Long tableId;

    private String tableName;

    private Long customerId;

    private String customerName;

    private Long userId;

    private String username;

    private BigDecimal subtotal;

    private String note;

    private String status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime completedAt;
}
