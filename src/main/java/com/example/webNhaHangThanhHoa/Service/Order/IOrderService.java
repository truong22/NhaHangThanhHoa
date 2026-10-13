package com.example.webNhaHangThanhHoa.Service.Order;

import com.example.webNhaHangThanhHoa.DTO.OrderDto;
import com.example.webNhaHangThanhHoa.Entity.orders;
import com.example.webNhaHangThanhHoa.Request.OrderRequest;

import java.util.List;

public interface IOrderService {

    List<OrderDto> getAllOrders();

    OrderDto getOrderById(Long id);

    OrderDto getOrderByCode(String orderCode);

    orders addOrder(OrderRequest request);

    OrderDto updateOrderStatus(
            Long id,
            String status
    );

    OrderDto switchTable(
            Long orderId,
            Long newTableId
    );

    void deleteOrder(Long id);

    List<OrderDto> getByTable(Long tableId);

    List<OrderDto> getByCustomer(Long customerId);

    List<OrderDto> getByUser(Long userId);

    List<OrderDto> getByStatus(String status);

    List<OrderDto> getActiveOrdersByTable(
            Long tableId
    );

    OrderDto convertToDto(
            orders order
    );

    List<OrderDto> convertToDtoList(
            List<orders> orders
    );
}
