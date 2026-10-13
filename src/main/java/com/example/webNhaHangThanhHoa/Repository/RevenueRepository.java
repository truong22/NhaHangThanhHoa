package com.example.webNhaHangThanhHoa.Repository;

import com.example.webNhaHangThanhHoa.Entity.invoices;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface RevenueRepository extends JpaRepository<invoices, Long> {

    // 1. TỔNG DOANH THU
    @Query("""
        SELECT COALESCE(SUM(i.totalAmount), 0)
        FROM invoices i
        WHERE i.status = 'PAID'
          AND i.issuedAt >= :from
          AND i.issuedAt < :to
        """)
    BigDecimal getTotalRevenue(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );


    // 2. TỔNG SỐ HÓA ĐƠN ĐÃ THANH TOÁN
    @Query("""
        SELECT COUNT(i.id)
        FROM invoices i
        WHERE i.status = 'PAID'
          AND i.issuedAt >= :from
          AND i.issuedAt < :to
        """)
    Long getTotalInvoices(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );


    // 3. TỔNG SỐ MÓN ĐÃ BÁN
    @Query("""
        SELECT COALESCE(SUM(oi.quantity), 0)
        FROM invoices i
        JOIN i.order o
        JOIN o.orderItems oi
        WHERE i.status = 'PAID'
          AND i.issuedAt >= :from
          AND i.issuedAt < :to
        """)
    Long getTotalItemsSold(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );


    // 4. DANH SÁCH MÓN ĐÃ BÁN
    @Query("""
        SELECT
            product.id AS productId,
            product.name AS productName,
            SUM(oi.quantity) AS quantitySold,
            SUM(oi.subtotal) AS revenue
        FROM invoices i
        JOIN i.order o
        JOIN o.orderItems oi
        JOIN oi.product product
        WHERE i.status = 'PAID'
          AND i.issuedAt >= :from
          AND i.issuedAt < :to
        GROUP BY product.id, product.name
        ORDER BY SUM(oi.quantity) DESC
        """)
    List<RevenueItemProjection> getRevenueItems(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );


    // 5. DOANH THU THEO NGÀY
    @Query("""
        SELECT
            CAST(i.issuedAt AS date) AS date,
            SUM(i.totalAmount) AS revenue,
            COUNT(i.id) AS invoiceCount
        FROM invoices i
        WHERE i.status = 'PAID'
          AND i.issuedAt >= :from
          AND i.issuedAt < :to
        GROUP BY CAST(i.issuedAt AS date)
        ORDER BY CAST(i.issuedAt AS date)
        """)
    List<RevenueByDateProjection> getRevenueByDate(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );


    // 6. DOANH THU THEO PHƯƠNG THỨC THANH TOÁN
    @Query("""
        SELECT
            COALESCE(p.paymentMethod, 'Tiền mặt') AS paymentMethod,
            SUM(i.totalAmount) AS revenue,
            COUNT(i.id) AS invoiceCount
        FROM invoices i
        LEFT JOIN i.payment p
        WHERE i.status = 'PAID'
          AND i.issuedAt >= :from
          AND i.issuedAt < :to
        GROUP BY COALESCE(p.paymentMethod, 'Tiền mặt')
        ORDER BY SUM(i.totalAmount) DESC
        """)
    List<RevenueByPaymentProjection> getRevenueByPayment(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}
