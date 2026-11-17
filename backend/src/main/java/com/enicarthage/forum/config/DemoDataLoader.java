package com.enicarthage.forum.config;

import com.enicarthage.forum.model.*;
import com.enicarthage.forum.repository.*;
import com.enicarthage.forum.service.CandidatureCVService;
import com.enicarthage.forum.service.TacheService;
import com.enicarthage.forum.util.Textes;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Données de démonstration (DEMO_DATA=true) : un compte par rôle, quelques tâches,
 * workshops et candidatures. Chargées une seule fois.
 */
@Component
@Order(2)
@Log4j2
@RequiredArgsConstructor
public class DemoDataLoader implements CommandLineRunner {

    public static final String MOT_DE_PASSE_DEMO = "Demo@2026";

    private final UtilisateurRepository utilisateurRepository;
    private final ComiteRepository comiteRepository;
    private final TacheRepository tacheRepository;
    private final WorkshopRepository workshopRepository;
    private final NotificationRepository notificationRepository;
    private final CandidatureCVRepository candidatureCVRepository;
    private final ForumProjectRepository forumProjectRepository;
    private final CandidatureCVService candidatureCVService;
    private final TacheService tacheService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.demo-data:false}")
    private boolean actif;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void run(String... args) throws Exception {
        if (!actif || utilisateurRepository.existsByEmail("pilotage@eniforum.tn")) return;

        // Comptes (mot de passe commun : Demo@2026)
        compte("Sarra Ben Ali", "pilotage@eniforum.tn", RoleEnum.COMITE_PILOTAGE);
        compte("Ines Trabelsi", "coordinatrice@eniforum.tn", RoleEnum.COORDINATRICE);
        Utilisateur chefDesign = compte("Yasmine Gharbi", "chef.design@eniforum.tn", RoleEnum.CHEF_COMITE);
        Utilisateur chefSponso = compte("Mehdi Jlassi", "chef.sponsoring@eniforum.tn", RoleEnum.CHEF_COMITE);
        Utilisateur membre = compte("Amine Mansouri", "membre@eniforum.tn", RoleEnum.MEMBRE);
        Utilisateur membre2 = compte("Nour Hammami", "membre2@eniforum.tn", RoleEnum.MEMBRE);

        Comite design = comite("Design");
        Comite sponso = comite("Sponsoring");
        Comite programme = comite("Programme");
        design.setChef(chefDesign);
        design.getMembres().add(membre);
        sponso.setChef(chefSponso);
        sponso.getMembres().add(membre2);
        comiteRepository.saveAll(List.of(design, sponso));

        // Tâches : différents statuts, dont une en retard
        LocalDate j = LocalDate.now();
        tache("Concevoir l'affiche officielle", design, membre, j.minusDays(5), j.plusDays(7), StatutTache.EN_COURS, PrioriteTache.URGENTE);
        tache("Créer les badges des participants", design, membre, j, j.plusDays(14), StatutTache.A_FAIRE, PrioriteTache.NORMALE);
        tache("Valider la charte graphique", design, null, j.minusDays(20), j.minusDays(10), StatutTache.TERMINEE, PrioriteTache.NORMALE);
        tache("Préparer le dossier de sponsoring", sponso, membre2, j.minusDays(25), j.minusDays(12), StatutTache.TERMINEE, PrioriteTache.URGENTE);
        tache("Contacter 20 entreprises partenaires", sponso, membre2, j.minusDays(15), j.minusDays(3), StatutTache.EN_COURS, PrioriteTache.URGENTE);
        tache("Relancer les sponsors de l'édition précédente", sponso, null, j, j.plusDays(5), StatutTache.A_FAIRE, PrioriteTache.NORMALE);

        // Workshops
        workshop("Atelier CV et LinkedIn", "Optimiser son CV et son profil LinkedIn.", "Cabinet RH partenaire",
                programme, chefDesign, StatutWorkshop.VALIDE, 30);
        workshop("Initiation à Figma", "Prise en main de Figma pour concevoir des maquettes.", "Yasmine Gharbi",
                design, chefDesign, StatutWorkshop.PROPOSE, 35);
        workshop("Conférence : IA générative en entreprise", "Retours d'expérience d'ingénieurs.", "Entreprise partenaire",
                sponso, chefSponso, StatutWorkshop.PROPOSE, 40);

        // Candidatures avec de vrais PDF (CV fictifs)
        List<Long> aAnalyser = candidaturesSiPossible();
        tacheService.detecterRetards();
        log.info("Données de démonstration chargées (mot de passe : {})", MOT_DE_PASSE_DEMO);

        // Analyse IA en arrière-plan, dès que le service IA répond
        Thread t = new Thread(() -> analyserQuandIaPrete(aAnalyser), "demo-analyse-ia");
        t.setDaemon(true);
        t.start();
    }

    private List<Long> candidaturesSiPossible() throws Exception {
        try {
            return candidatures();
        } catch (IOException e) {
            log.warn("Candidatures de démonstration ignorées (dossier des CV non accessible) : {}", e.getMessage());
            return List.of();
        }
    }

    private Utilisateur compte(String nom, String email, RoleEnum role) {
        return utilisateurRepository.save(Utilisateur.builder()
                .nom(nom).email(email).role(role).actif(true)
                .motDePasse(passwordEncoder.encode(MOT_DE_PASSE_DEMO)).build());
    }

    private Comite comite(String nom) {
        return comiteRepository.findAll().stream()
                .filter(c -> Textes.memeComite(c.getNom(), nom))
                .findFirst().orElseThrow();
    }

    private void tache(String titre, Comite comite, Utilisateur membre, LocalDate debut, LocalDate fin,
                       StatutTache statut, PrioriteTache priorite) {
        Tache t = tacheRepository.save(Tache.builder().titre(titre)
                .description(titre + " pour le Forum.").comite(comite).membre(membre)
                .dateDebut(debut).dateFin(fin).statut(statut).priorite(priorite).build());
        if (membre != null) {
            notificationRepository.save(Notification.builder().destination(membre).tache(t)
                    .type(TypeNotification.TACHE_ASSIGNEE).message("Nouvelle tâche assignée : " + titre)
                    .dateEnvoi(LocalDateTime.now()).lu(false).build());
        }
    }

    private void workshop(String titre, String desc, String intervenant, Comite comite, Utilisateur par,
                          StatutWorkshop statut, int dansJours) {
        workshopRepository.save(Workshop.builder().titre(titre).description(desc).intervenant(intervenant)
                .comite(comite).proposePar(par).statut(statut)
                .dateHeure(LocalDateTime.now().plusDays(dansJours).withHour(10).withMinute(0).withSecond(0).withNano(0))
                .build());
    }

    private List<Long> candidatures() throws Exception {
        JsonNode liste;
        try (InputStream in = new ClassPathResource("demo/cv/candidats.json").getInputStream()) {
            liste = new ObjectMapper().readTree(in);
        }
        Files.createDirectories(Paths.get(CandidatureCVService.UPLOAD_DIR));
        ForumProject forum = forumProjectRepository.findAll().stream().findFirst().orElse(null);
        List<Long> ids = new ArrayList<>();
        int i = 0;
        for (JsonNode cv : liste) {
            String id = cv.get("id").asText();
            String comite = cv.get("comite_cible").asText();
            i++;
            // Comités sans chef de démo : candidature de chef ; sinon candidature de membre
            boolean chef = !List.of("Sponsoring", "Design", "Programme").contains(comite);
            Path cible = Paths.get(CandidatureCVService.UPLOAD_DIR, "demo_" + id + ".pdf");
            try (InputStream in = new ClassPathResource("demo/cv/" + id + ".pdf").getInputStream()) {
                Files.copy(in, cible, StandardCopyOption.REPLACE_EXISTING);
            }
            String[] nom = cv.get("nom").asText().split(" ", 2);
            String dossier = String.format(
                    "Prénom:%s | Nom:%s | Tel:%s | Niveau:%d | Comité:%s | Motivation:%s | Expérience:%s | Compétences:%s",
                    nom[0], nom[1], cv.get("telephone").asText(), cv.get("annee").asInt(), comite,
                    "Je souhaite rejoindre le comité " + comite + " du Forum pour mettre mes compétences au service "
                            + "de l'événement, apprendre au contact des entreprises et travailler en équipe.",
                    cv.get("experiences").get(0).asText(),
                    joindre(cv.get("competences")));
            CandidatureCV c = candidatureCVRepository.save(CandidatureCV.builder()
                    .fichierCV(cible.toString().replace('\\', '/'))
                    .posteVise(chef ? "CHEF_COMITE" : "MEMBRE")
                    .statut(StatutCandidature.EN_ATTENTE)
                    .dateDepot(LocalDateTime.now().minusDays(6 - i))
                    .candidatNom(cv.get("nom").asText())
                    .candidatEmail(cv.get("email").asText())
                    .dossierComplet(dossier)
                    .forumProject(forum)
                    .build());
            ids.add(c.getId());
        }
        return ids;
    }

    private String joindre(JsonNode tableau) {
        List<String> l = new ArrayList<>();
        tableau.forEach(n -> l.add(n.asText()));
        return String.join(", ", l);
    }

    // Réessaie toutes les 20 s pendant ~5 min, le temps que le modèle IA démarre
    private void analyserQuandIaPrete(List<Long> ids) {
        for (int essai = 0; essai < 15; essai++) {
            try {
                Thread.sleep(20_000);
                boolean toutAnalyse = true;
                for (Long id : ids) {
                    CandidatureCV c = candidatureCVService.findById(id);
                    if (c.getScoreIA() == null) {
                        CandidatureCV r = candidatureCVService.reAnalyser(id);
                        toutAnalyse &= r.getScoreIA() != null;
                    }
                }
                if (toutAnalyse) {
                    log.info("Candidatures de démonstration analysées par l'IA");
                    return;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                log.debug("IA pas encore prête : {}", e.getMessage());
            }
        }
    }
}
