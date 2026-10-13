package com.example.webNhaHangThanhHoa.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "orders",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_order_code",
                        columnNames = "order_code"
                )
        }
)
public class orders {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(
            name = "order_code",
            nullable = false,
            unique = true,
            length = 30
    )
    private String orderCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "table_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_order_table")
    )
    private tables_Restaurant table;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "customer_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_order_customer")
    )
    private customers customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_order_user")
    )
    private users user;

    @Column(
            nullable = false,
            precision = 12,
            scale = 2
    )
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String note;

    @NotBlank
    @Column(nullable = false, length = 30)
    private String status;

    @OneToMany(
            mappedBy = "order",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<order_items> orderItems = new ArrayList<>();

    @OneToOne(mappedBy = "order")
    private invoices invoice;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    public void prePersist() {

        createdAt = LocalDateTime.now();

        if (status == null) {
            status = "PENDING";
        }

        if (subtotal == null) {
            subtotal = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public orders(
            String orderCode,
            tables_Restaurant table,
            customers customer,
            users user,
            String status
    ) {
        this.orderCode = orderCode;
        this.table = table;
        this.customer = customer;
        this.user = user;
        this.status = status;
        this.subtotal = BigDecimal.ZERO;
    }
}
