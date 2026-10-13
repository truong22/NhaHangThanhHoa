package com.example.webNhaHangThanhHoa.Repository;

import com.example.webNhaHangThanhHoa.Entity.order_items;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository
        extends JpaRepository<order_items, Long> {

    List<order_items> findByOrderId(
            Long orderId
    );

    List<order_items> findByProductId(
            Long productId
    );

    List<order_items> findByStatus(
            String status
    );

    @Query("""
        SELECT oi
        FROM order_items oi
        WHERE oi.status IN (
            'PENDING',
            'PREPARING'
        )
        ORDER BY oi.createdAt ASC
    """)
    List<order_items> findKitchenItems();

    @Query("""
        SELECT oi
        FROM order_items oi
        WHERE oi.order.id = :orderId
        AND oi.status NOT IN ('CANCELLED')
        ORDER BY oi.createdAt ASC
    """)
    List<order_items> findActiveItemsByOrder(
            @Param("orderId") Long orderId
    );
}
