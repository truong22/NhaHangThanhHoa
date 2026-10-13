package com.example.webNhaHangThanhHoa.Service.Revenue;
import com.example.webNhaHangThanhHoa.DTO.RevenueByDateDto;
import com.example.webNhaHangThanhHoa.DTO.RevenueByPaymentDto;
import com.example.webNhaHangThanhHoa.DTO.RevenueDto;
import com.example.webNhaHangThanhHoa.DTO.RevenueItemDto;
import com.example.webNhaHangThanhHoa.Repository.RevenueByDateProjection;
import com.example.webNhaHangThanhHoa.Repository.RevenueByPaymentProjection;
import com.example.webNhaHangThanhHoa.Repository.RevenueItemProjection;
import com.example.webNhaHangThanhHoa.Repository.RevenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RevenueService
        implements IRevenueService {


    private final RevenueRepository revenueRepository;


    // =====================================================
    // DOANH THU HÔM NAY
    // =====================================================

    @Override
    public RevenueDto getTodayRevenue() {

        LocalDate today =
                LocalDate.now();

        /*
         * Bắt đầu ngày hôm nay
         *
         * Ví dụ:
         *
         * 2026-10-05 00:00:00
         */

        LocalDateTime from =
                today.atStartOfDay();


        /*
         * Kết thúc bằng đầu ngày mai
         *
         * 2026-10-06 00:00:00
         *
         * Dùng < :to thay vì <=
         * để lấy toàn bộ ngày hôm nay.
         */

        LocalDateTime to =
                today
                        .plusDays(1)
                        .atStartOfDay();


        return buildRevenue(
                today,
                today,
                from,
                to
        );
    }


    // =====================================================
    // DOANH THU THEO KHOẢNG NGÀY
    // =====================================================

    @Override
    public RevenueDto getRevenue(
            LocalDate fromDate,
            LocalDate toDate) {


        // -----------------------------------------------
        // Kiểm tra ngày
        // -----------------------------------------------

        if (fromDate == null) {

            throw new RuntimeException(
                    "Ngày bắt đầu không được để trống"
            );
        }


        if (toDate == null) {

            throw new RuntimeException(
                    "Ngày kết thúc không được để trống"
            );
        }


        if (fromDate.isAfter(toDate)) {

            throw new RuntimeException(
                    "Ngày bắt đầu không được lớn hơn ngày kết thúc"
            );
        }


        // -----------------------------------------------
        // Thời gian bắt đầu
        // -----------------------------------------------

        LocalDateTime from =
                fromDate.atStartOfDay();


        // -----------------------------------------------
        // Thời gian kết thúc
        //
        // Ví dụ:
        //
        // from = 01/10 00:00
        // to   = 06/10 00:00
        //
        // => lấy đủ ngày 01,02,03,04,05
        // -----------------------------------------------

        LocalDateTime to =
                toDate
                        .plusDays(1)
                        .atStartOfDay();


        return buildRevenue(
                fromDate,
                toDate,
                from,
                to
        );
    }


    // =====================================================
    // BUILD REVENUE
    // =====================================================

    private RevenueDto buildRevenue(
            LocalDate fromDate,
            LocalDate toDate,
            LocalDateTime from,
            LocalDateTime to) {


        // =================================================
        // TỔNG DOANH THU
        // =================================================

        BigDecimal totalRevenue =
                revenueRepository.getTotalRevenue(
                        from,
                        to
                );


        if (totalRevenue == null) {

            totalRevenue =
                    BigDecimal.ZERO;
        }


        // =================================================
        // TỔNG HÓA ĐƠN
        // =================================================

        Long totalInvoices =
                revenueRepository.getTotalInvoices(
                        from,
                        to
                );


        if (totalInvoices == null) {

            totalInvoices = 0L;
        }


        // =================================================
        // TRUNG BÌNH HÓA ĐƠN
        // =================================================

        BigDecimal averageInvoice = BigDecimal.ZERO;

        if (totalInvoices > 0) {
            averageInvoice = totalRevenue
                    .divide(BigDecimal.valueOf(totalInvoices), 2);
        }


        // =================================================
        // TỔNG SỐ MÓN ĐÃ BÁN
        // =================================================

        Long totalItemsSold =
                revenueRepository.getTotalItemsSold(
                        from,
                        to
                );


        if (totalItemsSold == null) {

            totalItemsSold = 0L;
        }


        // =================================================
        // DANH SÁCH MÓN
        // =================================================

        List<RevenueItemDto> items =
                revenueRepository
                        .getRevenueItems(
                                from,
                                to
                        )
                        .stream()
                        .map(this::convertItem)
                        .toList();


        // =================================================
        // MÓN BÁN CHẠY NHẤT
        //
        // Repository đã ORDER BY quantity DESC
        // nên phần tử đầu tiên là món bán chạy nhất.
        // =================================================

        RevenueItemDto bestSellingItem =
                items.isEmpty()
                        ? null
                        : items.get(0);


        // =================================================
        // DOANH THU THEO NGÀY
        // =================================================

        List<RevenueByDateDto> revenueByDate =
                revenueRepository
                        .getRevenueByDate(
                                from,
                                to
                        )
                        .stream()
                        .map(
                                this::convertRevenueByDate
                        )
                        .toList();


        // =================================================
        // DOANH THU THEO PAYMENT
        // =================================================

        List<RevenueByPaymentDto> revenueByPayment =
                revenueRepository
                        .getRevenueByPayment(
                                from,
                                to
                        )
                        .stream()
                        .map(
                                this::convertRevenueByPayment
                        )
                        .toList();


        // =================================================
        // TẠO DTO
        // =================================================

        RevenueDto dto =
                new RevenueDto();


        dto.setFromDate(
                fromDate
        );

        dto.setToDate(
                toDate
        );


        dto.setTotalRevenue(
                totalRevenue
        );

        dto.setTotalInvoices(
                totalInvoices
        );

        dto.setAverageInvoice(
                averageInvoice
        );

        dto.setTotalItemsSold(
                totalItemsSold
        );


        dto.setItems(
                items
        );

        dto.setBestSellingItem(
                bestSellingItem
        );


        dto.setRevenueByDate(
                revenueByDate
        );

        dto.setRevenueByPayment(
                revenueByPayment
        );


        return dto;
    }


    // =====================================================
    // CONVERT ITEM
    // =====================================================

    private RevenueItemDto convertItem(
            RevenueItemProjection projection) {

        RevenueItemDto dto =
                new RevenueItemDto();

        dto.setProductId(
                projection.getProductId()
        );

        dto.setProductName(
                projection.getProductName()
        );

        dto.setQuantitySold(
                projection.getQuantitySold()
        );

        dto.setRevenue(
                projection.getRevenue()
        );

        return dto;
    }


    // =====================================================
    // CONVERT REVENUE BY DATE
    // =====================================================

    private RevenueByDateDto convertRevenueByDate(
            RevenueByDateProjection projection) {

        RevenueByDateDto dto =
                new RevenueByDateDto();

        dto.setDate(
                projection.getDate()
        );

        dto.setRevenue(
                projection.getRevenue()
        );

        dto.setInvoiceCount(
                projection.getInvoiceCount()
        );

        return dto;
    }


    // =====================================================
    // CONVERT REVENUE BY PAYMENT
    // =====================================================

    private RevenueByPaymentDto convertRevenueByPayment(
            RevenueByPaymentProjection projection) {

        RevenueByPaymentDto dto =
                new RevenueByPaymentDto();

        dto.setPaymentMethod(
                projection.getPaymentMethod()
        );

        dto.setRevenue(
                projection.getRevenue()
        );

        dto.setInvoiceCount(
                projection.getInvoiceCount()
        );

        return dto;
    }
}