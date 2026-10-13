package com.example.webNhaHangThanhHoa.Repository;
import com.example.webNhaHangThanhHoa.Entity.invoices;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface InvoiceRepository extends JpaRepository<invoices, Long> {
    Optional<invoices> findByInvoiceCode( String invoiceCode );
    boolean existsByInvoiceCode( String invoiceCode );
    Optional<invoices> findByOrderId( Long orderId );
    boolean existsByOrderId( Long orderId );
    List<invoices> findByCustomerId( Long customerId );
    List<invoices> findByTableId( Long tableId );
    List<invoices> findByStatus( String status );
}
