package com.example.webNhaHangThanhHoa.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;

public interface RevenueByDateProjection {

    LocalDate getDate();

    BigDecimal getRevenue();

    Long getInvoiceCount();
}
