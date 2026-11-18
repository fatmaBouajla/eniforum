package com.enicarthage.forum.service;

import com.enicarthage.forum.exception.ResourceNotFoundException;
import com.enicarthage.forum.model.*;
import com.enicarthage.forum.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service @Transactional @Log4j2 @RequiredArgsConstructor
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    public List<Utilisateur> findAll() { return utilisateurRepository.findAll(); }

    public Utilisateur findById(Long id) {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouve : " + id));
    }

    public Utilisateur creer(Utilisateur u) {
        if (u.getNom() == null || u.getNom().isBlank() || u.getEmail() == null || u.getRole() == null) {
            throw new IllegalArgumentException("Nom, email et rôle sont obligatoires");
        }
        if (utilisateurRepository.existsByEmail(u.getEmail())) {
            throw new IllegalArgumentException("Cet email est déjà utilisé");
        }
        if (u.getMotDePasse() == null || u.getMotDePasse().length() < 8) {
            throw new IllegalArgumentException("Mot de passe : 8 caractères minimum");
        }
        u.setMotDePasse(passwordEncoder.encode(u.getMotDePasse()));
        return utilisateurRepository.save(u);
    }

    public Utilisateur modifier(Long id, Utilisateur data) {
        Utilisateur u = findById(id);
        if (data.getNom() != null && !data.getNom().isBlank()) u.setNom(data.getNom().trim());
        if (data.getEmail() != null && !data.getEmail().equalsIgnoreCase(u.getEmail())) {
            if (utilisateurRepository.existsByEmail(data.getEmail())) {
                throw new IllegalArgumentException("Cet email est déjà utilisé");
            }
            u.setEmail(data.getEmail());
        }
        if (data.getMotDePasse() != null && !data.getMotDePasse().isBlank()) {
            if (data.getMotDePasse().length() < 8) {
                throw new IllegalArgumentException("Mot de passe : 8 caractères minimum");
            }
            u.setMotDePasse(passwordEncoder.encode(data.getMotDePasse()));
        }
        return utilisateurRepository.save(u);
    }

    public void supprimer(Long id, String actorEmail) {
        Utilisateur u = findById(id);
        verifierPasSoiMeme(u, actorEmail, "supprimer votre propre compte");
        utilisateurRepository.delete(u);
        utilisateurRepository.flush();
    }

    public Utilisateur activerCompte(Long id, boolean actif, String actorEmail) {
        Utilisateur u = findById(id);
        if (!actif) verifierPasSoiMeme(u, actorEmail, "désactiver votre propre compte");
        u.setActif(actif);
        log.info("Compte {} : actif={}", u.getEmail(), actif);
        return utilisateurRepository.save(u);
    }

    public Utilisateur assignerRole(Long id, RoleEnum role, String actorEmail) {
        Utilisateur u = findById(id);
        if (role != RoleEnum.ADMIN) verifierPasSoiMeme(u, actorEmail, "retirer votre propre rôle d'administrateur");
        u.setRole(role);
        log.info("Role {} assigne a {}", role, u.getEmail());
        return utilisateurRepository.save(u);
    }

    private void verifierPasSoiMeme(Utilisateur cible, String actorEmail, String action) {
        if (cible.getEmail().equals(actorEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous ne pouvez pas " + action);
        }
    }

    /** L'utilisateur connecté change son propre mot de passe. */
    public void changerMotDePasse(String email, String ancien, String nouveau) {
        Utilisateur u = findByEmail(email);
        if (ancien == null || !passwordEncoder.matches(ancien, u.getMotDePasse())) {
            throw new IllegalArgumentException("Mot de passe actuel incorrect");
        }
        if (nouveau == null || nouveau.length() < 8) {
            throw new IllegalArgumentException("Nouveau mot de passe : 8 caractères minimum");
        }
        u.setMotDePasse(passwordEncoder.encode(nouveau));
        utilisateurRepository.save(u);
    }

    public Utilisateur findByEmail(String email) {
        return utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouve : " + email));
    }
}
