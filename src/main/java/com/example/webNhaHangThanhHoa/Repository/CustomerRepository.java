package com.example.webNhaHangThanhHoa.Repository;
import com.example.webNhaHangThanhHoa.Entity.customers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<customers, Long> {
    Optional<customers> findByPhone(String phone);
}