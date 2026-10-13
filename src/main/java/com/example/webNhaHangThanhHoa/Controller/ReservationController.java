package com.example.webNhaHangThanhHoa.Controller;
import com.example.webNhaHangThanhHoa.DTO.ReservationDto;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Request.ReservationRequest;
import com.example.webNhaHangThanhHoa.Service.Reservation.IReservationService;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final IReservationService reservationService;


    // =====================================================
    // GET ALL
    // =====================================================

    @GetMapping("/all")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getAllReservations() {

        try {

            List<ReservationDto> reservations =
                    reservationService
                            .getAllReservations();

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy danh sách đặt bàn thành công",
                            reservations
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @GetMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getReservationById(
            @PathVariable Long id) {

        try {

            ReservationDto reservation =
                    reservationService
                            .getReservationById(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm thấy đặt bàn",
                            reservation
                    )
            );

        } catch (ResourceNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // GET BY CODE
    // =====================================================

    @GetMapping("/code")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByCode(
            @RequestParam String code) {

        try {

            ReservationDto reservation =
                    reservationService
                            .getReservationByCode(code);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Tìm thấy đặt bàn",
                            reservation
                    )
            );

        } catch (ResourceNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // ADD
    // =====================================================

    @PostMapping("/add")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> addReservation(
            @Valid
            @RequestBody ReservationRequest request) {

        try {

            ReservationDto reservation =
                    reservationService
                            .addReservation(request);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            new ApiResponse(
                                    "Đặt bàn thành công",
                                    reservation
                            )
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // UPDATE
    // =====================================================

    @PutMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> updateReservation(

            @PathVariable Long id,

            @Valid
            @RequestBody ReservationRequest request) {

        try {

            ReservationDto reservation =
                    reservationService
                            .updateReservation(
                                    id,
                                    request
                            );

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Cập nhật đặt bàn thành công",
                            reservation
                    )
            );

        } catch (ResourceNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // DELETE
    // =====================================================

    @DeleteMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> deleteReservation(
            @PathVariable Long id) {

        try {

            reservationService
                    .deleteReservation(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Xóa đặt bàn thành công",
                            null
                    )
            );

        } catch (ResourceNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            new ApiResponse(
                                    "Có lỗi xảy ra",
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // TÌM THEO NGÀY
    // =====================================================

    @GetMapping("/date")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByDate(
            @RequestParam LocalDate date) {

        try {

            List<ReservationDto> reservations =
                    reservationService
                            .getByDate(date);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy đặt bàn theo ngày thành công",
                            reservations
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // TÌM THEO STATUS
    // =====================================================

    @GetMapping("/status/{status}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByStatus(
            @PathVariable String status) {

        try {

            List<ReservationDto> reservations =
                    reservationService
                            .getByStatus(status);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy đặt bàn theo trạng thái thành công",
                            reservations
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // TÌM THEO KHÁCH HÀNG
    // =====================================================

    @GetMapping("/customer/{customerId}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByCustomer(
            @PathVariable Long customerId) {

        try {

            List<ReservationDto> reservations =
                    reservationService
                            .getByCustomer(customerId);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy đặt bàn của khách hàng thành công",
                            reservations
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // TÌM THEO BÀN
    // =====================================================

    @GetMapping("/table/{tableId}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByTable(
            @PathVariable Long tableId) {

        try {

            List<ReservationDto> reservations =
                    reservationService
                            .getByTable(tableId);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy đặt bàn của bàn thành công",
                            reservations
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // ĐẶT BÀN SẮP TỚI
    // =====================================================

    @GetMapping("/upcoming")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getUpcomingReservations() {

        try {

            List<ReservationDto> reservations =
                    reservationService
                            .getUpcomingReservations();

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Lấy danh sách đặt bàn sắp tới thành công",
                            reservations
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // CẢNH BÁO 30 PHÚT
    // =====================================================

    @GetMapping("/warning")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse> getWarningReservations() {

        try {

            List<ReservationDto> reservations =
                    reservationService
                            .getWarningReservations();

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Danh sách bàn sắp có khách đặt trong 30 phút",
                            reservations
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse(
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }

    // =====================================================
    // CHUYỂN BÀN CHO CA ĐẶT TRƯỚC (RESERVATION SWITCH TABLE)
    // =====================================================
    @PutMapping("/{id}/switch-table/{newTableId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> switchTable(
            @PathVariable Long id,
            @PathVariable Long newTableId) {
        try {
            ReservationDto reservation = reservationService.switchTable(id, newTableId);
            return ResponseEntity.ok(
                    new ApiResponse("Chuyển bàn cho ca đặt trước thành công", reservation)
            );
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse(e.getMessage(), null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiResponse(e.getMessage(), null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiResponse("Có lỗi xảy ra", null));
        }
    }
}
