package com.example.webNhaHangThanhHoa.Security;

import com.example.webNhaHangThanhHoa.Entity.users;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class ShopUserDetails implements UserDetails {

    private Long id;

    private String email;

    private String password;

    private Collection<? extends GrantedAuthority> authorities;


    // =====================================================
    // ENTITY USER -> SHOP USER DETAILS
    // =====================================================

    public static ShopUserDetails buildUserDetails(users user) {

        List<GrantedAuthority> authorities =
                List.of(
                        new SimpleGrantedAuthority(
                              user.getRole().getName().toUpperCase()
                        )
                );

        return new ShopUserDetails(
                user.getId(),
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }


    // =====================================================
    // AUTHORITIES
    // =====================================================

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }


    // =====================================================
    // PASSWORD
    // =====================================================

    @Override
    public String getPassword() {
        return password;
    }


    // =====================================================
    // USERNAME
    // =====================================================

    @Override
    public String getUsername() {
        return email;
    }


    // =====================================================
    // ACCOUNT STATUS
    // =====================================================

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}