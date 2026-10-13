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
       @PreAuthorize("hasRole('ADMIN')")
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
    }