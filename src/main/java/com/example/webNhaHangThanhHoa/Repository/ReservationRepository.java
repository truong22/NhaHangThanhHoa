package com.example.webNhaHangThanhHoa.Repository;
import com.example.webNhaHangThanhHoa.Entity.reservations;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository
        extends JpaRepository<reservations, Long> {

    Optional<reservations> findByReservationCode(
            String reservationCode
    );

    boolean existsByReservationCode(
            String reservationCode
    );

    /*
     * Kiểm tra trùng lịch.
     *
     * Điều kiện:
     *
     * newStart < oldEnd
     * AND
     * newEnd > oldStart
     *
     * đồng thời phải cùng bàn và cùng ngày.
     */
    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM reservations r
        WHERE r.table.id = :tableId
        AND r.reservationDate = :reservationDate
        AND r.status IN ('PENDING', 'CONFIRMED')
        AND r.startTime < :endTime
        AND r.endTime > :startTime
        """)
    boolean existsOverlappingReservation(
            @Param("tableId") Long tableId,
            @Param("reservationDate") LocalDate reservationDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    /*
     * Dùng khi UPDATE.
     * Không tính chính reservation đang được sửa.
     */
    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM reservations r
        WHERE r.id <> :reservationId
        AND r.table.id = :tableId
        AND r.reservationDate = :reservationDate
        AND r.status IN ('PENDING', 'CONFIRMED')
        AND r.startTime < :endTime
        AND r.endTime > :startTime
        """)
    boolean existsOverlappingReservationForUpdate(
            @Param("reservationId") Long reservationId,
            @Param("tableId") Long tableId,
            @Param("reservationDate") LocalDate reservationDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    List<reservations> findByReservationDate(
            LocalDate reservationDate
    );

    List<reservations> findByStatus(
            String status
    );

    List<reservations> findByCustomerId(
            Long customerId
    );

    List<reservations> findByTableId(
            Long tableId
    );

    /*
     * Tìm các reservation sắp tới.
     */
    @Query("""
    SELECT r
    FROM reservations r
    WHERE r.reservationDate = :date
    AND r.status IN ('PENDING', 'CONFIRMED')
    AND r.startTime >= :fromTime
    AND r.startTime <= :toTime
    ORDER BY r.startTime ASC
    """)
    List<reservations> findUpcomingReservations(
            @Param("date") LocalDate date,
            @Param("fromTime") LocalTime fromTime,
            @Param("toTime") LocalTime toTime
    );
}