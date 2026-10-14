package com.example.webNhaHangThanhHoa.DTO;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
public class ReservationDto {

    private Long id;

    private String reservationCode;

    private Long customerId;

    private String customerName;

    private String customerPhone;

    private Integer visitCount;

    private Long tableId;

    private String tableNumber;

    private LocalDate reservationDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private Integer numberOfGuests;

    private String status;

    private String note;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}