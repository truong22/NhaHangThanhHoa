package com.example.webNhaHangThanhHoa.Request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class OrderItemRequest {

    @NotNull(message = "Order không được để trống")
    private Long orderId;

    @NotNull(message = "Sản phẩm không được để trống")
    private Long productId;

    @NotNull(message = "Số lượng không được để trống")
    @Min(
            value = 1,
            message = "Số lượng phải lớn hơn 0"
    )
    private Integer quantity;

    private String note;
}
