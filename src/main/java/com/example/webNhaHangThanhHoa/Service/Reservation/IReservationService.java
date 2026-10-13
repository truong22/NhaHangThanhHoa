package com.example.webNhaHangThanhHoa.Service.Reservation;
import com.example.webNhaHangThanhHoa.DTO.ReservationDto;
import com.example.webNhaHangThanhHoa.Entity.reservations;
import com.example.webNhaHangThanhHoa.Request.ReservationRequest;

import java.time.LocalDate;
import java.util.List;

public interface IReservationService {

    List<ReservationDto> getAllReservations();

    ReservationDto getReservationById(Long id);

    ReservationDto getReservationByCode(String code);

    ReservationDto addReservation(
            ReservationRequest request
    );

    ReservationDto updateReservation(
            Long id,
            ReservationRequest request
    );

    void deleteReservation(Long id);

    List<ReservationDto> getByDate(
            LocalDate date
    );

    List<ReservationDto> getByStatus(
            String status
    );

    List<ReservationDto> getByCustomer(
            Long customerId
    );

    List<ReservationDto> getByTable(
            Long tableId
    );

    List<ReservationDto> getUpcomingReservations();

    List<ReservationDto> getWarningReservations();

    ReservationDto switchTable(Long reservationId, Long newTableId);
}