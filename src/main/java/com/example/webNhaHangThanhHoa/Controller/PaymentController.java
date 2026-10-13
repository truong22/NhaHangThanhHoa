package com.example.webNhaHangThanhHoa.Controller;

import com.example.webNhaHangThanhHoa.DTO.PaymentDto;
import com.example.webNhaHangThanhHoa.Request.PaymentRequest;
import com.example.webNhaHangThanhHoa.Service.Payment.IPaymentService;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final IPaymentService paymentService;


    // =====================================================
    // GET ALL
    // =====================================================

    @GetMapping@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getAllPayments() {

        List<PaymentDto> data =
                paymentService.getAllPayments();

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy danh sách Payment thành công",
                        data
                )
        );
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @GetMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getPaymentById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy Payment thành công",
                        paymentService.getPaymentById(id)
                )
        );
    }


    // =====================================================
    // GET BY INVOICE
    // =====================================================

    @GetMapping("/invoice/{invoiceId}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getPaymentByInvoice(
            @PathVariable Long invoiceId) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy Payment theo Invoice thành công",
                        paymentService.getPaymentByInvoice(
                                invoiceId
                        )
                )
        );
    }


    // =====================================================
    // GET BY STATUS
    // =====================================================

    @GetMapping("/status/{status}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByStatus(
            @PathVariable String status) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy Payment theo trạng thái thành công",
                        paymentService.getByStatus(status)
                )
        );
    }


    // =====================================================
    // GET BY METHOD
    // =====================================================

    @GetMapping("/method/{method}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByPaymentMethod(
            @PathVariable String method) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy Payment theo phương thức thành công",
                        paymentService.getByPaymentMethod(method)
                )
        );
    }


    // =====================================================
    // ADD PAYMENT
    // =====================================================

    @PostMapping@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> addPayment(
            @Valid @RequestBody PaymentRequest request) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Tạo Payment thành công",
                        paymentService.addPayment(request)
                )
        );
    }


    // =====================================================
    // UPDATE STATUS
    // =====================================================

    @PutMapping("/{id}/status")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Cập nhật trạng thái Payment thành công",
                        paymentService.updateStatus(
                                id,
                                status
                        )
                )
        );
    }


    // =====================================================
    // DELETE
    // =====================================================

    @DeleteMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse> deletePayment(
            @PathVariable Long id) {

        paymentService.deletePayment(id);

        return ResponseEntity.ok(
                new ApiResponse(
                        "Xóa Payment thành công",
                        null
                )
        );
    }
}
