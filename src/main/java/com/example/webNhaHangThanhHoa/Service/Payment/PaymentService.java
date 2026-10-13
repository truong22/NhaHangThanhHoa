package com.example.webNhaHangThanhHoa.Service.Payment;

import com.example.webNhaHangThanhHoa.DTO.PaymentDto;
import com.example.webNhaHangThanhHoa.Entity.invoices;
import com.example.webNhaHangThanhHoa.Entity.orders;
import com.example.webNhaHangThanhHoa.Entity.payments;
import com.example.webNhaHangThanhHoa.Entity.tables_Restaurant;
import com.example.webNhaHangThanhHoa.Exception.AlreadyExitsException;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Repository.InvoiceRepository;
import com.example.webNhaHangThanhHoa.Repository.PaymentRepository;
import com.example.webNhaHangThanhHoa.Repository.OrderRepository;
import com.example.webNhaHangThanhHoa.Repository.TableRepository;
import com.example.webNhaHangThanhHoa.Request.PaymentRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService
        implements IPaymentService {

    private final PaymentRepository paymentRepository;

    private final InvoiceRepository invoiceRepository;

    private final OrderRepository orderRepository;

    private final TableRepository tableRepository;


    // =====================================================
    // GET ALL
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<PaymentDto> getAllPayments() {

        return paymentRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public PaymentDto getPaymentById(
            Long id) {

        payments payment =
                paymentRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy Payment với id: "
                                                + id
                                )
                        );

        return convertToDto(payment);
    }


    // =====================================================
    // GET BY INVOICE
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public PaymentDto getPaymentByInvoice(
            Long invoiceId) {

        payments payment =
                paymentRepository
                        .findByInvoiceId(invoiceId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Invoice chưa có Payment"
                                )
                        );

        return convertToDto(payment);
    }


    // =====================================================
    // GET BY STATUS
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<PaymentDto> getByStatus(
            String status) {

        return paymentRepository
                .findByStatus(
                        status.toUpperCase()
                )
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY PAYMENT METHOD
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<PaymentDto> getByPaymentMethod(
            String paymentMethod) {

        return paymentRepository
                .findByPaymentMethod(
                        paymentMethod.toUpperCase()
                )
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // ADD PAYMENT
    // =====================================================

    @Override
    @Transactional
    public PaymentDto addPayment(
            PaymentRequest request) {

        // -------------------------------------------------
        // 1. Tìm Invoice
        // -------------------------------------------------

        invoices invoice =
                invoiceRepository.findById(
                        request.getInvoiceId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy Invoice với id: "
                                        + request.getInvoiceId()
                        )
                );


        // -------------------------------------------------
        // 2. Invoice đã PAID
        // -------------------------------------------------

        if ("PAID".equalsIgnoreCase(
                invoice.getStatus())) {

            throw new AlreadyExitsException(
                    "Invoice đã được thanh toán"
            );
        }


        // -------------------------------------------------
        // 3. Invoice CANCELLED
        // -------------------------------------------------

        if ("CANCELLED".equalsIgnoreCase(
                invoice.getStatus())) {

            throw new RuntimeException(
                    "Invoice đã bị hủy, không thể thanh toán"
            );
        }


        // -------------------------------------------------
        // 4. Kiểm tra đã có Payment
        // -------------------------------------------------

        if (paymentRepository.existsByInvoiceId(
                request.getInvoiceId())) {

            throw new AlreadyExitsException(
                    "Invoice này đã có Payment"
            );
        }


        // -------------------------------------------------
        // 5. Lấy số tiền từ Invoice
        // -------------------------------------------------

        BigDecimal amount =
                invoice.getTotalAmount();

        if (amount == null ||
                amount.compareTo(
                        BigDecimal.ZERO
                ) <= 0) {

            throw new RuntimeException(
                    "Số tiền hóa đơn không hợp lệ"
            );
        }


        // -------------------------------------------------
        // 6. Kiểm tra payment method
        // -------------------------------------------------

        String paymentMethod =
                request.getPaymentMethod()
                        .trim()
                        .toUpperCase();


        switch (paymentMethod) {

            case "CASH":
            case "BANK_TRANSFER":
            case "QR":
            case "CARD":

                break;

            default:

                throw new RuntimeException(
                        "Phương thức thanh toán không hợp lệ"
                );
        }


        // -------------------------------------------------
        // 7. Tạo Payment
        // -------------------------------------------------

        payments payment =
                new payments();

        payment.setInvoice(
                invoice
        );

        payment.setAmount(
                amount
        );

        payment.setPaymentMethod(
                paymentMethod
        );

        payment.setTransactionCode(
                request.getTransactionCode()
        );

        /*
         * Tạo Payment nhưng chưa coi là thành công.
         *
         * Sau khi xác nhận thanh toán:
         *
         * SUCCESS
         */

        payment.setStatus(
                "PENDING"
        );


        // -------------------------------------------------
        // 8. Lưu
        // -------------------------------------------------

        payments saved =
                paymentRepository.save(
                        payment
                );

        return convertToDto(saved);
    }


    // =====================================================
    // UPDATE STATUS
    // =====================================================

    @Override
    @Transactional
    public PaymentDto updateStatus(
            Long id,
            String status) {

        payments payment =
                paymentRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy Payment"
                                )
                        );


        String newStatus =
                status.toUpperCase();


        // =================================================
        // SUCCESS
        // =================================================

        if ("SUCCESS".equals(newStatus)) {

            if ("SUCCESS".equalsIgnoreCase(
                    payment.getStatus())) {

                throw new RuntimeException(
                        "Payment đã SUCCESS"
                );
            }


            if ("CANCELLED".equalsIgnoreCase(
                    payment.getStatus())) {

                throw new RuntimeException(
                        "Payment đã bị hủy"
                );
            }


            // ---------------------------------------------
            // Payment SUCCESS
            // ---------------------------------------------

            payment.setStatus(
                    "SUCCESS"
            );

            payment.setPaidAt(
                    LocalDateTime.now()
            );


            // ---------------------------------------------
            // Invoice PAID
            // ---------------------------------------------

            invoices invoice =
                    payment.getInvoice();

            invoice.setStatus(
                    "PAID"
            );


            // ---------------------------------------------
            // Order COMPLETED
            // ---------------------------------------------

            orders order =
                    invoice.getOrder();

            if (order != null) {

                order.setStatus(
                        "COMPLETED"
                );
                order.setCompletedAt(
                        LocalDateTime.now()
                );

                orderRepository.save(order);
            }


            // ---------------------------------------------
            // Table AVAILABLE
            // ---------------------------------------------

            tables_Restaurant table =
                    invoice.getTable();

            if (table != null) {

                table.setStatus(
                        "AVAILABLE"
                );

                tableRepository.save(table);
            }


            invoiceRepository.save(
                    invoice
            );


            return convertToDto(
                    paymentRepository.save(payment)
            );
        }


        // =================================================
        // CANCELLED
        // =================================================

        if ("CANCELLED".equals(newStatus)) {

            if ("SUCCESS".equalsIgnoreCase(
                    payment.getStatus())) {

                throw new RuntimeException(
                        "Payment đã thành công, không thể hủy"
                );
            }


            payment.setStatus(
                    "CANCELLED"
            );

            return convertToDto(
                    paymentRepository.save(payment)
            );
        }


        // =================================================
        // PENDING
        // =================================================

        if ("PENDING".equals(newStatus)) {

            if ("SUCCESS".equalsIgnoreCase(
                    payment.getStatus())) {

                throw new RuntimeException(
                        "Payment đã thành công, không thể chuyển về PENDING"
                );
            }


            payment.setStatus(
                    "PENDING"
            );

            return convertToDto(
                    paymentRepository.save(payment)
            );
        }


        throw new RuntimeException(
                "Trạng thái Payment không hợp lệ. "
                        + "Sử dụng PENDING, SUCCESS hoặc CANCELLED"
        );
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Override
    @Transactional
    public void deletePayment(
            Long id) {

        payments payment =
                paymentRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy Payment"
                                )
                        );


        if ("SUCCESS".equalsIgnoreCase(
                payment.getStatus())) {

            throw new RuntimeException(
                    "Không thể xóa Payment đã thành công"
            );
        }


        paymentRepository.delete(payment);
    }


    // =====================================================
    // ENTITY → DTO
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public PaymentDto convertToDto(
            payments payment) {

        PaymentDto dto =
                new PaymentDto();

        dto.setId(
                payment.getId()
        );


        // -------------------------------------------------
        // INVOICE
        // -------------------------------------------------

        if (payment.getInvoice() != null) {

            dto.setInvoiceId(
                    payment.getInvoice().getId()
            );

            dto.setInvoiceCode(
                    payment.getInvoice().getInvoiceCode()
            );
        }


        // -------------------------------------------------
        // PAYMENT
        // -------------------------------------------------

        dto.setAmount(
                payment.getAmount()
        );

        dto.setPaymentMethod(
                payment.getPaymentMethod()
        );

        dto.setStatus(
                payment.getStatus()
        );

        dto.setTransactionCode(
                payment.getTransactionCode()
        );

        dto.setPaidAt(
                payment.getPaidAt()
        );

        dto.setCreatedAt(
                payment.getCreatedAt()
        );


        return dto;
    }
}

