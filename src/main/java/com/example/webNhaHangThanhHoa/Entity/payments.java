package com.example.webNhaHangThanhHoa.Entity;

import com.example.webNhaHangThanhHoa.Entity.invoices;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
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
        name = "payments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_payment_invoice",
                        columnNames = "invoice_id"
                )
        }
)
public class payments {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // =====================================================
    // INVOICE
    // =====================================================

    // Một Invoice chỉ có một Payment
    @OneToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "invoice_id",
            nullable = false,
            unique = true,
            foreignKey = @ForeignKey(
                    name = "fk_payment_invoice"
            )
    )
    private invoices invoice;


    // =====================================================
    // AMOUNT
    // =====================================================

    @NotNull(message = "Số tiền thanh toán không được để trống")
    @DecimalMin(
            value = "0.01",
            message = "Số tiền thanh toán phải lớn hơn 0"
    )
    @Digits(
            integer = 10,
            fraction = 2
    )
    @Column(
            nullable = false,
            precision = 12,
            scale = 2
    )
    private BigDecimal amount;


    // =====================================================
    // PAYMENT METHOD
    // =====================================================

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    @Column(
            name = "payment_method",
            nullable = false,
            length = 30
    )
    private String paymentMethod;


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
    // TRANSACTION CODE
    // =====================================================

    @Size(max = 100)
    @Column(
            name = "transaction_code",
            length = 100
    )
    private String transactionCode;


    // =====================================================
    // TIME
    // =====================================================

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt;


    // =====================================================
    // PRE PERSIST
    // =====================================================

    @PrePersist
    public void prePersist() {

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (status == null) {
            status = "PENDING";
        }
    }


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public payments(
            invoices invoice,
            BigDecimal amount,
            String paymentMethod,
            String status,
            String transactionCode
    ) {

        this.invoice = invoice;

        this.amount = amount;

        this.paymentMethod = paymentMethod;

        this.status = status;

        this.transactionCode = transactionCode;
    }
}

