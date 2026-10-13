package com.example.webNhaHangThanhHoa.Controller;

import com.example.webNhaHangThanhHoa.DTO.OrderDto;
import com.example.webNhaHangThanhHoa.Entity.orders;
import com.example.webNhaHangThanhHoa.Request.OrderRequest;
import com.example.webNhaHangThanhHoa.Service.Order.IOrderService;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final IOrderService orderService;


    @GetMapping("/all")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getAllOrders() {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy danh sách Order thành công",
                        orderService.getAllOrders()
                )
        );
    }


    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getOrderById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Tìm thấy Order",
                        orderService.getOrderById(id)
                )
        );
    }


    @GetMapping("/code/{orderCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getOrderByCode(
            @PathVariable String orderCode) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Tìm thấy Order",
                        orderService.getOrderByCode(orderCode)
                )
        );
    }


    // =====================================================
    // TẠO ORDER
    // =====================================================

    @PostMapping("/add")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> addOrder(
            @Valid
            @RequestBody OrderRequest request) {

        try {

            orders order =
                    orderService.addOrder(request);

            OrderDto dto =
                    orderService.convertToDto(order);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            new ApiResponse(
                                    "Tạo Order thành công",
                                    dto
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
                                    e.getMessage(),
                                    null
                            )
                    );
        }
    }


    // =====================================================
    // UPDATE STATUS
    // =====================================================

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER', 'KITCHEN')")
    public ResponseEntity<ApiResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        try {

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Cập nhật trạng thái Order thành công",
                            orderService.updateOrderStatus(
                                    id,
                                    status
                            )
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
    // ĐỔI BÀN (SWITCH TABLE - DÀNH CHO ADMIN & CASHIER)
    // =====================================================

    @PutMapping("/{id}/switch-table/{newTableId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'STAFF')")
    public ResponseEntity<ApiResponse> switchTable(
            @PathVariable Long id,
            @PathVariable Long newTableId) {

        try {

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Đổi bàn thành công",
                            orderService.switchTable(id, newTableId)
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


    @DeleteMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteOrder(
            @PathVariable Long id) {

        try {

            orderService.deleteOrder(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Xóa Order thành công",
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
        }
    }


    @GetMapping("/table/{tableId}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByTable(
            @PathVariable Long tableId) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy Order theo bàn thành công",
                        orderService.getByTable(tableId)
                )
        );
    }


    @GetMapping("/customer/{customerId}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByCustomer(
            @PathVariable Long customerId) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy Order theo khách hàng thành công",
                        orderService.getByCustomer(
                                customerId
                        )
                )
        );
    }


    @GetMapping("/user/{userId}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse> getByUser(
            @PathVariable Long userId) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy Order theo nhân viên thành công",
                        orderService.getByUser(
                                userId
                        )
                )
        );
    }


    @GetMapping("/status/{status}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByStatus(
            @PathVariable String status) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy Order theo trạng thái thành công",
                        orderService.getByStatus(
                                status
                        )
                )
        );
    }


    @GetMapping("/active/table/{tableId}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse>
    getActiveOrdersByTable(
            @PathVariable Long tableId) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy Order đang hoạt động của bàn",
                        orderService
                                .getActiveOrdersByTable(
                                        tableId
                                )
                )
        );
    }
}

