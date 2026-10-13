package com.example.webNhaHangThanhHoa.Service.Invoice;
import com.example.webNhaHangThanhHoa.DTO.InvoiceDto;
import com.example.webNhaHangThanhHoa.Entity.invoices;
import com.example.webNhaHangThanhHoa.Request.InvoiceRequest;

import java.math.BigDecimal;
import java.util.List;
public interface IInvoiceService {
    List<InvoiceDto> getAllInvoices();
    InvoiceDto getInvoiceById(Long id);
    InvoiceDto getInvoiceByCode(String invoiceCode);
    InvoiceDto getInvoiceByOrder(Long orderId);
    InvoiceDto addInvoice(InvoiceRequest request);
    InvoiceDto updateStatus(Long id, String status);
    InvoiceDto updateDiscount(
            Long id,
            BigDecimal discountPercent,
            BigDecimal discountAmount
    );
    void deleteInvoice(Long id);
    List<InvoiceDto> getByCustomer(Long customerId);
    List<InvoiceDto> getByTable(Long tableId);
    List<InvoiceDto> getByStatus(String status);
    InvoiceDto convertToDto(invoices invoice);
}