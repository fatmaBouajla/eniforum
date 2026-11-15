package com.enicarthage.forum.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "utilisateurs")
@Data @NoArgsConstructor @AllArgsConstructor @Builder

public class Utilisateur {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nom;
    @Column(unique = true, nullable = false)
    private String email;
    // Accepté en entrée, jamais renvoyé au navigateur
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String motDePasse;
    @Builder.Default
    private boolean actif = true;
    @Enumerated(EnumType.STRING)
    private RoleEnum role;
}
