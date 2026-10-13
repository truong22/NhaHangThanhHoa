package com.example.webNhaHangThanhHoa.Entity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "restaurant_tables")
public class tables_Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Tên bàn không được để trống")
    @Column(name = "table_name", nullable = false, unique = true, length = 50)
    private String tableName; // Ví dụ: Bàn 01, Bàn VIP 02

    @NotNull(message = "Sức chứa không được để trống")
    @Column(nullable = false)
    private Integer capacity; // Số chỗ ngồi (vd: 4, 6...)

    @NotBlank(message = "Trạng thái bàn không được để trống")
    @Column(nullable = false, length = 20)
    private String status; // AVAILABLE (Trống), OCCUPIED (Đang phục vụ)

    @Column(name = "occupied_at")
    private LocalDateTime occupiedAt; // Thời gian thực tế khách ngồi vào bàn (phục vụ tính thời gian ăn)

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = "AVAILABLE"; // Mặc định bàn mới tạo là trống
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
