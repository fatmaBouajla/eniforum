package com.enicarthage.forum.service;

import com.enicarthage.forum.client.CvAiClient;
import com.enicarthage.forum.dto.CvAnalysisResponse;
import com.enicarthage.forum.exception.ResourceNotFoundException;
import com.enicarthage.forum.model.*;
import com.enicarthage.forum.repository.CandidatureCVRepository;
import com.enicarthage.forum.repository.ComiteRepository;
import com.enicarthage.forum.repository.UtilisateurRepository;
import com.enicarthage.forum.util.Textes;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Log4j2
@RequiredArgsConstructor
public class CandidatureCVService {

    private static final String ETAT_EN_COURS = "EN_COURS";
    // Une analyse détaillée à la fois : le modèle de langage tourne sur le processeur
    private final java.util.concurrent.ExecutorService fileAnalyses = java.util.concurrent.Executors.newSingleThreadExecutor();
    private final java.util.Set<Long> analysesEnCours = java.util.concurrent.ConcurrentHashMap.newKeySet();
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    public static final String UPLOAD_DIR = "uploads/cv/";

    private final CandidatureCVRepository candidatureCVRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ComiteRepository comiteRepository;
    private final ForumProjectService forumProjectService;
    private final CvAiClient cvAiClient;
    private final MailService mailService;
    private final PasswordEncoder passwordEncoder;

    public void analyserAvecIA(CandidatureCV candidature) {
        Path path = Paths.get(candidature.getFichierCV());
        if (!Files.exists(path)) {
            log.error("Fichier CV introuvable pour analyse : {}", candidature.getFichierCV());
            appliquerScoreFallback(candidature, "Fichier CV introuvable sur le disque.");
            candidatureCVRepository.save(candidature);
            return;
        }
        Optional<CvAnalysisResponse> res = cvAiClient.analyze(
                path, candidature.getPosteVise(), candidature.getDossierComplet());
        if (res.isPresent()) {
            CvAnalysisResponse r = res.get();
            double score = Math.max(0, Math.min(100, r.getScore()));
            candidature.setScoreIA(Math.round(score * 100.0) / 100.0);
            candidature.setJustificationIA(r.getJustification());
            if (r.getCompetences() != null && !r.getCompetences().isEmpty()) {
                candidature.setCompetencesExtraites(
                        r.getCompetences().stream().distinct().collect(Collectors.joining(", ")));
            }
            log.info("Score IA pour {} : {}", candidature.getPosteVise(), score);
        } else {
            appliquerScoreFallback(candidature,
                    "Service d'analyse IA indisponible : relancez l'analyse plus tard.");
        }
        candidature.setDateAnalyseIA(LocalDateTime.now());
        candidatureCVRepository.save(candidature);
    }

    // IA indisponible : pas de score inventé, la candidature reste « non analysée »
    private void appliquerScoreFallback(CandidatureCV candidature, String message) {
        candidature.setScoreIA(null);
        candidature.setJustificationIA(message);
        candidature.setCompetencesExtraites(null);
        log.warn("Analyse IA impossible pour la candidature {} : {}", candidature.getId(), message);
    }

    /** Lance l'analyse détaillée en arrière-plan ; l'écran suit son état. */
    public CandidatureCV demanderAnalyseDetaillee(Long id, String actorEmail) {
        CandidatureCV c = candidatureCVRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature non trouvee"));
        verifierAccesChef(c, actorEmail);
        if (ETAT_EN_COURS.equals(c.getEtatAnalyseDetaillee()) && analysesEnCours.contains(id)) {
            return c;
        }
        c.setEtatAnalyseDetaillee(ETAT_EN_COURS);
        CandidatureCV saved = candidatureCVRepository.save(c);
        analysesEnCours.add(id);
        Runnable tache = () -> fileAnalyses.submit(() -> genererAnalyseDetaillee(id));
        // Lancement après l'enregistrement de l'état EN_COURS
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { tache.run(); }
            });
        } else {
            tache.run();
        }
        return saved;
    }

    private void genererAnalyseDetaillee(Long id) {
        try {
            CandidatureCV c = candidatureCVRepository.findById(id).orElseThrow();
            Path path = Paths.get(c.getFichierCV());
            try {
                if (!Files.exists(path)) throw new IllegalStateException("Fichier CV introuvable");
                c.setAnalyseDetaillee(cvAiClient.evaluer(path, c.getPosteVise(), c.getDossierComplet()));
                c.setEtatAnalyseDetaillee("PRETE");
            } catch (IllegalStateException e) {
                c.setAnalyseDetaillee(objectMapper.writeValueAsString(java.util.Map.of("erreur", e.getMessage())));
                c.setEtatAnalyseDetaillee("ERREUR");
            }
            candidatureCVRepository.save(c);
        } catch (Exception e) {
            log.error("Analyse détaillée de la candidature {} interrompue", id, e);
        } finally {
            analysesEnCours.remove(id);
        }
    }

    @jakarta.annotation.PreDestroy
    void arreter() { fileAnalyses.shutdownNow(); }

    public CandidatureCV reAnalyser(Long id) {
        CandidatureCV c = candidatureCVRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature non trouvee"));
        analyserAvecIA(c);
        return candidatureCVRepository.findById(id).orElseThrow();
    }

    public Resource fichierCvCommeResource(Long id) {
        CandidatureCV c = candidatureCVRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature non trouvee"));
        try {
            Path base = Paths.get(UPLOAD_DIR).toAbsolutePath().normalize();
            Path file = Paths.get(c.getFichierCV()).toAbsolutePath().normalize();
            if (!file.startsWith(base)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chemin fichier invalide");
            }
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier introuvable");
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur lecture fichier");
        }
    }

    public String nomFichierOriginal(Long id) {
        CandidatureCV c = candidatureCVRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature non trouvee"));
        String p = c.getFichierCV();
        int i = p.lastIndexOf('_');
        return i >= 0 ? p.substring(i + 1) : p;
    }

    public CandidatureCV accepter(Long id, String actorEmail) {
        CandidatureCV c = candidatureCVRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature non trouvee"));
        verifierAccesChef(c, actorEmail);
        if (c.getStatut() != StatutCandidature.EN_ATTENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette candidature a déjà été traitée");
        }
        boolean chef = c.getPosteVise() != null && c.getPosteVise().toUpperCase().contains("CHEF");
        if (chef) verifierComiteSansChef(extractComite(c.getDossierComplet()), c.getCandidatEmail());
        c.setStatut(StatutCandidature.ACCEPTE);
        CandidatureCV saved = candidatureCVRepository.save(c);

        if (c.getCandidatEmail() != null) {
            boolean compteExistant = utilisateurRepository.existsByEmail(c.getCandidatEmail());
            String motDePasse = genererMotDePasse();
            String comiteNom = extractComite(c.getDossierComplet());
            String poste = c.getPosteVise() != null ? c.getPosteVise().toUpperCase() : "";

            // Détecter si chef de comité
            boolean isChef = poste.contains("CHEF");

            RoleEnum role = isChef ? RoleEnum.CHEF_COMITE : RoleEnum.MEMBRE;
            Utilisateur utilisateur = creerCompte(c, motDePasse, role);

            if (isChef && !comiteNom.isEmpty()) {
                assignerChefComite(utilisateur, comiteNom);
            } else if (!isChef && !comiteNom.isEmpty()) {
                ajouterAuComite(utilisateur, comiteNom);
            }

            if (!compteExistant) {
                boolean envoye = mailService.envoyerCredentiels(
                        c.getCandidatEmail(),
                        c.getCandidatNom() != null ? c.getCandidatNom() : "Candidat",
                        comiteNom,
                        motDePasse);
                // Email impossible : on renvoie le mot de passe une seule fois à l'écran
                if (!envoye) saved.setMotDePasseProvisoire(motDePasse);
            }
        }
        return saved;
    }

    private void verifierComiteSansChef(String comiteNom, String email) {
        comiteRepository.findAll().stream()
            .filter(c -> Textes.memeComite(c.getNom(), comiteNom))
            .findFirst()
            .filter(c -> c.getChef() != null && !c.getChef().getEmail().equalsIgnoreCase(email))
            .ifPresent(c -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Le comité " + c.getNom() + " a déjà un chef (" + c.getChef().getNom() + ")");
            });
    }

    private Utilisateur creerCompte(CandidatureCV c, String motDePasse, RoleEnum role) {
        Optional<Utilisateur> existing = utilisateurRepository.findByEmail(c.getCandidatEmail());
        if (existing.isPresent()) {
            Utilisateur u = existing.get();
            // Un membre accepté comme chef change de rôle
            if (role == RoleEnum.CHEF_COMITE && u.getRole() == RoleEnum.MEMBRE) {
                u.setRole(RoleEnum.CHEF_COMITE);
                return utilisateurRepository.save(u);
            }
            return u;
        }
        Utilisateur u = Utilisateur.builder()
                .nom(c.getCandidatNom())
                .email(c.getCandidatEmail())
                .motDePasse(passwordEncoder.encode(motDePasse))
                .role(role)
                .actif(true)
                .build();
        Utilisateur saved = utilisateurRepository.save(u);
        log.info("Compte {} créé pour {}", role, c.getCandidatEmail());
        return saved;
    }

    private void assignerChefComite(Utilisateur chef, String comiteNom) {
        comiteRepository.findAll().stream()
            .filter(c -> Textes.memeComite(c.getNom(), comiteNom))
            .findFirst()
            .ifPresent(comite -> {
                comite.setChef(chef);
                comiteRepository.save(comite);
                log.info("Chef {} assigné au comité {}", chef.getEmail(), comiteNom);
            });
    }

    private void ajouterAuComite(Utilisateur membre, String comiteNom) {
        comiteRepository.findAll().stream()
            .filter(c -> Textes.memeComite(c.getNom(), comiteNom))
            .findFirst()
            .ifPresent(comite -> {
                if (!comite.getMembres().contains(membre)) {
                    comite.getMembres().add(membre);
                    comiteRepository.save(comite);
                    log.info("Membre {} ajouté au comité {}", membre.getEmail(), comiteNom);
                }
            });
    }

    private String genererMotDePasse() {
        String chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
        StringBuilder sb = new StringBuilder();
        java.security.SecureRandom rnd = new java.security.SecureRandom();
        for (int i = 0; i < 10; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
        return sb.toString();
    }

    String extractComite(String dossierComplet) {
        if (dossierComplet == null) return "";
        for (String part : dossierComplet.split("\\|")) {
            if (part.trim().startsWith("Comité:")) {
                return part.trim().replace("Comité:", "").trim();
            }
        }
        return "";
    }

    public CandidatureCV deposerPublic(
            MultipartFile fichier,
            String prenom, String nom, String email,
            String telephone, String niveauEtudes,
            String posteVise, String comite,
            String motivation, String experience, String competences) {
        if (estVide(prenom) || estVide(nom) || estVide(motivation)) {
            throw new IllegalArgumentException("Prénom, nom et motivation sont obligatoires");
        }
        if (email == null || !email.trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("Adresse email invalide");
        }
        if (!"MEMBRE".equals(posteVise) && !"CHEF_COMITE".equals(posteVise)) {
            throw new IllegalArgumentException("Poste visé invalide");
        }
        email = email.trim();
        if (candidatureCVRepository.existsByCandidatEmailAndStatut(email, StatutCandidature.EN_ATTENTE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une candidature est déjà en attente pour cet email");
        }
        String path = saveFile(fichier);
        String dossier = String.format(
                "Prénom:%s | Nom:%s | Tel:%s | Niveau:%s | Comité:%s | Motivation:%s | Expérience:%s | Compétences:%s",
                champ(prenom), champ(nom), champ(telephone), champ(niveauEtudes), champ(comite),
                champ(motivation), champ(experience), champ(competences));
        CandidatureCV candidature = CandidatureCV.builder()
                .fichierCV(path)
                .posteVise(posteVise)
                .statut(StatutCandidature.EN_ATTENTE)
                .dateDepot(LocalDateTime.now())
                .candidatNom(prenom.trim() + " " + nom.trim())
                .candidatEmail(email)
                .dossierComplet(dossier)
                .candidat(null)
                .forumProject(forumProjectService.findEditionCourante().orElse(null))
                .build();
        CandidatureCV saved = candidatureCVRepository.save(candidature);
        analyserAvecIA(saved);
        return saved;
    }

    private static boolean estVide(String v) { return v == null || v.isBlank(); }

    // Le dossier est découpé sur « | » : on retire ce caractère des saisies
    private static String champ(String v) { return estVide(v) ? "-" : v.replace('|', '/').trim(); }

    public CandidatureCV refuser(Long id, String commentaire, String actorEmail) {
        CandidatureCV c = candidatureCVRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature non trouvee"));
        verifierAccesChef(c, actorEmail);
        if (c.getStatut() != StatutCandidature.EN_ATTENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette candidature a déjà été traitée");
        }
        c.setStatut(StatutCandidature.REFUSE);
        c.setCommentaire(commentaire);
        CandidatureCV saved = candidatureCVRepository.save(c);
        mailService.envoyerRefus(c.getCandidatEmail(), c.getCandidatNom(), commentaire);
        return saved;
    }

    /** Candidatures visibles : toutes, sauf pour un chef (membres de son comité). */
    public List<CandidatureCV> findAllPour(String email) {
        Utilisateur u = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        List<CandidatureCV> toutes = candidatureCVRepository.findAll();
        if (u.getRole() != RoleEnum.CHEF_COMITE) return toutes;
        return toutes.stream().filter(c -> estPourComiteDuChef(c, u)).toList();
    }

    public CandidatureCV findByIdPour(Long id, String email) {
        CandidatureCV c = findById(id);
        verifierAccesChef(c, email);
        return c;
    }

    // Un chef ne gère que les candidatures « membre » de son propre comité
    private void verifierAccesChef(CandidatureCV c, String email) {
        if (email == null) return;
        Utilisateur u = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        if (u.getRole() == RoleEnum.CHEF_COMITE && !estPourComiteDuChef(c, u)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Candidature hors de votre comité");
        }
    }

    private boolean estPourComiteDuChef(CandidatureCV c, Utilisateur chef) {
        boolean membre = c.getPosteVise() == null || !c.getPosteVise().toUpperCase().contains("CHEF");
        return membre && comiteRepository.findByChefId(chef.getId())
                .map(comite -> Textes.memeComite(comite.getNom(), extractComite(c.getDossierComplet())))
                .orElse(false);
    }

    public List<CandidatureCV> findAll() {
        return candidatureCVRepository.findAll();
    }

    public CandidatureCV findById(Long id) {
        return candidatureCVRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature non trouvee"));
    }

    private String saveFile(MultipartFile fichier) {
        verifierPdf(fichier);
        // Nom nettoyé : impossible d'écrire hors du dossier des CV
        String original = fichier.getOriginalFilename() != null ? fichier.getOriginalFilename() : "cv.pdf";
        String nom = Paths.get(original).getFileName().toString().replaceAll("[^A-Za-z0-9._-]", "_");
        if (!nom.toLowerCase().endsWith(".pdf")) nom = nom + ".pdf";
        String path = UPLOAD_DIR + System.currentTimeMillis() + "_" + nom;
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
            Files.copy(fichier.getInputStream(), Paths.get(path), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Erreur sauvegarde fichier : {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Echec enregistrement CV");
        }
        return path;
    }

    // Le CV doit être un vrai PDF (signature « %PDF »)
    private void verifierPdf(MultipartFile fichier) {
        if (fichier == null || fichier.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le CV est obligatoire");
        }
        try (var in = fichier.getInputStream()) {
            byte[] tete = in.readNBytes(4);
            if (!new String(tete, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le CV doit être un fichier PDF");
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CV illisible");
        }
    }
}