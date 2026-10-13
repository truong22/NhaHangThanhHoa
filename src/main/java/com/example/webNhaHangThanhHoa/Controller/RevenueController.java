package com.example.webNhaHangThanhHoa.Controller;
import com.example.webNhaHangThanhHoa.DTO.RevenueDto;
import com.example.webNhaHangThanhHoa.Service.Revenue.IRevenueService;
import com.example.webNhaHangThanhHoa.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/revenue")
@RequiredArgsConstructor
public class RevenueController {

    private final IRevenueService revenueService;


    // =====================================================
    // DOANH THU HÔM NAY
    // =====================================================

    @GetMapping("/today")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> getTodayRevenue() {

        RevenueDto data =
                revenueService.getTodayRevenue();

        return ResponseEntity.ok(
                new ApiResponse(
                        "Thống kê doanh thu hôm nay thành công",
                        data
                )
        );
    }


    // =====================================================
    // DOANH THU THEO KHOẢNG NGÀY
    // =====================================================

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> getRevenue(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {

        RevenueDto data =
                revenueService.getRevenue(
                        from,
                        to
                );

        return ResponseEntity.ok(
                new ApiResponse(
                        "Thống kê doanh thu thành công",
                        data
                )
        );
    }
}
