package com.example.webNhaHangThanhHoa.Service.Order;

import com.example.webNhaHangThanhHoa.DTO.OrderDto;
import com.example.webNhaHangThanhHoa.Entity.customers;
import com.example.webNhaHangThanhHoa.Entity.orders;
import com.example.webNhaHangThanhHoa.Entity.tables_Restaurant;
import com.example.webNhaHangThanhHoa.Entity.users;
import com.example.webNhaHangThanhHoa.Exception.AlreadyExitsException;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Repository.CustomerRepository;
import com.example.webNhaHangThanhHoa.Repository.OrderRepository;
import com.example.webNhaHangThanhHoa.Repository.TableRepository;
import com.example.webNhaHangThanhHoa.Repository.UserRepository;
import com.example.webNhaHangThanhHoa.Request.OrderRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService
        implements IOrderService {

    private final OrderRepository orderRepository;

    private final CustomerRepository customerRepository;

    private final TableRepository tableRepository;

    private final UserRepository userRepository;


    // =====================================================
    // GET ALL
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderDto> getAllOrders() {

        return orderRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public OrderDto getOrderById(Long id) {

        orders order =
                orderRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy Order với id: " + id
                                )
                        );

        return convertToDto(order);
    }


    // =====================================================
    // GET BY CODE
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public OrderDto getOrderByCode(
            String orderCode) {

        orders order =
                orderRepository
                        .findByOrderCode(orderCode)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy Order: "
                                                + orderCode
                                )
                        );

        return convertToDto(order);
    }


    // =====================================================
    // CREATE ORDER
    // =====================================================

    @Override
    @Transactional
    public orders addOrder(
            OrderRequest request) {

        // -------------------------------------------------
        // Kiểm tra mã Order
        // -------------------------------------------------

        if (orderRepository.existsByOrderCode(
                request.getOrderCode())) {

            throw new AlreadyExitsException(
                    "Mã Order đã tồn tại"
            );
        }


        // -------------------------------------------------
        // Tìm bàn
        // -------------------------------------------------

        tables_Restaurant table =
                tableRepository.findById(
                        request.getTableId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy bàn"
                        )
                );


        // Bàn phải đang phục vụ hoặc đặt trước
        // -------------------------------------------------

        if (!"OCCUPIED".equalsIgnoreCase(table.getStatus()) && 
            !"RESERVED".equalsIgnoreCase(table.getStatus())) {

            throw new RuntimeException(
                    "Bàn chưa ở trạng thái OCCUPIED hoặc RESERVED"
            );
        }


        // -------------------------------------------------
        // Tìm khách hàng
        // -------------------------------------------------

        customers customer =
                customerRepository.findById(
                        request.getCustomerId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy khách hàng"
                        )
                );


        // -------------------------------------------------
        // Tìm nhân viên
        // -------------------------------------------------

        users user =
                userRepository.findById(
                        request.getUserId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy nhân viên"
                        )
                );


        // -------------------------------------------------
        // Tạo Order
        // -------------------------------------------------

        orders order =
                new orders();

        order.setOrderCode(
                request.getOrderCode()
        );

        order.setTable(table);

        order.setCustomer(customer);

        order.setUser(user);

        order.setNote(
                request.getNote()
        );

        order.setStatus("PENDING");

        order.setSubtotal(
                BigDecimal.ZERO
        );


        // -------------------------------------------------
        // Lưu Order
        // -------------------------------------------------

        return orderRepository.save(order);
    }


    // =====================================================
    // UPDATE STATUS
    // =====================================================

    @Override
    @Transactional
    public OrderDto updateOrderStatus(
            Long id,
            String status) {

        orders order =
                orderRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy Order"
                                )
                        );

        String newStatus =
                status.toUpperCase();


        switch (newStatus) {

            case "PENDING":
            case "PROCESSING":
            case "READY":
            case "SERVED":
            case "COMPLETED":
            case "CANCELLED":

                order.setStatus(newStatus);

                break;

            default:

                throw new RuntimeException(
                        "Trạng thái Order không hợp lệ"
                );
        }


        if ("COMPLETED".equals(newStatus)) {

            order.setCompletedAt(
                    LocalDateTime.now()
            );
        }


        return convertToDto(
                orderRepository.save(order)
        );
    }


    // =====================================================
    // ĐỔI BÀN (SWITCH TABLE - DÀNH CHO ADMIN & CASHIER)
    // =====================================================

    @Override
    @Transactional
    public OrderDto switchTable(Long orderId, Long newTableId) {

        orders order =
                orderRepository.findById(orderId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy Order với id: " + orderId
                                )
                        );

        tables_Restaurant oldTable = order.getTable();

        tables_Restaurant newTable =
                tableRepository.findById(newTableId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy bàn mới với id: " + newTableId
                                )
                        );

        // Chuyển bàn cũ sang AVAILABLE (trống)
        if (oldTable != null && !oldTable.getId().equals(newTableId)) {
            oldTable.setStatus("AVAILABLE");
            tableRepository.save(oldTable);
        }

        // Chuyển bàn mới sang OCCUPIED (có khách)
        newTable.setStatus("OCCUPIED");
        tableRepository.save(newTable);

        // Gán bàn mới vào order
        order.setTable(newTable);

        return convertToDto(
                orderRepository.save(order)
        );
    }

    @Override
    @Transactional
    public OrderDto updateOrderNote(Long id, String note) {
        orders order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Order với id: " + id));
        order.setNote(note);
        return convertToDto(orderRepository.save(order));
    }

    @Override
    @Transactional
    public OrderDto updateOrderCustomer(Long id, Long customerId) {
        orders order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Order với id: " + id));
        customers customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng với id: " + customerId));
        order.setCustomer(customer);
        return convertToDto(orderRepository.save(order));
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Override
    @Transactional
    public void deleteOrder(Long id) {

        orders order =
                orderRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy Order"
                                )
                        );

        orderRepository.delete(order);
    }


    // =====================================================
    // GET BY TABLE
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderDto> getByTable(
            Long tableId) {

        return orderRepository
                .findByTableId(tableId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY CUSTOMER
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderDto> getByCustomer(
            Long customerId) {

        return orderRepository
                .findByCustomerId(customerId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY USER
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderDto> getByUser(
            Long userId) {

        return orderRepository
                .findByUserId(userId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY STATUS
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderDto> getByStatus(
            String status) {

        return orderRepository
                .findByStatus(
                        status.toUpperCase()
                )
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // ACTIVE ORDER CỦA BÀN
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderDto> getActiveOrdersByTable(
            Long tableId) {

        return orderRepository
                .findActiveOrdersByTable(tableId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // ENTITY → DTO
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public OrderDto convertToDto(
            orders order) {

        OrderDto dto =
                new OrderDto();

        dto.setId(order.getId());

        dto.setOrderCode(
                order.getOrderCode()
        );

        // Tính tổng tiền chính xác từ các món thực tế trong đơn (bỏ qua món đã hủy)
        BigDecimal calculatedSubtotal = BigDecimal.ZERO;
        if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            calculatedSubtotal = order.getOrderItems().stream()
                    .filter(it -> !"CANCELLED".equalsIgnoreCase(it.getStatus()))
                    .map(it -> it.getSubtotal() != null ? it.getSubtotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else if (order.getSubtotal() != null) {
            calculatedSubtotal = order.getSubtotal();
        }

        dto.setSubtotal(
                calculatedSubtotal
        );

        dto.setNote(
                order.getNote()
        );

        dto.setStatus(
                order.getStatus()
        );

        dto.setCreatedAt(
                order.getCreatedAt()
        );

        dto.setUpdatedAt(
                order.getUpdatedAt()
        );

        LocalDateTime completedTime = order.getCompletedAt();
        if (completedTime == null) {
            if (order.getInvoice() != null && order.getInvoice().getIssuedAt() != null) {
                completedTime = order.getInvoice().getIssuedAt();
            } else if ("COMPLETED".equalsIgnoreCase(order.getStatus()) && order.getUpdatedAt() != null) {
                completedTime = order.getUpdatedAt();
            }
        }
        dto.setCompletedAt(completedTime);


        if (order.getTable() != null) {

            dto.setTableId(
                    order.getTable().getId()
            );

            dto.setTableName(
                    order.getTable().getTableName()
            );
        }


        if (order.getCustomer() != null) {

            dto.setCustomerId(
                    order.getCustomer().getId()
            );

            dto.setCustomerName(
                    order.getCustomer().getFullName()
            );

            dto.setCustomerPhone(
                    order.getCustomer().getPhone()
            );

            dto.setVisitCount(
                    order.getCustomer().getVisitCount()
            );
        }


        if (order.getUser() != null) {

            dto.setUserId(
                    order.getUser().getId()
            );

            String displayName = order.getUser().getFullName();
            if (displayName == null || displayName.trim().isEmpty()) {
                displayName = order.getUser().getUsername();
            }

            dto.setUsername(
                    displayName
            );
        }


        return dto;
    }


    // =====================================================
    // LIST ENTITY → DTO
    // =====================================================

    @Override
    public List<OrderDto> convertToDtoList(
            List<orders> orders) {

        return orders
                .stream()
                .map(this::convertToDto)
                .toList();
    }
}

