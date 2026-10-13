package com.example.webNhaHangThanhHoa.Repository;
import java.math.BigDecimal;

public interface RevenueByPaymentProjection {

    String getPaymentMethod();

    BigDecimal getRevenue();

    Long getInvoiceCount();
}