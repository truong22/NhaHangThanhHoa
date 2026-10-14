package com.example.webNhaHangThanhHoa.Service.Customer;
import com.example.webNhaHangThanhHoa.Request.CustomerRequest;
import com.example.webNhaHangThanhHoa.Entity.customers;
import com.example.webNhaHangThanhHoa.Repository.CustomerRepository;
import com.example.webNhaHangThanhHoa.Request.CustomerRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomerService implements ICustomerService {

        private final CustomerRepository customerRepository;

        @Override
        public customers checkInCustomer(CustomerRequest request) {
            String phone = request.getPhone() != null ? request.getPhone().trim() : "";
            String fullName = request.getFullName() != null ? request.getFullName().trim() : "";
            if (fullName.isEmpty()) {
                fullName = "Khách vãng lai";
            }

            // 1. Xử lý KHÁCH VÃNG LAI (không nhập SĐT hoặc SĐT là 0000000000)
            if (phone.isEmpty() || "0000000000".equals(phone)) {
                // Nếu tên là "Khách vãng lai" -> Dùng bản ghi chung duy nhất cho Khách vãng lai
                if ("Khách vãng lai".equalsIgnoreCase(fullName)) {
                    Optional<customers> defaultWalkIn = customerRepository.findByPhone("0000000000");
                    if (defaultWalkIn.isPresent()) {
                        customers walkIn = defaultWalkIn.get();
                        if (!"Khách vãng lai".equals(walkIn.getFullName())) {
                            walkIn.setFullName("Khách vãng lai");
                            return customerRepository.save(walkIn);
                        }
                        return walkIn;
                    } else {
                        customers walkIn = new customers();
                        walkIn.setFullName("Khách vãng lai");
                        walkIn.setPhone("0000000000");
                        walkIn.setVisitCount(0);
                        return customerRepository.save(walkIn);
                    }
                } else {
                    // Người dùng nhập tên riêng nhưng không nhập SĐT
                    // Sinh mã định danh riêng duy nhất để không vi phạm ràng buộc UNIQUE của cột phone
                    customers customWalkIn = new customers();
                    customWalkIn.setFullName(fullName);
                    customWalkIn.setPhone("VL" + (System.currentTimeMillis() % 10000000000L));
                    customWalkIn.setVisitCount(1);
                    return customerRepository.save(customWalkIn);
                }
            }

            // 2. Xử lý KHÁCH CÓ SỐ ĐIỆN THOẠI THẬT
            Optional<customers> existingCustomer = customerRepository.findByPhone(phone);
            customers customer;
            if (existingCustomer.isPresent()) {
                // ---- KHÁCH CŨ: Đã có SĐT -> Tăng số lần ghé và cập nhật tên nếu có ----
                customer = existingCustomer.get();
                if (!"Khách vãng lai".equalsIgnoreCase(fullName)) {
                    customer.setFullName(fullName);
                }
                int currentVisits = customer.getVisitCount() != null ? customer.getVisitCount() : 0;
                customer.setVisitCount(currentVisits + 1);
            } else {
                // ---- KHÁCH MỚI CÓ SĐT ----
                customer = new customers();
                customer.setFullName(fullName);
                customer.setPhone(phone);
                customer.setVisitCount(1);
            }

            return customerRepository.save(customer);
        }

        @Override
        public List<customers> getAllCustomers() {
            return customerRepository.findAll();
        }

        @Override
        public customers getCustomerById(Long id) {
            return customerRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + id));
        }

        @Override
        public customers getCustomerByPhone(String phone) {
            if (phone == null || phone.trim().isEmpty()) {
                throw new RuntimeException("Số điện thoại không được để trống!");
            }
            String cleanPhone = phone.trim();
            if ("0000000000".equals(cleanPhone)) {
                return customerRepository.findByPhone("0000000000")
                        .orElseGet(() -> {
                            customers walkIn = new customers();
                            walkIn.setFullName("Khách vãng lai");
                            walkIn.setPhone("0000000000");
                            walkIn.setVisitCount(0);
                            return customerRepository.save(walkIn);
                        });
            }
            return customerRepository.findByPhone(cleanPhone)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với số điện thoại: " + phone));
        }

        @Override
        public customers updateCustomer(Long id, CustomerRequest request) {
            customers customer = customerRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + id));

            if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
                customer.setFullName(request.getFullName().trim());
            }

            if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
                String newPhone = request.getPhone().trim();
                if (!newPhone.equals(customer.getPhone())) {
                    Optional<customers> duplicate = customerRepository.findByPhone(newPhone);
                    if (duplicate.isPresent() && !duplicate.get().getId().equals(id)) {
                        throw new RuntimeException("Số điện thoại '" + newPhone + "' đã thuộc về khách hàng khác!");
                    }
                    customer.setPhone(newPhone);
                }
            }

            return customerRepository.save(customer);
        }
    }