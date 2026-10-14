package com.example.webNhaHangThanhHoa.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "invoices",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_invoice_code",
                        columnNames = "invoice_code"
                ),
                @UniqueConstraint(
                        name = "uk_invoice_order",
                        columnNames = "order_id"
                )
        }
)
public class invoices {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // =====================================================
    // INVOICE CODE
    // =====================================================

    @NotBlank
    @Column(
            name = "invoice_code",
            nullable = false,
            unique = true,
            length = 30
    )
    private String invoiceCode;


    // =====================================================
    // ORDER
    // =====================================================

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "order_id",
            nullable = false,
            unique = true,
            foreignKey = @ForeignKey(name = "fk_invoice_order")
    )
    private orders order;


    // =====================================================
    // CUSTOMER
    // =====================================================

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "customer_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_invoice_customer")
    )
    private customers customer;


    // =====================================================
    // TABLE
    // =====================================================

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "table_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_invoice_table")
    )
    private tables_Restaurant table;


    // =====================================================
    // TIỀN
    // =====================================================

    @NotNull
    @Column(
            nullable = false,
            precision = 12,
            scale = 2
    )
    private BigDecimal subtotal = BigDecimal.ZERO;


    // Giảm giá theo phần trăm
    @NotNull
    @Column(
            name = "discount_percent",
            nullable = false,
            precision = 5,
            scale = 2
    )
    private BigDecimal discountPercent = BigDecimal.ZERO;


    // Số tiền giảm thực tế
    @NotNull
    @Column(
            name = "discount_amount",
            nullable = false,
            precision = 12,
            scale = 2
    )
    private BigDecimal discountAmount = BigDecimal.ZERO;


    // Tổng tiền sau giảm
    @NotNull
    @Column(
            name = "total_amount",
            nullable = false,
            precision = 12,
            scale = 2
    )
    private BigDecimal totalAmount = BigDecimal.ZERO;


    // =====================================================
    // THỜI GIAN
    // =====================================================

    @NotNull
    @Column(
            name = "issued_at",
            nullable = false
    )
    private LocalDateTime issuedAt;


    // =====================================================
    // STATUS
    // =====================================================

    @NotBlank
    @Column(
            nullable = false,
            length = 20
    )
    private String status;


    // =====================================================
    // CASHIER / THU NGÂN QUẢN LÝ
    // =====================================================

    @Column(
            name = "cashier_name",
            length = 100
    )
    private String cashierName;


    // =====================================================
    // PAYMENT
    // =====================================================

    @OneToOne(mappedBy = "invoice")
    private payments payment;


    // =====================================================
    // PRE PERSIST
    // =====================================================

    @PrePersist
    public void prePersist() {

        if (issuedAt == null) {
            issuedAt = LocalDateTime.now();
        }

        if (discountPercent == null) {
            discountPercent = BigDecimal.ZERO;
        }

        if (discountAmount == null) {
            discountAmount = BigDecimal.ZERO;
        }

        if (subtotal == null) {
            subtotal = BigDecimal.ZERO;
        }

        if (totalAmount == null) {
            totalAmount = BigDecimal.ZERO;
        }

        if (status == null) {
            status = "PENDING";
        }
    }


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public invoices(
            String invoiceCode,
            orders order,
            customers customer,
            tables_Restaurant table,
            BigDecimal subtotal,
            BigDecimal discountPercent,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            String status
    ) {

        this.invoiceCode = invoiceCode;

        this.order = order;

        this.customer = customer;

        this.table = table;

        this.subtotal = subtotal;

        this.discountPercent = discountPercent;

        this.discountAmount = discountAmount;

        this.totalAmount = totalAmount;

        this.status = status;

        this.issuedAt = LocalDateTime.now();
    }
}

