package com.example.webNhaHangThanhHoa.Request;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter; import lombok.NoArgsConstructor;
import lombok.Setter; import java.math.BigDecimal;
@Getter
@Setter
@NoArgsConstructor
public class InvoiceRequest {
    @NotNull(message = "Order không được để trống")
    private Long orderId;
    @DecimalMin(value = "0.0", message = "Phần trăm giảm giá không được âm")
    @DecimalMax(value = "100.0", message = "Phần trăm giảm giá không được lớn hơn 100")
    private BigDecimal discountPercent;
    @DecimalMin( value = "0.00", message = "Giảm giá không được nhỏ hơn 0" )
    private BigDecimal discountAmount = BigDecimal.ZERO;

    private String cashierName;
}