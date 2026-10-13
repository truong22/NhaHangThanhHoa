package com.example.webNhaHangThanhHoa.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "customers")
public class customers {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Tên khách hàng không được để trống")
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(unique = true, nullable = false, length = 20)
    private String phone; // Số điện thoại định danh

    @Column(name = "visit_count", nullable = false)
    private Integer visitCount = 0; // Số lần ghé quán

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt; // Ngày giờ ghé lần đầu

    @Column(name = "updated_at")
    private LocalDateTime updatedAt; // Ngày giờ ghé gần nhất

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (visitCount == null) {
            visitCount = 0;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now(); // Tự động cập nhật thời gian mỗi khi khách quay lại
    }
}