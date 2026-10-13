package com.example.webNhaHangThanhHoa.DTO;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RevenueByPaymentDto {

    private String paymentMethod;

    private BigDecimal revenue;

    private Long invoiceCount;
}
