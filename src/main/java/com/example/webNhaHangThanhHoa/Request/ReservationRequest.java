package com.example.webNhaHangThanhHoa.Request;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
public class ReservationRequest {

    @NotBlank(message = "Mã đặt bàn không được để trống")
    @Size(max = 30, message = "Mã đặt bàn không được quá 30 ký tự")
    private String reservationCode;

    @NotNull(message = "Khách hàng không được để trống")
    private Long customerId;

    @NotNull(message = "Bàn không được để trống")
    private Long tableId;

    @NotNull(message = "Ngày đặt bàn không được để trống")
    private LocalDate reservationDate;

    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalTime endTime;

    @NotNull(message = "Số lượng khách không được để trống")
    @Min(value = 1, message = "Số lượng khách phải lớn hơn 0")
    private Integer numberOfGuests;

    @Size(max = 255, message = "Ghi chú không được quá 255 ký tự")
    private String note;
}