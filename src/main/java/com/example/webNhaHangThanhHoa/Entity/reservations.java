package com.example.webNhaHangThanhHoa.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

    @Getter
    @Setter
    @NoArgsConstructor
    @Entity
    @Table(
            name = "reservations",
            uniqueConstraints = {
                    @UniqueConstraint(
                            name = "uk_reservation_code",
                            columnNames = "reservation_code"
                    )
            }
    )

    public class reservations {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @NotBlank
        @Size(max = 30)
        @Column(
                name = "reservation_code",
                nullable = false,
                unique = true,
                length = 30
        )
        private String reservationCode;

        @ManyToOne(fetch = FetchType.LAZY, optional = false)
        @JoinColumn(
                name = "customer_id",
                nullable = false,
                foreignKey = @ForeignKey(name = "fk_reservation_customer")
        )
        private customers customer;

        @ManyToOne(fetch = FetchType.LAZY, optional = false)
        @JoinColumn(
                name = "table_id",
                nullable = false,
                foreignKey = @ForeignKey(name = "fk_reservation_table")
        )
        private tables_Restaurant table;

        @NotNull
        @Column(name = "reservation_date", nullable = false)
        private LocalDate reservationDate;

        @NotNull
        @Column(name = "start_time", nullable = false)
        private LocalTime startTime;

        @NotNull
        @Column(name = "end_time", nullable = false)
        private LocalTime endTime;

        @NotNull
        @Min(value = 1)
        @Column(name = "number_of_guests", nullable = false)
        private Integer numberOfGuests;

        @NotBlank
        @Column(nullable = false, length = 20)
        private String status;

        @Size(max = 255)
        @Column(length = 255)
        private String note;

        @Column(name = "created_at", nullable = false)
        private LocalDateTime createdAt;

        @Column(name = "updated_at")
        private LocalDateTime updatedAt;

        @PrePersist
        public void prePersist() {
            createdAt = LocalDateTime.now();

            if (status == null) {
                status = "PENDING";
            }
        }

        @PreUpdate
        public void preUpdate() {
            updatedAt = LocalDateTime.now();
        }

        public reservations(
                String reservationCode,
                customers customer,
                tables_Restaurant table,
                LocalDate reservationDate,
                LocalTime startTime,
                LocalTime endTime,
                Integer numberOfGuests,
                String status,
                String note
        ) {
            this.reservationCode = reservationCode;
            this.customer = customer;
            this.table = table;
            this.reservationDate = reservationDate;
            this.startTime = startTime;
            this.endTime = endTime;
            this.numberOfGuests = numberOfGuests;
            this.status = status;
            this.note = note;
        }
    }
