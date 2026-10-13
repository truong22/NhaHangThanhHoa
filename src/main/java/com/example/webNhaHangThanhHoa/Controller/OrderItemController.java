package com.example.webNhaHangThanhHoa.Controller;

import com.example.webNhaHangThanhHoa.DTO.OrderItemDto;
import com.example.webNhaHangThanhHoa.Entity.order_items;
import com.example.webNhaHangThanhHoa.Request.OrderItemRequest;
import com.example.webNhaHangThanhHoa.Service.OrderItem.IOrderItemService;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/order-items")
@RequiredArgsConstructor
public class OrderItemController {

    private final IOrderItemService orderItemService;


    // =====================================================
    // GET ALL
    // =====================================================

    @GetMapping("/all")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getAll() {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy danh sách OrderItem thành công",
                        orderItemService.getAllOrderItems()
                )
        );
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @GetMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Tìm thấy OrderItem",
                        orderItemService
                                .getOrderItemById(id)
                )
        );
    }


    // =====================================================
    // THÊM MÓN VÀO ORDER
    // =====================================================

    @PostMapping("/add")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> addOrderItem(
            @Valid
            @RequestBody OrderItemRequest request) {

        try {

            order_items item =
                    orderItemService.addOrderItem(
                            request
                    );

            OrderItemDto dto =
                    orderItemService.convertToDto(
                            item
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            new ApiResponse(
                                    "Thêm món vào Order thành công",
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
    // LẤY MÓN CỦA ORDER
    // =====================================================

    @GetMapping("/order/{orderId}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByOrder(
            @PathVariable Long orderId) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy món của Order thành công",
                        orderItemService.getByOrder(
                                orderId
                        )
                )
        );
    }


    // =====================================================
    // BẾP - MÓN CẦN LÀM
    // =====================================================

    @GetMapping("/kitchen")@PreAuthorize("hasAnyRole('ADMIN', 'KITCHEN')")
    public ResponseEntity<ApiResponse> getKitchenItems() {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Danh sách món bếp cần xử lý",
                        orderItemService
                                .getKitchenItems()
                )
        );
    }


    // =====================================================
    // THEO STATUS
    // =====================================================

    @GetMapping("/status/{status}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'KITCHEN')")
    public ResponseEntity<ApiResponse> getByStatus(
            @PathVariable String status) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy OrderItem theo trạng thái thành công",
                        orderItemService
                                .getByStatus(status)
                )
        );
    }


    // =====================================================
    // BẾP ĐỔI STATUS
    // =====================================================

    @PutMapping("/{id}/status")@PreAuthorize("hasAnyRole('ADMIN', 'KITCHEN')")
    public ResponseEntity<ApiResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        try {

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Cập nhật trạng thái món thành công",
                            orderItemService.updateStatus(
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
    // DELETE
    // =====================================================

    @DeleteMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
    public ResponseEntity<ApiResponse> delete(
            @PathVariable Long id) {

        try {

            orderItemService.deleteOrderItem(id);

            return ResponseEntity.ok(
                    new ApiResponse(
                            "Xóa OrderItem thành công",
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
}

