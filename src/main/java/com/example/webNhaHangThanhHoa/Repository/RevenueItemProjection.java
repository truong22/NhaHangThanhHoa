package com.example.webNhaHangThanhHoa.Repository;
import java.math.BigDecimal;

public interface RevenueItemProjection {

    Long getProductId();

    String getProductName();

    Long getQuantitySold();

    BigDecimal getRevenue();
}