package com.example.webNhaHangThanhHoa.Service.Role;
import com.example.webNhaHangThanhHoa.DTO.RoleDto;
import com.example.webNhaHangThanhHoa.Entity.roles;
import com.example.webNhaHangThanhHoa.Exception.AlreadyExitsException;
import com.example.webNhaHangThanhHoa.Exception.ResourceNotFoundException;
import com.example.webNhaHangThanhHoa.Repository.RoleRepository;
import com.example.webNhaHangThanhHoa.Request.RoleRequest;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService
        implements IRoleService {

    private final RoleRepository roleRepository;

    private final ModelMapper modelMapper;


    // =====================================================
    // GET ALL
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<RoleDto> getAllRoles() {

        return convertToDtoList(
                roleRepository.findAll()
        );
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public RoleDto getRoleById(Long id) {

        roles role =
                roleRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy quyền với id: " + id
                                )
                        );

        return convertToDto(role);
    }


    // =====================================================
    // GET BY NAME
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public RoleDto getRoleByName(String name) {

        roles role =
                roleRepository.findByName(name)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy quyền: " + name
                                )
                        );

        return convertToDto(role);
    }


    // =====================================================
    // ADD
    // =====================================================

    @Override
    @Transactional
    public roles addRole(
            RoleRequest request) {

        // Kiểm tra trùng tên
        if (roleRepository.existsByName(
                request.getName())) {

            throw new AlreadyExitsException(
                    "Tên quyền đã tồn tại"
            );
        }

        roles role =
                new roles();

        role.setName(
                request.getName()
        );

        role.setDescription(
                request.getDescription()
        );

        return roleRepository.save(role);
    }


    // =====================================================
    // UPDATE
    // =====================================================

    @Override
    @Transactional
    public roles updateRole(
            Long id,
            RoleRequest request) {

        roles role =
                roleRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy quyền với id: " + id
                                )
                        );


        // Nếu đổi tên thì kiểm tra trùng
        if (!role.getName()
                .equals(request.getName())) {

            if (roleRepository.existsByName(
                    request.getName())) {

                throw new AlreadyExitsException(
                        "Tên quyền đã tồn tại"
                );
            }

            role.setName(
                    request.getName()
            );
        }


        role.setDescription(
                request.getDescription()
        );


        return roleRepository.save(role);
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Override
    @Transactional
    public void deleteRole(Long id) {

        roles role =
                roleRepository.findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy quyền với id: " + id
                                )
                        );

        /*
         * Không nên xóa role nếu đang có User
         * sử dụng role này.
         *
         * Nếu sau này cần kiểm tra User → Role,
         * có thể thêm UserRepository để kiểm tra ở đây.
         */

        roleRepository.delete(role);
    }


    // =====================================================
    // ENTITY → DTO
    // =====================================================

    @Override
    public RoleDto convertToDto(
            roles role) {

        return modelMapper.map(
                role,
                RoleDto.class
        );
    }


    // =====================================================
    // LIST ENTITY → LIST DTO
    // =====================================================

    @Override
    public List<RoleDto> convertToDtoList(
            List<roles> roles) {

        return roles.stream()
                .map(this::convertToDto)
                .toList();
    }
}
