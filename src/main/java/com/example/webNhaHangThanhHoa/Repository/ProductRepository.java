package com.example.webNhaHangThanhHoa.Repository;

import com.example.webNhaHangThanhHoa.Entity.products;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
@Repository
public interface ProductRepository
        extends JpaRepository<products, Long> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(
            String name,
            Long id
    );

    Optional<products> findByNameIgnoreCase(String name);

    List<products> findByNameContainingIgnoreCase(
            String name
    );

    List<products> findByCategoryId(Long categoryId);

    List<products> findByPriceBetween(
            BigDecimal minPrice,
            BigDecimal maxPrice
    );

    List<products> findByPriceGreaterThanEqual(
            BigDecimal minPrice
    );

    List<products> findByPriceLessThanEqual(
            BigDecimal maxPrice
    );

    List<products> findByStatusIgnoreCase(
            String status
    );

    List<products> findByNameContainingIgnoreCaseAndStatusIgnoreCase(
            String name,
            String status
    );
}