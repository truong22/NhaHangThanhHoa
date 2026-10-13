package com.example.webNhaHangThanhHoa.Service.Reservation;
import com.example.webNhaHangThanhHoa.DTO.ReservationDto;
import com.example.webNhaHangThanhHoa.Entity.customers;
import com.example.webNhaHangThanhHoa.Entity.reservations;
import com.example.webNhaHangThanhHoa.Entity.tables_Restaurant;
import com.example.webNhaHangThanhHoa.Exception.AlreadyExitsException;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Repository.ReservationRepository;
import com.example.webNhaHangThanhHoa.Repository.CustomerRepository;
import com.example.webNhaHangThanhHoa.Repository.TableRepository;
import com.example.webNhaHangThanhHoa.Request.ReservationRequest;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService
        implements IReservationService {

    private final ReservationRepository reservationRepository;

    private final CustomerRepository customerRepository;

    private final TableRepository tableRepository;

    private final ModelMapper modelMapper;


    // =====================================================
    // GET ALL
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getAllReservations() {

        return reservationRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public ReservationDto getReservationById(Long id) {

        reservations reservation =
                reservationRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy đặt bàn với id: " + id
                                )
                        );

        return convertToDto(reservation);
    }


    // =====================================================
    // GET BY CODE
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public ReservationDto getReservationByCode(
            String code) {

        reservations reservation =
                reservationRepository
                        .findByReservationCode(code)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy mã đặt bàn: " + code
                                )
                        );

        return convertToDto(reservation);
    }


    // =====================================================
    // ADD
    // =====================================================

    @Override
    @Transactional
    public ReservationDto  addReservation(
            ReservationRequest request) {

        // 1. Kiểm tra mã đặt bàn
        if (reservationRepository
                .existsByReservationCode(
                        request.getReservationCode())) {

            throw new AlreadyExitsException(
                    "Mã đặt bàn đã tồn tại"
            );
        }

        // 2. Kiểm tra thời gian
        if (!request.getEndTime()
                .isAfter(request.getStartTime())) {

            throw new RuntimeException(
                    "Thời gian kết thúc phải sau thời gian bắt đầu"
            );
        }

        // 3. Tìm khách hàng
        customers customer =
                customerRepository.findById(
                        request.getCustomerId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy khách hàng"
                        )
                );

        // 4. Tìm bàn
        tables_Restaurant table =
                tableRepository.findById(
                        request.getTableId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy bàn"
                        )
                );

        // 5. Kiểm tra trùng lịch
        boolean exists =
                reservationRepository
                        .existsOverlappingReservation(
                                request.getTableId(),
                                request.getReservationDate(),
                                request.getStartTime(),
                                request.getEndTime()
                        );

        if (exists) {
            throw new RuntimeException(
                    "Bàn đã được đặt trong khoảng thời gian này"
            );
        }

        // 6. Tạo Reservation
        reservations reservation =
                new reservations();

        reservation.setReservationCode(
                request.getReservationCode()
        );

        reservation.setCustomer(customer);

        reservation.setTable(table);

        reservation.setReservationDate(
                request.getReservationDate()
        );

        reservation.setStartTime(
                request.getStartTime()
        );

        reservation.setEndTime(
                request.getEndTime()
        );

        reservation.setNumberOfGuests(
                request.getNumberOfGuests()
        );

        reservation.setNote(
                request.getNote()
        );

        reservation.setStatus("PENDING");

        // 7. Lưu
        reservations saved =
                reservationRepository.save(reservation);

        return convertToDto(saved);

    }
    // =====================================================
    // UPDATE
    // =====================================================

    @Override
    @Transactional
    public ReservationDto updateReservation(
            Long id,
            ReservationRequest request) {

        reservations reservation =
                reservationRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy đặt bàn"
                                )
                        );


        // ---------------------------------------------
        // Kiểm tra thời gian
        // ---------------------------------------------

        validateTime(
                request.getStartTime(),
                request.getEndTime()
        );


        // ---------------------------------------------
        // Kiểm tra mã đặt bàn
        // ---------------------------------------------

        if (!reservation
                .getReservationCode()
                .equals(request.getReservationCode())) {

            if (reservationRepository
                    .existsByReservationCode(
                            request.getReservationCode())) {

                throw new RuntimeException(
                        "Mã đặt bàn đã tồn tại"
                );
            }

            reservation.setReservationCode(
                    request.getReservationCode()
            );
        }


        // ---------------------------------------------
        // Customer
        // ---------------------------------------------

        customers customer =
                customerRepository.findById(
                        request.getCustomerId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy khách hàng"
                        )
                );


        // ---------------------------------------------
        // Table
        // ---------------------------------------------

        tables_Restaurant table =
                tableRepository.findById(
                        request.getTableId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy bàn"
                        )
                );


        // ---------------------------------------------
        // Kiểm tra trùng lịch
        // ---------------------------------------------

        boolean overlapping =
                reservationRepository
                        .existsOverlappingReservationForUpdate(
                                id,
                                request.getTableId(),
                                request.getReservationDate(),
                                request.getStartTime(),
                                request.getEndTime()
                        );

        if (overlapping) {

            throw new RuntimeException(
                    "Bàn đã có lịch đặt trùng thời gian"
            );
        }


        // ---------------------------------------------
        // Request → Entity
        // ---------------------------------------------

        reservation.setCustomer(customer);

        reservation.setTable(table);

        reservation.setReservationDate(
                request.getReservationDate()
        );

        reservation.setStartTime(
                request.getStartTime()
        );

        reservation.setEndTime(
                request.getEndTime()
        );

        reservation.setNumberOfGuests(
                request.getNumberOfGuests()
        );

        reservation.setNote(
                request.getNote()
        );


        // Không cho update làm mất status hiện tại.

        reservations saved =
                reservationRepository.save(
                        reservation
                );

        return convertToDto(saved);
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Override
    @Transactional
    public void deleteReservation(Long id) {

        reservations reservation =
                reservationRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy đặt bàn"
                                )
                        );

        reservationRepository.delete(
                reservation
        );
    }


    // =====================================================
    // GET BY DATE
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getByDate(
            LocalDate date) {

        return reservationRepository
                .findByReservationDate(date)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY STATUS
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getByStatus(
            String status) {

        return reservationRepository
                .findByStatus(
                        status.toUpperCase()
                )
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY CUSTOMER
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getByCustomer(
            Long customerId) {

        return reservationRepository
                .findByCustomerId(customerId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY TABLE
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getByTable(
            Long tableId) {

        return reservationRepository
                .findByTableId(tableId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // RESERVATION SẮP TỚI
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getUpcomingReservations() {

        LocalDate today =
                LocalDate.now();

        LocalTime now =
                LocalTime.now();

        return reservationRepository
                .findUpcomingReservations(
                        today,
                        now,
                        LocalTime.MAX
                )
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // CẢNH BÁO TRƯỚC 30 PHÚT
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getWarningReservations() {

        LocalDate today =
                LocalDate.now();

        LocalTime now =
                LocalTime.now();

        LocalTime after30Minutes =
                now.plusMinutes(30);


        return reservationRepository
                .findUpcomingReservations(
                        today,
                        now,
                        after30Minutes
                )
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // VALIDATE TIME
    // =====================================================

    private void validateTime(
            LocalTime startTime,
            LocalTime endTime) {

        if (startTime == null ||
                endTime == null) {

            throw new RuntimeException(
                    "Thời gian bắt đầu và kết thúc không được để trống"
            );
        }

        if (!endTime.isAfter(startTime)) {

            throw new RuntimeException(
                    "Thời gian kết thúc phải sau thời gian bắt đầu"
            );
        }
    }


    // =====================================================
    // ENTITY → DTO
    // =====================================================

    private ReservationDto convertToDto(
            reservations reservation) {

        ReservationDto dto =
                modelMapper.map(
                        reservation,
                        ReservationDto.class
                );

        if (reservation.getCustomer() != null) {

            dto.setCustomerId(
                    reservation
                            .getCustomer()
                            .getId()
            );

            /*
             * Nếu customers của bạn dùng field khác
             * thay cho name thì đổi ở đây.
             */
            dto.setCustomerName(
                    reservation
                            .getCustomer()
                            .getFullName()
            );
        }

        if (reservation.getTable() != null) {

            dto.setTableId(
                    reservation
                            .getTable()
                            .getId()
            );

            /*
             * Nếu tables_Restaurant dùng field khác
             * thay cho tableNumber thì đổi ở đây.
             */
            dto.setTableNumber(
                    reservation
                            .getTable()
                            .getTableName()
            );
        }

        return dto;
    }

    @Override
    @Transactional
    public ReservationDto switchTable(Long reservationId, Long newTableId) {
        reservations reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt bàn: " + reservationId));

        tables_Restaurant newTable = tableRepository.findById(newTableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn mới: " + newTableId));

        // Kiểm tra trùng lịch ở bàn mới
        boolean overlapping = reservationRepository.existsOverlappingReservationForUpdate(
                reservationId,
                newTableId,
                reservation.getReservationDate(),
                reservation.getStartTime(),
                reservation.getEndTime()
        );

        if (overlapping) {
            throw new RuntimeException("Bàn mới đã có lịch đặt trùng thời gian");
        }

        reservation.setTable(newTable);
        reservations saved = reservationRepository.save(reservation);
        return convertToDto(saved);
    }
}