package com.example.webNhaHangThanhHoa.Service.Customer;
import com.example.webNhaHangThanhHoa.Request.CustomerRequest;
import com.example.webNhaHangThanhHoa.Entity.customers;

import java.util.List;

public interface ICustomerService {
    customers checkInCustomer(CustomerRequest request);
    List<customers> getAllCustomers();
}