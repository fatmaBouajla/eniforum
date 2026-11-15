package com.enicarthage.forum.controller;

import com.enicarthage.forum.model.Workshop;
import com.enicarthage.forum.service.WorkshopService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workshops")
@RequiredArgsConstructor
public class WorkshopController {

    private final WorkshopService workshopService;

    // Tous les workshops — accessible à tous les rôles authentifiés
    // Le service filtre selon le rôle
    @GetMapping
    public List<Workshop> getAll(Authentication auth) {
        if (auth == null) return List.of();
        boolean isChef = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_CHEF_COMITE"));
        if (isChef) {
            return workshopService.findByChef(auth.getName());
        }
        return workshopService.findAll();
    }

    // Endpoint dédié chef (appelé par chef-workshops.component.ts)
    @GetMapping("/mes-workshops")
    @PreAuthorize("hasRole('CHEF_COMITE')")
    public List<Workshop> getMesWorkshops(Authentication auth) {
        return workshopService.findByChef(auth.getName());
    }

    @GetMapping("/{id}")
    public Workshop getById(@PathVariable Long id) {
        return workshopService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','COORDINATRICE','CHEF_COMITE','COMITE_PILOTAGE')")
    public Workshop proposer(@RequestBody Workshop workshop, Authentication auth) {
        return workshopService.proposer(workshop, auth.getName());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINATRICE','CHEF_COMITE')")
    public Workshop modifier(@PathVariable Long id, @RequestBody Workshop workshop, Authentication auth) {
        return workshopService.modifier(id, workshop, auth.getName());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINATRICE','CHEF_COMITE')")
    public ResponseEntity<Void> supprimer(@PathVariable Long id, Authentication auth) {
        workshopService.supprimer(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/valider")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINATRICE')")
    public Workshop valider(@PathVariable Long id) {
        return workshopService.valider(id);
    }

    @PutMapping("/{id}/refuser")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINATRICE')")
    public Workshop refuser(
            @PathVariable Long id,
            @RequestParam(required = false) String commentaire) {
        return workshopService.refuser(id, commentaire);
    }
}