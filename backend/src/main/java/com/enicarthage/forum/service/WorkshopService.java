package com.enicarthage.forum.service;

import com.enicarthage.forum.exception.ResourceNotFoundException;
import com.enicarthage.forum.model.*;
import com.enicarthage.forum.repository.ComiteRepository;
import com.enicarthage.forum.repository.UtilisateurRepository;
import com.enicarthage.forum.repository.WorkshopRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@Log4j2
@RequiredArgsConstructor
public class WorkshopService {

    private final WorkshopRepository workshopRepository;
    private final ForumEditionGuard forumEditionGuard;
    private final UtilisateurRepository utilisateurRepository;
    private final ComiteRepository comiteRepository;

    // Tous les workshops (coordinatrice/admin)
    public List<Workshop> findAll() {
        return workshopRepository.findAll();
    }

    // Workshops du comité dont l'email est chef
    public List<Workshop> findByChef(String email) {
        return workshopRepository.findByComiteChefEmail(email);
    }

    // Proposer — enregistre aussi proposePar
    public Workshop proposer(Workshop workshop, String email) {
        if (workshop.getComite() == null || workshop.getComite().getId() == null) {
            throw new IllegalArgumentException("Comite organisateur obligatoire");
        }
        forumEditionGuard.assertForumOuvert(workshop.getComite().getId());
        Utilisateur auteur = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        // Un chef ne propose que pour son propre comité
        if (auteur.getRole() == RoleEnum.CHEF_COMITE) {
            Comite c = comiteRepository.findById(workshop.getComite().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Comite non trouve"));
            if (c.getChef() == null || !c.getChef().getId().equals(auteur.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vous ne pouvez proposer que pour votre comité");
            }
        }
        workshop.setStatut(StatutWorkshop.PROPOSE);
        workshop.setProposePar(auteur);

        return workshopRepository.save(workshop);
    }

    public Workshop valider(Long id) {
        forumEditionGuard.assertWorkshopOuvert(id);
        Workshop w = workshopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop non trouve"));
        w.setStatut(StatutWorkshop.VALIDE);
        log.info("Workshop valide : {}", w.getTitre());
        return workshopRepository.save(w);
    }

    public Workshop refuser(Long id, String motif) {
        forumEditionGuard.assertWorkshopOuvert(id);
        Workshop w = workshopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop non trouve"));
        w.setStatut(StatutWorkshop.REFUSE);
        if (motif != null && !motif.isBlank()) {
            w.setMotifRefus(motif.trim());
        }
        log.info("Workshop refuse : {}", w.getTitre());
        return workshopRepository.save(w);
    }

    // Modifier : admin/coordinatrice, ou le chef du comité tant que le workshop est proposé
    public Workshop modifier(Long id, Workshop data, String email) {
        Workshop w = findById(id);
        verifierDroitEdition(w, email);
        forumEditionGuard.assertWorkshopOuvert(id);
        if (data.getTitre() != null) w.setTitre(data.getTitre());
        if (data.getDescription() != null) w.setDescription(data.getDescription());
        if (data.getIntervenant() != null) w.setIntervenant(data.getIntervenant());
        if (data.getDateHeure() != null) w.setDateHeure(data.getDateHeure());
        return workshopRepository.save(w);
    }

    public void supprimer(Long id, String email) {
        Workshop w = findById(id);
        verifierDroitEdition(w, email);
        workshopRepository.delete(w);
    }

    private void verifierDroitEdition(Workshop w, String email) {
        Utilisateur u = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        if (u.getRole() == RoleEnum.ADMIN || u.getRole() == RoleEnum.COORDINATRICE) return;
        boolean estChef = w.getComite() != null && w.getComite().getChef() != null
                && w.getComite().getChef().getId().equals(u.getId());
        if (!estChef) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Réservé au chef de ce comité");
        }
        if (w.getStatut() != StatutWorkshop.PROPOSE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un workshop déjà traité ne peut plus être modifié");
        }
    }

    public Workshop findById(Long id) {
        return workshopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop non trouve"));
    }
}