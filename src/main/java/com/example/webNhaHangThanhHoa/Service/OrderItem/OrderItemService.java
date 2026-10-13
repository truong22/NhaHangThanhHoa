package com.example.webNhaHangThanhHoa.Service.OrderItem;

import com.example.webNhaHangThanhHoa.DTO.OrderItemDto;
import com.example.webNhaHangThanhHoa.Entity.order_items;
import com.example.webNhaHangThanhHoa.Entity.orders;
import com.example.webNhaHangThanhHoa.Entity.products;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Repository.OrderItemRepository;
import com.example.webNhaHangThanhHoa.Repository.OrderRepository;
import com.example.webNhaHangThanhHoa.Repository.ProductRepository;
import com.example.webNhaHangThanhHoa.Request.OrderItemRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderItemService
        implements IOrderItemService {

    private final OrderItemRepository orderItemRepository;

    private final OrderRepository orderRepository;

    private final ProductRepository productRepository;


    // =====================================================
    // GET ALL
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderItemDto> getAllOrderItems() {

        return orderItemRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public OrderItemDto getOrderItemById(
            Long id) {

        order_items item =
                orderItemRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy OrderItem"
                                )
                        );

        return convertToDto(item);
    }


    // =====================================================
    // GET BY ORDER
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderItemDto> getByOrder(
            Long orderId) {

        return orderItemRepository
                .findByOrderId(orderId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // GET BY STATUS
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderItemDto> getByStatus(
            String status) {

        return orderItemRepository
                .findByStatus(
                        status.toUpperCase()
                )
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // BẾP - LẤY MÓN CẦN LÀM
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<OrderItemDto> getKitchenItems() {

        return orderItemRepository
                .findKitchenItems()
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    // =====================================================
    // THÊM MÓN VÀO ORDER
    // =====================================================

    @Override
    @Transactional
    public order_items addOrderItem(
            OrderItemRequest request) {

        // -------------------------------------------------
        // Tìm Order
        // -------------------------------------------------

        orders order =
                orderRepository.findById(
                        request.getOrderId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy Order"
                        )
                );


        // -------------------------------------------------
        // Không được thêm món nếu Order đã hoàn thành
        // -------------------------------------------------

        if ("COMPLETED".equalsIgnoreCase(
                order.getStatus())) {

            throw new RuntimeException(
                    "Order đã hoàn thành, không thể thêm món"
            );
        }


        if ("CANCELLED".equalsIgnoreCase(
                order.getStatus())) {

            throw new RuntimeException(
                    "Order đã bị hủy"
            );
        }


        // -------------------------------------------------
        // Tìm Product
        // -------------------------------------------------

        products product =
                productRepository.findById(
                        request.getProductId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy sản phẩm"
                        )
                );


        if (product.getStatus() != null && 
            !"ACTIVE".equalsIgnoreCase(product.getStatus()) && 
            !"AVAILABLE".equalsIgnoreCase(product.getStatus())) {
            
            throw new RuntimeException(
                    "Sản phẩm hiện không bán"
            );
        }


        // -------------------------------------------------
        // Lấy giá hiện tại từ DB
        // -------------------------------------------------

        BigDecimal unitPrice =
                product.getPrice();


        // -------------------------------------------------
        // Tính tiền
        // -------------------------------------------------

        BigDecimal subtotal =
                unitPrice.multiply(
                        BigDecimal.valueOf(
                                request.getQuantity()
                        )
                );


        // -------------------------------------------------
        // Tạo OrderItem
        // -------------------------------------------------

        order_items item =
                new order_items();

        item.setOrder(order);

        item.setProduct(product);

        item.setQuantity(
                request.getQuantity()
        );

        item.setUnitPrice(
                unitPrice
        );

        item.setSubtotal(
                subtotal
        );

        item.setNote(
                request.getNote()
        );

        item.setStatus("PENDING");


        // -------------------------------------------------
        // Lưu Item
        // -------------------------------------------------

        order_items saved =
                orderItemRepository.save(item);


        // -------------------------------------------------
        // Cập nhật tổng tiền Order chính xác từ các món
        // -------------------------------------------------

        syncOrderSubtotal(order);

        return saved;
    }


    // =====================================================
    // BẾP ĐỔI TRẠNG THÁI
    // =====================================================

    @Override
    @Transactional
    public OrderItemDto updateStatus(
            Long id,
            String status) {

        order_items item =
                orderItemRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy OrderItem"
                                )
                        );

        String newStatus =
                status.toUpperCase();


        switch (newStatus) {

            case "PENDING":
            case "PREPARING":
            case "READY":
            case "CANCELLED":

                item.setStatus(newStatus);

                break;

            default:

                throw new RuntimeException(
                        "Trạng thái OrderItem không hợp lệ"
                );
        }

        order_items updatedItem = orderItemRepository.save(item);

        // Nếu món bị HỦY, lập tức đồng bộ lại tổng tiền Order
        if ("CANCELLED".equals(newStatus) && item.getOrder() != null) {
            syncOrderSubtotal(item.getOrder());
        }

        return convertToDto(updatedItem);
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Override
    @Transactional
    public void deleteOrderItem(
            Long id) {

        order_items item =
                orderItemRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy OrderItem"
                                )
                        );

        if ("PREPARING".equalsIgnoreCase(item.getStatus())) {
            throw new RuntimeException("Món ăn đang được nấu (chế biến), không thể xóa!");
        }

        if ("READY".equalsIgnoreCase(item.getStatus())) {
            throw new RuntimeException("Món ăn đã chế biến xong, không thể xóa!");
        }

        orders order =
                item.getOrder();

        orderItemRepository.delete(item);

        // Đồng bộ lại tổng tiền chuẩn xác sau khi xóa món
        if (order != null) {
            syncOrderSubtotal(order);
        }
    }

    private void syncOrderSubtotal(orders order) {
        if (order == null || order.getId() == null) return;
        List<order_items> allItems = orderItemRepository.findByOrderId(order.getId());
        BigDecimal total = allItems.stream()
                .filter(it -> !"CANCELLED".equalsIgnoreCase(it.getStatus()))
                .map(it -> it.getSubtotal() != null ? it.getSubtotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setSubtotal(total);
        orderRepository.save(order);
    }


    // =====================================================
    // ENTITY → DTO
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public OrderItemDto convertToDto(
            order_items item) {

        OrderItemDto dto =
                new OrderItemDto();

        dto.setId(item.getId());

        dto.setQuantity(
                item.getQuantity()
        );

        dto.setUnitPrice(
                item.getUnitPrice()
        );

        dto.setSubtotal(
                item.getSubtotal()
        );

        dto.setNote(
                item.getNote()
        );

        dto.setStatus(
                item.getStatus()
        );

        dto.setCreatedAt(
                item.getCreatedAt()
        );

        dto.setUpdatedAt(
                item.getUpdatedAt()
        );


        if (item.getOrder() != null) {

            dto.setOrderId(
                    item.getOrder().getId()
            );

            dto.setOrderCode(
                    item.getOrder().getOrderCode()
            );


            if (item.getOrder().getTable() != null) {

                dto.setTableId(
                        item.getOrder()
                                .getTable()
                                .getId()
                );

                dto.setTableName(
                        item.getOrder()
                                .getTable()
                                .getTableName()
                );
            }
        }


        if (item.getProduct() != null) {

            dto.setProductId(
                    item.getProduct().getId()
            );

            dto.setProductName(
                    item.getProduct().getName()
            );
        }


        return dto;
    }
}

