package com.example.webNhaHangThanhHoa.Repository;

import com.example.webNhaHangThanhHoa.Entity.categories;
import org.springframework.data.jpa.repository.JpaRepository;

public interface categoryRepository extends JpaRepository<categories,Long> {
    categories findByName(String name);

    boolean existsByName(String name);

}
