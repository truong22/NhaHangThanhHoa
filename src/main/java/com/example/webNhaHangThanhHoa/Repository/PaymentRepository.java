package com.example.webNhaHangThanhHoa.Repository;

import com.example.webNhaHangThanhHoa.Entity.payments;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository
        extends JpaRepository<payments, Long> {

    // =====================================================
    // THEO INVOICE
    // =====================================================

    Optional<payments> findByInvoiceId(
            Long invoiceId
    );


    // =====================================================
    // KIỂM TRA INVOICE ĐÃ THANH TOÁN CHƯA
    // =====================================================

    boolean existsByInvoiceId(
            Long invoiceId
    );


    // =====================================================
    // THEO STATUS
    // =====================================================

    List<payments> findByStatus(
            String status
    );


    // =====================================================
    // THEO PHƯƠNG THỨC
    // =====================================================

    List<payments> findByPaymentMethod(
            String paymentMethod
    );


    // =====================================================
    // TRANSACTION CODE
    // =====================================================

    Optional<payments> findByTransactionCode(
            String transactionCode
    );
}

