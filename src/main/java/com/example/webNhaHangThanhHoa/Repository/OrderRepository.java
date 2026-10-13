package com.example.webNhaHangThanhHoa.Repository;

import com.example.webNhaHangThanhHoa.Entity.orders;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository
        extends JpaRepository<orders, Long> {

    Optional<orders> findByOrderCode(
            String orderCode
    );

    boolean existsByOrderCode(
            String orderCode
    );

    List<orders> findByTableId(
            Long tableId
    );

    List<orders> findByCustomerId(
            Long customerId
    );

    List<orders> findByUserId(
            Long userId
    );

    List<orders> findByStatus(
            String status
    );

    @Query("""
        SELECT o
        FROM orders o
        WHERE o.table.id = :tableId
        AND o.status IN (
            'PENDING',
            'PROCESSING',
            'READY'
        )
        ORDER BY o.createdAt DESC
    """)
    List<orders> findActiveOrdersByTable(
            @Param("tableId") Long tableId
    );
}

