package com.example.webNhaHangThanhHoa.Service.Role;
import com.example.webNhaHangThanhHoa.DTO.RoleDto;
import com.example.webNhaHangThanhHoa.Entity.roles;
import com.example.webNhaHangThanhHoa.Request.RoleRequest;

import java.util.List;

public interface IRoleService {

    List<RoleDto> getAllRoles();

    RoleDto getRoleById(Long id);

    RoleDto getRoleByName(String name);

    roles addRole(RoleRequest request);

    roles updateRole(
            Long id,
            RoleRequest request
    );

    void deleteRole(Long id);

    RoleDto convertToDto(roles role);

    List<RoleDto> convertToDtoList(
            List<roles> roles
    );
}
