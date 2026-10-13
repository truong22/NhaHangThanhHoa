package com.example.webNhaHangThanhHoa.Repository;
import com.example.webNhaHangThanhHoa.Entity.tables_Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TableRepository extends JpaRepository<tables_Restaurant, Long> {
    // Có thể mở rộng tìm kiếm theo tên bàn nếu cần
}