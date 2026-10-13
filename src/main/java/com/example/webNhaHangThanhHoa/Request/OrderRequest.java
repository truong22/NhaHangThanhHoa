package com.example.webNhaHangThanhHoa.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class OrderRequest {

    @NotBlank(message = "Mã order không được để trống")
    @Size(max = 30)
    private String orderCode;

    @NotNull(message = "Bàn không được để trống")
    private Long tableId;

    @NotNull(message = "Khách hàng không được để trống")
    private Long customerId;

    @NotNull(message = "Nhân viên không được để trống")
    private Long userId;

    private String note;
}
