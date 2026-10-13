package com.example.webNhaHangThanhHoa.Request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class ProductRequest {

    @NotBlank(message = "Tên món không được để trống")
    @Size(max = 150)
    private String name;

    @Size(max = 1000)
    private String description;

    @NotNull(message = "Giá món không được để trống")
    @DecimalMin(
            value = "0.01",
            message = "Giá phải lớn hơn 0"
    )
    @Digits(integer = 10, fraction = 2)
    private BigDecimal price;

    @NotBlank(message = "Trạng thái không được để trống")
    private String status;

    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;
}
