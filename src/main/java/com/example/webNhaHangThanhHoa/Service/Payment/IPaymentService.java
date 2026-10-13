package com.example.webNhaHangThanhHoa.Service.Payment;

import com.example.webNhaHangThanhHoa.DTO.PaymentDto;
import com.example.webNhaHangThanhHoa.Entity.payments;
import com.example.webNhaHangThanhHoa.Request.PaymentRequest;

import java.util.List;

public interface IPaymentService {

    List<PaymentDto> getAllPayments();

    PaymentDto getPaymentById(Long id);

    PaymentDto getPaymentByInvoice(Long invoiceId);

    List<PaymentDto> getByStatus(String status);

    List<PaymentDto> getByPaymentMethod(
            String paymentMethod
    );

    PaymentDto addPayment(
            PaymentRequest request
    );

    PaymentDto updateStatus(
            Long id,
            String status
    );

    void deletePayment(Long id);

    PaymentDto convertToDto(
            payments payment
    );
}

