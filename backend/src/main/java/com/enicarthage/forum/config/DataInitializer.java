package com.enicarthage.forum.config;

import com.enicarthage.forum.model.*;
import com.enicarthage.forum.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Au démarrage : garantit un administrateur, une édition du Forum et les 6 comités.
 * Ne modifie rien si ces éléments existent déjà.
 */
@Component
@Order(1)
@Log4j2
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    // Les 6 comités du cahier des charges
    static final List<String[]> COMITES = List.of(
            new String[]{"Sponsoring", "Recherche de sponsors et relation avec les entreprises partenaires"},
            new String[]{"Design", "Identité visuelle : affiches, badges, supports imprimés et réseaux sociaux"},
            new String[]{"Logistique", "Salles, stands, matériel, accueil et déroulement le jour J"},
            new String[]{"Projet", "Planning global, suivi des tâches et coordination des échéances"},
            new String[]{"Programme", "Conférences, workshops, tables rondes et intervenants"},
            new String[]{"Média", "Réseaux sociaux, photo, vidéo et communication"});

    private final UtilisateurRepository utilisateurRepository;
    private final ForumProjectRepository forumProjectRepository;
    private final ComiteRepository comiteRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;
    @Value("${app.admin.password}")
    private String adminPassword;
    @Value("${app.admin.nom}")
    private String adminNom;

    @Override
    @Transactional
    public void run(String... args) {
        creerAdmin();
        ForumProject forum = creerEditionCourante();
        creerComites(forum);
    }

    private void creerAdmin() {
        boolean adminExiste = utilisateurRepository.findAll().stream()
                .anyMatch(u -> u.getRole() == RoleEnum.ADMIN);
        if (adminExiste) return;
        // Si le compte existe déjà (ex. créé comme membre), on le promeut
        Utilisateur admin = utilisateurRepository.findByEmail(adminEmail)
                .orElseGet(() -> Utilisateur.builder().email(adminEmail).nom(adminNom).build());
        admin.setRole(RoleEnum.ADMIN);
        admin.setActif(true);
        admin.setMotDePasse(passwordEncoder.encode(adminPassword));
        utilisateurRepository.save(admin);
        log.info("Administrateur initial prêt : {}", adminEmail);
    }

    private ForumProject creerEditionCourante() {
        List<ForumProject> existants = forumProjectRepository.findAll();
        if (!existants.isEmpty()) {
            return existants.stream()
                    .filter(f -> f.getStatut() != StatutProjet.CLOTURE)
                    .findFirst().orElse(existants.get(0));
        }
        int annee = LocalDate.now().getYear() + (LocalDate.now().getMonthValue() >= 9 ? 1 : 0);
        ForumProject forum = forumProjectRepository.save(ForumProject.builder()
                .nom("Forum d'Entreprise ENICarthage " + annee)
                .edition(String.valueOf(annee))
                .dateDebut(LocalDate.now())
                .dateEvenement(LocalDate.now().plusMonths(3))
                .lieu("ENICarthage, Charguia II, Tunis")
                .description("Rencontres entreprises, workshops, conférences et offres de stages.")
                .statut(StatutProjet.EN_COURS)
                .build());
        log.info("Édition créée : {}", forum.getNom());
        return forum;
    }

    private void creerComites(ForumProject forum) {
        if (comiteRepository.count() > 0) return;
        for (String[] c : COMITES) {
            comiteRepository.save(Comite.builder()
                    .nom(c[0]).description(c[1]).forumProject(forum).build());
        }
        log.info("{} comités créés", COMITES.size());
    }
}
