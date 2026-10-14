package com.example.webNhaHangThanhHoa.Controller;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import com.example.webNhaHangThanhHoa.Request.CustomerRequest;
import com.example.webNhaHangThanhHoa.Entity.customers;
import com.example.webNhaHangThanhHoa.Service.Customer.ICustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {
        private final ICustomerService customerService;

        // API Check-in tại quầy cho nhân viên (Công khai / Public)
        @PostMapping("/check-in")@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
        public ResponseEntity<ApiResponse> checkIn(@RequestBody CustomerRequest request) {
            try {
                customers savedCustomer = customerService.checkInCustomer(request);
                return ResponseEntity.ok(
                        new ApiResponse("Check-in thành công!", savedCustomer)
                );
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(
                        new ApiResponse("Lỗi khi check-in: " + e.getMessage(), null)
                );
            }
        }

        // API Xem danh sách toàn bộ khách hàng (CHỈ DÀNH CHO ADMIN)
        @GetMapping
        @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
        public ResponseEntity<ApiResponse> getAllCustomers() {
            try {
                List<customers> list = customerService.getAllCustomers();
                return ResponseEntity.ok(
                        new ApiResponse("Lấy danh sách khách hàng thành công!", list)
                );
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(
                        new ApiResponse("Lỗi: " + e.getMessage(), null)
                );
            }
        }

        // API Tìm khách hàng theo SĐT (để kiểm tra khách quen, số lần ghé)
        @GetMapping("/by-phone/{phone}")
        @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
        public ResponseEntity<ApiResponse> getCustomerByPhone(@PathVariable String phone) {
            try {
                customers customer = customerService.getCustomerByPhone(phone);
                return ResponseEntity.ok(
                        new ApiResponse("Tìm thấy thông tin khách hàng", customer)
                );
            } catch (Exception e) {
                return ResponseEntity.status(404).body(
                        new ApiResponse(e.getMessage(), null)
                );
            }
        }

        // API Lấy chi tiết khách hàng theo ID
        @GetMapping("/{id}")
        @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
        public ResponseEntity<ApiResponse> getCustomerById(@PathVariable Long id) {
            try {
                customers customer = customerService.getCustomerById(id);
                return ResponseEntity.ok(
                        new ApiResponse("Tìm thấy thông tin khách hàng", customer)
                );
            } catch (Exception e) {
                return ResponseEntity.status(404).body(
                        new ApiResponse(e.getMessage(), null)
                );
            }
        }

        // API Sửa thông tin khách hàng (Tên, SĐT)
        @PutMapping("/{id}")
        @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CASHIER')")
        public ResponseEntity<ApiResponse> updateCustomer(
                @PathVariable Long id,
                @RequestBody CustomerRequest request) {
            try {
                customers updated = customerService.updateCustomer(id, request);
                return ResponseEntity.ok(
                        new ApiResponse("Cập nhật thông tin khách hàng thành công!", updated)
                );
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(
                        new ApiResponse("Lỗi cập nhật khách hàng: " + e.getMessage(), null)
                );
            }
        }
    }