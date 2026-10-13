package com.example.webNhaHangThanhHoa.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
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
    @Table(name = "products")

    public class products {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @NotBlank(message = "Tên món không được để trống")
        @Size(max = 150)
        @Column(nullable = false, length = 150)
        private String name;

        @Size(max = 1000)
        @Column(length = 1000)
        private String description;

        @NotNull(message = "Giá món không được để trống")
        @DecimalMin(
                value = "0.01",
                message = "Giá món phải lớn hơn 0"
        )
        @Digits(integer = 10, fraction = 2)
        @Column(
                nullable = false,
                precision = 12,
                scale = 2
        )
        private BigDecimal price;

        @Size(max = 255)
        @Column(name = "image_url", length = 255)
        private String imageUrl;

        @NotBlank
        @Column(nullable = false, length = 20)
        private String status;

        @ManyToOne(fetch = FetchType.LAZY, optional = false)
        @JoinColumn(
                name = "category_id",
                nullable = false,
                foreignKey = @ForeignKey(name = "fk_product_category")
        )
        private categories category;

        @OneToMany(
                mappedBy = "product"
        )
        private List<order_items> orderItems = new ArrayList<>();

        @Column(name = "created_at", nullable = false)
        private LocalDateTime createdAt;

        @Column(name = "updated_at")
        private LocalDateTime updatedAt;

        @PrePersist
        public void prePersist() {
            createdAt = LocalDateTime.now();

            if (status == null) {
                status = "ACTIVE";
            }
        }

        @PreUpdate
        public void preUpdate() {
            updatedAt = LocalDateTime.now();
        }

        public products(
                String name,
                String description,
                BigDecimal price,
                String imageUrl,
                String status,
                categories category
        ) {
            this.name = name;
            this.description = description;
            this.price = price;
            this.imageUrl = imageUrl;
            this.status = status;
            this.category = category;
        }
    }
