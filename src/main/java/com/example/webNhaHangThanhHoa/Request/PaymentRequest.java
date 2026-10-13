package com.example.webNhaHangThanhHoa.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PaymentRequest {

    @NotNull(message = "Invoice không được để trống")
    private Long invoiceId;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    private String paymentMethod;

    private String transactionCode;
}
