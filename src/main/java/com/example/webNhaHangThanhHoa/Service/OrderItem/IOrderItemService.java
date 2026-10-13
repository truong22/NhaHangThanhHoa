package com.example.webNhaHangThanhHoa.Service.OrderItem;

import com.example.webNhaHangThanhHoa.DTO.OrderItemDto;
import com.example.webNhaHangThanhHoa.Entity.order_items;
import com.example.webNhaHangThanhHoa.Request.OrderItemRequest;

import java.util.List;

public interface IOrderItemService {

    List<OrderItemDto> getAllOrderItems();

    OrderItemDto getOrderItemById(Long id);

    List<OrderItemDto> getByOrder(Long orderId);

    List<OrderItemDto> getByStatus(String status);

    List<OrderItemDto> getKitchenItems();

    order_items addOrderItem(
            OrderItemRequest request
    );

    OrderItemDto updateStatus(
            Long id,
            String status
    );

    void deleteOrderItem(Long id);

    OrderItemDto convertToDto(
            order_items item
    );
}
