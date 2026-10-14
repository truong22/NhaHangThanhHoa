package com.example.webNhaHangThanhHoa.Service.Invoice;

import com.example.webNhaHangThanhHoa.DTO.InvoiceDto;
import com.example.webNhaHangThanhHoa.DTO.InvoiceItemDto;
import com.example.webNhaHangThanhHoa.Entity.*;
import com.example.webNhaHangThanhHoa.Exception.AlreadyExitsException;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Repository.InvoiceRepository;
import com.example.webNhaHangThanhHoa.Repository.OrderRepository;
import com.example.webNhaHangThanhHoa.Request.InvoiceRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceService
        implements IInvoiceService {

    private final InvoiceRepository invoiceRepository;

    private final OrderRepository orderRepository;


    // =====================================================
    // GET ALL
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceDto> getAllInvoices() {

        return invoiceRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceById(Long id) {

        invoices invoice =
                invoiceRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy hóa đơn với id: " + id
                                )
                        );

        return convertToDto(invoice);
    }


    // =====================================================
    // GET BY CODE
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceByCode(
            String invoiceCode) {

        invoices invoice =
                invoiceRepository
                        .findByInvoiceCode(invoiceCode)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy hóa đơn: "
                                                + invoiceCode
                                )
                        );

        return convertToDto(invoice);
    }


    // =====================================================
    // GET BY ORDER
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceByOrder(
            Long orderId) {

        invoices invoice =
                invoiceRepository
                        .findByOrderId(orderId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Order chưa có hóa đơn"
                                )
                        );

        return convertToDto(invoice);
    }


    // =====================================================
    // ADD INVOICE
    // =====================================================

    // =====================================================
// ADD INVOICE
// =====================================================

    @Override
    @Transactional
    public InvoiceDto addInvoice(
            InvoiceRequest request) {

        // ---------------------------------------------
        // 1. Tìm Order
        // ---------------------------------------------

        orders order =
                orderRepository.findById(
                        request.getOrderId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy Order với id: "
                                        + request.getOrderId()
                        )
                );


        // ---------------------------------------------
        // 2. Kiểm tra Order đã có Invoice
        // ---------------------------------------------

        if (invoiceRepository.existsByOrderId(
                request.getOrderId())) {

            throw new AlreadyExitsException(
                    "Order này đã có hóa đơn"
            );
        }


        // ---------------------------------------------
        // 3. Không cho Invoice của Order bị hủy
        // ---------------------------------------------

        if ("CANCELLED".equalsIgnoreCase(
                order.getStatus())) {

            throw new RuntimeException(
                    "Order đã bị hủy, không thể tạo hóa đơn"
            );
        }


        // ---------------------------------------------
        // 4. Kiểm tra Order có món
        // ---------------------------------------------

        if (order.getOrderItems() == null ||
                order.getOrderItems().isEmpty()) {

            throw new RuntimeException(
                    "Order chưa có món, không thể tạo hóa đơn"
            );
        }


        // ---------------------------------------------
        // 5. Tính subtotal chuẩn xác từ các món trong Order
        // ---------------------------------------------

        BigDecimal subtotal = BigDecimal.ZERO;
        if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            subtotal = order.getOrderItems().stream()
                    .filter(it -> !"CANCELLED".equalsIgnoreCase(it.getStatus()))
                    .map(it -> it.getSubtotal() != null ? it.getSubtotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else if (order.getSubtotal() != null) {
            subtotal = order.getSubtotal();
        }

        // Đồng bộ lại subtotal của Order để cả 2 bảng luôn khớp tiền 100%
        order.setSubtotal(subtotal);
        orderRepository.save(order);


        // ---------------------------------------------
        // 6. LẤY GIẢM GIÁ THEO %
        // ---------------------------------------------

        BigDecimal discountPercent =
                request.getDiscountPercent();

        if (discountPercent == null) {
            discountPercent = BigDecimal.ZERO;
        }


        // Không cho % âm
        if (discountPercent.compareTo(
                BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Phần trăm giảm giá không được nhỏ hơn 0"
            );
        }


        // Không cho % > 100
        if (discountPercent.compareTo(
                BigDecimal.valueOf(100)) > 0) {

            throw new RuntimeException(
                    "Phần trăm giảm giá không được lớn hơn 100"
            );
        }


        // ---------------------------------------------
        // 7. Tính số tiền giảm theo %
        // ---------------------------------------------

        BigDecimal discountByPercent =
                subtotal
                        .multiply(discountPercent)
                        .divide(
                                BigDecimal.valueOf(100),
                                2,
                                BigDecimal.ROUND_HALF_UP
                        );

        // ---------------------------------------------
        // 8. LẤY GIẢM TRỰC TIẾP BẰNG TIỀN
        // ---------------------------------------------

        BigDecimal discountByAmount =
                request.getDiscountAmount();

        if (discountByAmount == null) {
            discountByAmount = BigDecimal.ZERO;
        }


        // Không cho số tiền giảm âm
        if (discountByAmount.compareTo(
                BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Số tiền giảm giá không được nhỏ hơn 0"
            );
        }


        // ---------------------------------------------
        // 9. TỔNG TIỀN GIẢM
        // ---------------------------------------------

        BigDecimal totalDiscount =
                discountByPercent.add(
                        discountByAmount
                );


        // ---------------------------------------------
        // 10. Không cho giảm vượt quá subtotal
        // ---------------------------------------------

        if (totalDiscount.compareTo(
                subtotal) > 0) {

            throw new RuntimeException(
                    "Tổng tiền giảm không được lớn hơn tổng tiền hóa đơn"
            );
        }


        // ---------------------------------------------
        // 11. Tính tổng tiền phải thanh toán
        // ---------------------------------------------

        BigDecimal totalAmount =
                subtotal.subtract(
                        totalDiscount
                );


        // ---------------------------------------------
        // 12. Lấy Customer
        // ---------------------------------------------

        customers customer =
                order.getCustomer();

        if (customer == null) {

            throw new RuntimeException(
                    "Order chưa có khách hàng"
            );
        }


        // ---------------------------------------------
        // 13. Lấy Table
        // ---------------------------------------------

        tables_Restaurant table =
                order.getTable();

        if (table == null) {

            throw new RuntimeException(
                    "Order chưa có bàn"
            );
        }


        // ---------------------------------------------
        // 14. Tạo Invoice
        // ---------------------------------------------

        invoices invoice =
                new invoices();


        // Server tự sinh mã hóa đơn
        invoice.setInvoiceCode(
                generateInvoiceCode()
        );

        String cashier = request.getCashierName();
        if (cashier == null || cashier.trim().isEmpty()) {
            cashier = "Administrator";
        }
        invoice.setCashierName(cashier);

        invoice.setOrder(
                order
        );

        invoice.setCustomer(
                customer
        );

        invoice.setTable(
                table
        );

        invoice.setSubtotal(
                subtotal
        );

        invoice.setDiscountPercent(
                discountPercent != null ? discountPercent : BigDecimal.ZERO
        );

        /*
         * Lưu tổng tiền đã giảm.
         *
         * Ví dụ:
         *
         * subtotal = 215000
         * giảm 10% = 21500
         * giảm trực tiếp = 5000
         *
         * totalDiscount = 26500
         */

        invoice.setDiscountAmount(
                totalDiscount
        );

        invoice.setTotalAmount(
                totalAmount
        );


        // ---------------------------------------------
        // 15. Trạng thái Invoice
        // ---------------------------------------------

        /*
         * Invoice mới tạo chưa được thanh toán.
         *
         * Payment thành công mới chuyển:
         *
         * Invoice -> PAID
         * Order   -> COMPLETED
         * Table   -> AVAILABLE
         */

        invoice.setStatus(
                "PENDING"
        );


        // ---------------------------------------------
        // 16. Lưu Invoice
        // ---------------------------------------------

        invoices saved =
                invoiceRepository.save(
                        invoice
                );


        return convertToDto(saved);
    }

    // =====================================================
    // UPDATE STATUS
    // =====================================================

    @Override
    @Transactional
    public InvoiceDto updateStatus(
            Long id,
            String status) {

        invoices invoice =
                invoiceRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy hóa đơn"
                                )
                        );


        String newStatus =
                status.toUpperCase();


        /*
         * Không nên cho Controller tùy ý chuyển
         * Invoice sang PAID.
         *
         * PAID sẽ được xử lý bởi PaymentService
         * khi thanh toán thành công.
         */

        switch (newStatus) {

            case "PENDING":

                invoice.setStatus("PENDING");

                break;


            case "CANCELLED":

                if ("PAID".equalsIgnoreCase(
                        invoice.getStatus())) {

                    throw new RuntimeException(
                            "Hóa đơn đã thanh toán, "
                                    + "không thể chuyển sang CANCELLED"
                    );
                }

                invoice.setStatus("CANCELLED");

                break;


            default:

                throw new RuntimeException(
                        "Trạng thái Invoice không hợp lệ. "
                                + "Sử dụng PENDING hoặc CANCELLED"
                );
        }


        return convertToDto(
                invoiceRepository.save(invoice)
        );
    }
    @Override
    @Transactional
    public InvoiceDto updateDiscount(
            Long id,
            BigDecimal discountPercent,
            BigDecimal discountAmount) {

        // ---------------------------------------------
        // 1. Tìm Invoice
        // ---------------------------------------------

        invoices invoice =
                invoiceRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy hóa đơn"
                                )
                        );


        // ---------------------------------------------
        // 2. Không cho sửa hóa đơn đã thanh toán
        // ---------------------------------------------

        if ("PAID".equalsIgnoreCase(
                invoice.getStatus())) {

            throw new RuntimeException(
                    "Hóa đơn đã thanh toán, không thể sửa giảm giá"
            );
        }


        // ---------------------------------------------
        // 3. Lấy subtotal
        // ---------------------------------------------

        BigDecimal subtotal =
                invoice.getSubtotal();

        if (subtotal == null) {
            subtotal = BigDecimal.ZERO;
        }


        // ---------------------------------------------
        // 4. Không cho nhập cả % và tiền
        // ---------------------------------------------

        if (discountPercent != null &&
                discountAmount != null) {

            throw new RuntimeException(
                    "Chỉ được chọn giảm theo phần trăm "
                            + "hoặc giảm trực tiếp bằng tiền"
            );
        }


        // ---------------------------------------------
        // 5. Tính giảm giá
        // ---------------------------------------------

        BigDecimal finalDiscount =
                BigDecimal.ZERO;


        // =============================================
        // GIẢM THEO PHẦN TRĂM
        // =============================================

        if (discountPercent != null) {

            if (discountPercent.compareTo(
                    BigDecimal.ZERO) < 0) {

                throw new RuntimeException(
                        "Phần trăm giảm không được nhỏ hơn 0"
                );
            }


            if (discountPercent.compareTo(
                    BigDecimal.valueOf(100)) > 0) {

                throw new RuntimeException(
                        "Phần trăm giảm không được lớn hơn 100"
                );
            }


            finalDiscount =
                    subtotal
                            .multiply(discountPercent)
                            .divide(
                                    BigDecimal.valueOf(100),
                                    2,
                                    BigDecimal.ROUND_HALF_UP
                            );
        }


        // =============================================
        // GIẢM TRỰC TIẾP BẰNG TIỀN
        // =============================================

        if (discountAmount != null) {

            if (discountAmount.compareTo(
                    BigDecimal.ZERO) < 0) {

                throw new RuntimeException(
                        "Số tiền giảm không được nhỏ hơn 0"
                );
            }


            finalDiscount =
                    discountAmount;
        }


        // ---------------------------------------------
        // 6. Không giảm quá subtotal
        // ---------------------------------------------

        if (finalDiscount.compareTo(
                subtotal) > 0) {

            throw new RuntimeException(
                    "Số tiền giảm không được lớn hơn tổng tiền"
            );
        }


        // ---------------------------------------------
        // 7. Cập nhật Invoice
        // ---------------------------------------------

        invoice.setDiscountAmount(
                finalDiscount
        );


        invoice.setTotalAmount(
                subtotal.subtract(
                        finalDiscount
                )
        );


        // ---------------------------------------------
        // 8. Lưu
        // ---------------------------------------------

        invoices saved =
                invoiceRepository.save(
                        invoice
                );


        return convertToDto(saved);
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Override
    @Transactional
    public void deleteInvoice(Long id) {

        invoices invoice =
                invoiceRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy hóa đơn"
                                )
                        );


        if ("PAID".equalsIgnoreCase(
                invoice.getStatus())) {

            throw new RuntimeException(
                    "Không thể xóa hóa đơn đã thanh toán"
            );
        }


        invoiceRepository.delete(invoice);
    }


    // =====================================================
    // GET BY CUSTOMER
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceDto> getByCustomer(
            Long customerId) {

        return invoiceRepository
                .findByCustomerId(customerId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY TABLE
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceDto> getByTable(
            Long tableId) {

        return invoiceRepository
                .findByTableId(tableId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY STATUS
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceDto> getByStatus(
            String status) {

        return invoiceRepository
                .findByStatus(
                        status.toUpperCase()
                )
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GENERATE INVOICE CODE
    // =====================================================

    private String generateInvoiceCode() {

        String code;

        do {

            code =
                    "INV" + System.currentTimeMillis();

        } while (
                invoiceRepository
                        .existsByInvoiceCode(code)
        );

        return code;
    }


    // =====================================================
    // ENTITY → DTO
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public InvoiceDto convertToDto(
            invoices invoice) {

        InvoiceDto dto = new InvoiceDto();

        // =================================================
        // INVOICE
        // =================================================

        dto.setId(
                invoice.getId()
        );

        dto.setInvoiceCode(
                invoice.getInvoiceCode()
        );

        dto.setSubtotal(
                invoice.getSubtotal()
        );

        dto.setDiscountAmount(
                invoice.getDiscountAmount()
        );

        dto.setTotalAmount(
                invoice.getTotalAmount()
        );

        dto.setStatus(
                invoice.getStatus()
        );

        dto.setIssuedAt(
                invoice.getIssuedAt()
        );


        // =================================================
        // DISCOUNT %
        // =================================================

        dto.setDiscountPercent(
                invoice.getDiscountPercent()
        );


        // =================================================
        // ORDER
        // =================================================

        if (invoice.getOrder() != null) {

            orders order =
                    invoice.getOrder();

            dto.setOrderId(
                    order.getId()
            );

            dto.setOrderCode(
                    order.getOrderCode()
            );

            if (order.getUser() != null) {
                String staffName = order.getUser().getFullName();
                if (staffName == null || staffName.trim().isEmpty()) {
                    staffName = order.getUser().getUsername();
                }
                dto.setOrderStaffName(staffName);
            }


            // =============================================
            // ORDER ITEMS
            // =============================================

            if (order.getOrderItems() != null) {

                List<InvoiceItemDto> items =
                        order.getOrderItems()
                                .stream()
                                .map(item -> {

                                    InvoiceItemDto itemDto =
                                            new InvoiceItemDto();

                                    if (item.getProduct() != null) {

                                        itemDto.setProductId(
                                                item.getProduct().getId()
                                        );

                                        itemDto.setProductName(
                                                item.getProduct().getName()
                                        );
                                    }

                                    itemDto.setQuantity(
                                            item.getQuantity()
                                    );

                                    itemDto.setUnitPrice(
                                            item.getUnitPrice()
                                    );

                                    itemDto.setSubtotal(
                                            item.getSubtotal()
                                    );

                                    return itemDto;

                                })
                                .toList();

                dto.setItems(items);
            }
        }


        // =================================================
        // CUSTOMER
        // =================================================

        if (invoice.getCustomer() != null) {

            customers customer =
                    invoice.getCustomer();

            dto.setCustomerId(
                    customer.getId()
            );

            dto.setCustomerName(
                    customer.getFullName()
            );

            dto.setCustomerPhone(
                    customer.getPhone()
            );
        }


        // =================================================
        // TABLE
        // =================================================

        if (invoice.getTable() != null) {

            tables_Restaurant table =
                    invoice.getTable();

            dto.setTableId(
                    table.getId()
            );

            dto.setTableName(
                    table.getTableName()
            );
        }


        // =================================================
        // PAYMENT
        // =================================================

        if (invoice.getPayment() != null) {

            payments payment =
                    invoice.getPayment();

            dto.setPaymentMethod(
                    payment.getPaymentMethod()
            );

            dto.setPaymentStatus(
                    payment.getStatus()
            );

            dto.setPaidAt(
                    payment.getPaidAt()
            );

        } else {

            dto.setPaymentMethod(null);

            dto.setPaymentStatus(null);

            dto.setPaidAt(null);
        }

        dto.setCashierName(
                invoice.getCashierName() != null ? invoice.getCashierName() : "Administrator"
        );

        return dto;
    }
}
