package com.example.webNhaHangThanhHoa.Controller;

import com.example.webNhaHangThanhHoa.Request.InvoiceRequest;
import com.example.webNhaHangThanhHoa.Service.Invoice.IInvoiceService;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final IInvoiceService invoiceService;


    // =====================================================
    // GET ALL
    // =====================================================

    @GetMapping("/all")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getAllInvoices() {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy danh sách hóa đơn thành công",
                        invoiceService.getAllInvoices()
                )
        );
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @GetMapping("/{id}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getInvoiceById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy hóa đơn thành công",
                        invoiceService.getInvoiceById(id)
                )
        );
    }


    // =====================================================
    // GET BY CODE
    // =====================================================

    @GetMapping("/code/{invoiceCode}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getInvoiceByCode(
            @PathVariable String invoiceCode) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy hóa đơn thành công",
                        invoiceService.getInvoiceByCode(
                                invoiceCode
                        )
                )
        );
    }


    // =====================================================
    // GET BY ORDER
    // =====================================================

    @GetMapping("/order/{orderId}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getInvoiceByOrder(
            @PathVariable Long orderId) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy hóa đơn theo Order thành công",
                        invoiceService.getInvoiceByOrder(
                                orderId
                        )
                )
        );
    }


    // =====================================================
    // ADD
    // =====================================================

    @PostMapping("/add")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> addInvoice(
            @Valid
            @RequestBody InvoiceRequest request) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Tạo hóa đơn thành công",
                        invoiceService.addInvoice(
                                request
                        )
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
                        "Cập nhật trạng thái hóa đơn thành công",
                        invoiceService.updateStatus(
                                id,
                                status
                        )
                )
        );
    }
    @PutMapping("/{id}/discount")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> updateDiscount(
            @PathVariable Long id,
            @RequestParam(required = false)
                    BigDecimal discountPercent,
            @RequestParam(required = false)
                    BigDecimal discountAmount) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Cập nhật giảm giá thành công",
                        invoiceService.updateDiscount(
                                id,
                                discountPercent,
                                discountAmount
                        )
                )
        );
    }

    // =====================================================
    // DELETE
    // =====================================================

    @DeleteMapping("/{id}")@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteInvoice(
            @PathVariable Long id) {

        invoiceService.deleteInvoice(id);

        return ResponseEntity.ok(
                new ApiResponse(
                        "Xóa hóa đơn thành công",
                        null
                )
        );
    }


    // =====================================================
    // BY CUSTOMER
    // =====================================================

    @GetMapping("/customer/{customerId}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByCustomer(
            @PathVariable Long customerId) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy hóa đơn theo khách hàng thành công",
                        invoiceService.getByCustomer(
                                customerId
                        )
                )
        );
    }


    // =====================================================
    // BY TABLE
    // =====================================================

    @GetMapping("/table/{tableId}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByTable(
            @PathVariable Long tableId) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy hóa đơn theo bàn thành công",
                        invoiceService.getByTable(
                                tableId
                        )
                )
        );
    }


    // =====================================================
    // BY STATUS
    // =====================================================

    @GetMapping("/status/{status}")@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse> getByStatus(
            @PathVariable String status) {

        return ResponseEntity.ok(
                new ApiResponse(
                        "Lấy hóa đơn theo trạng thái thành công",
                        invoiceService.getByStatus(
                                status
                        )
                )
        );
    }
}

