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
            // Tìm kiếm khách hàng theo số điện thoại
            Optional<customers> existingCustomer = customerRepository.findByPhone(request.getPhone());

            customers customer;
            if (existingCustomer.isPresent()) {
                // ---- KHÁCH CŨ: Đã có SĐT -> Giữ nguyên thông tin, chỉ tăng số lần ghé ----
                customer = existingCustomer.get();
                customer.setVisitCount(customer.getVisitCount() + 1);
            } else {
                // ---- KHÁCH MỚI: Chưa có SĐT -> Thêm mới kèm tên và số điện thoại ----
                customer = new customers();
                customer.setFullName(request.getFullName());
                customer.setPhone(request.getPhone());
                customer.setVisitCount(1);
            }

            return customerRepository.save(customer);
        }

        @Override
        public List<customers> getAllCustomers() {
            return customerRepository.findAll();
        }
    }