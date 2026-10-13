package com.example.webNhaHangThanhHoa.Service.Revenue;
import com.example.webNhaHangThanhHoa.DTO.RevenueDto;

import java.time.LocalDate;

public interface IRevenueService {

    // Không truyền ngày
    RevenueDto getTodayRevenue();

    // Truyền khoảng ngày
    RevenueDto getRevenue(
            LocalDate fromDate,
            LocalDate toDate
    );
}