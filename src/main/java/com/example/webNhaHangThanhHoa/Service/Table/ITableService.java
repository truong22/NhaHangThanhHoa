package com.example.webNhaHangThanhHoa.Service.Table;

import com.example.webNhaHangThanhHoa.Request.TableRequest;
import com.example.webNhaHangThanhHoa.Entity.tables_Restaurant;

import java.util.List;

public interface ITableService {
    List<tables_Restaurant> getAllTables();
    tables_Restaurant createTable(TableRequest request);
    tables_Restaurant updateTable(Long id, TableRequest request);
    void deleteTable(Long id);
}