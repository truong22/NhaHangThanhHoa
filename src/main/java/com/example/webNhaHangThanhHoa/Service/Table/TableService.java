package com.example.webNhaHangThanhHoa.Service.Table;
import com.example.webNhaHangThanhHoa.Request.TableRequest;
import com.example.webNhaHangThanhHoa.Entity.tables_Restaurant;
import com.example.webNhaHangThanhHoa.Entity.orders;
import com.example.webNhaHangThanhHoa.Entity.reservations;
import com.example.webNhaHangThanhHoa.Repository.OrderRepository;
import com.example.webNhaHangThanhHoa.Repository.ReservationRepository;
import com.example.webNhaHangThanhHoa.Repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TableService implements ITableService {
        private final TableRepository tableRepository;
        private final OrderRepository orderRepository;
        private final ReservationRepository reservationRepository;

        @Override
        public List<tables_Restaurant> getAllTables() {
            return tableRepository.findAll();
        }

        @Override
        public tables_Restaurant createTable(TableRequest request) {
            try {
                tables_Restaurant table = new tables_Restaurant();
                table.setTableName(request.getTableName());
                table.setCapacity(request.getCapacity());
                table.setStatus("AVAILABLE"); // Mặc định bàn mới là trống
                return tableRepository.save(table);
            } catch (DataIntegrityViolationException e) {
                throw new RuntimeException("Tên bàn '" + request.getTableName() + "' đã tồn tại trong hệ thống!");
            }
        }
        @Override
        public tables_Restaurant updateTable(Long id, TableRequest request) {
            tables_Restaurant table = tableRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy bàn có ID: " + id));

            // Cập nhật tên nếu có truyền lên
            if (request.getTableName() != null && !request.getTableName().trim().isEmpty()) {
                table.setTableName(request.getTableName());
            }

            // Cập nhật sức chứa nếu có truyền lên
            if (request.getCapacity() != null) {
                table.setCapacity(request.getCapacity());
            }

            // Cập nhật trạng thái nếu có truyền lên
            if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
                String upperStatus = request.getStatus().toUpperCase();

                // Chặn nếu muốn đổi sang AVAILABLE hoặc RESERVED khi bàn đang có đơn ăn chưa hoàn tất
                if ("AVAILABLE".equalsIgnoreCase(upperStatus) || "RESERVED".equalsIgnoreCase(upperStatus)) {
                    List<orders> activeOrders = orderRepository.findActiveOrdersByTable(id);
                    if (activeOrders != null && !activeOrders.isEmpty()) {
                        throw new RuntimeException("Bàn đang có khách ngồi dùng bữa và có đơn hàng chưa thanh toán, không thể chuyển sang trạng thái Trống hoặc Đặt trước!");
                    }
                }

                table.setStatus(upperStatus);

                if ("OCCUPIED".equalsIgnoreCase(upperStatus)) {
                    table.setOccupiedAt(LocalDateTime.now());
                } else if ("AVAILABLE".equalsIgnoreCase(upperStatus)) {
                    table.setOccupiedAt(null);
                }
            }

            try {
                return tableRepository.save(table);
            } catch (DataIntegrityViolationException e) {
                throw new RuntimeException("Tên bàn '" + request.getTableName() + "' đã tồn tại trong hệ thống!");
            }
        }
        @Override
        public void deleteTable(Long id) {
            tables_Restaurant table = tableRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy bàn có ID: " + id + " để xóa!"));

            if ("OCCUPIED".equalsIgnoreCase(table.getStatus()) || "BUSY".equalsIgnoreCase(table.getStatus())) {
                throw new RuntimeException("Bàn đang có khách ngồi, không thể xóa!");
            }

            if ("RESERVED".equalsIgnoreCase(table.getStatus())) {
                throw new RuntimeException("Bàn đang có khách đặt trước, không thể xóa!");
            }

            List<orders> activeOrders = orderRepository.findActiveOrdersByTable(id);
            if (activeOrders != null && !activeOrders.isEmpty()) {
                throw new RuntimeException("Bàn đang có đơn hàng chưa hoàn thành, không thể xóa!");
            }

            List<orders> allOrders = orderRepository.findByTableId(id);
            if (allOrders != null) {
                boolean hasUnfinished = allOrders.stream().anyMatch(o ->
                        !"COMPLETED".equalsIgnoreCase(o.getStatus()) && !"CANCELLED".equalsIgnoreCase(o.getStatus())
                );
                if (hasUnfinished) {
                    throw new RuntimeException("Bàn đang có đơn hàng chưa hoàn thành, không thể xóa!");
                }
            }

            List<reservations> allReservations = reservationRepository.findByTableId(id);
            if (allReservations != null) {
                boolean hasActiveRes = allReservations.stream().anyMatch(r ->
                        !"COMPLETED".equalsIgnoreCase(r.getStatus()) && !"CANCELLED".equalsIgnoreCase(r.getStatus())
                );
                if (hasActiveRes) {
                    throw new RuntimeException("Bàn đang có lịch khách đặt trước chưa hoàn tất, không thể xóa bàn!");
                }
            }

            try {
                tableRepository.deleteById(id);
            } catch (DataIntegrityViolationException e) {
                throw new RuntimeException("Không thể xóa bàn vì bàn này đã phát sinh lịch sử đơn hàng hoặc đặt bàn trong hệ thống!");
            }
        }
    }
