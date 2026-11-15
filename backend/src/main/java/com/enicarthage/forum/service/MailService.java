package com.enicarthage.forum.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Log4j2
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String from;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    /** Vrai si un compte d'envoi est configuré (MAIL_USERNAME). */
    public boolean estConfigure() {
        return from != null && !from.isBlank();
    }

    /** Envoie les identifiants. Retourne faux si l'email n'est pas parti. */
    public boolean envoyerCredentiels(String email, String nom, String comite, String motDePasse) {
        if (!estConfigure()) {
            log.warn("Email non configuré : identifiants de {} non envoyés", email);
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(email);
            message.setSubject("Candidature acceptée — Forum ENICarthage");
            message.setText(
                "Bonjour " + nom + ",\n\n" +
                "Félicitations ! Votre candidature pour le comité " + comite + " a été acceptée.\n\n" +
                "Voici vos identifiants de connexion :\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "  Email       : " + email + "\n" +
                "  Mot de passe : " + motDePasse + "\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Connectez-vous sur : " + frontendUrl + "/auth/login\n\n" +
                "Pensez à changer votre mot de passe dans « Mon profil » après la première connexion.\n\n" +
                "Bienvenue dans l'équipe du Forum ENICarthage !\n\n" +
                "Cordialement,\nL'équipe Forum ENICarthage"
            );
            mailSender.send(message);
            log.info("Email credentials envoyé à {}", email);
            return true;
        } catch (Exception e) {
            log.error("Erreur envoi email à {} : {}", email, e.getMessage());
            return false;
        }
    }

    /** Informe le candidat d'un refus (sans effet si l'email n'est pas configuré). */
    public void envoyerRefus(String email, String nom, String motif) {
        if (!estConfigure() || email == null) return;
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(email);
            message.setSubject("Votre candidature — Forum ENICarthage");
            message.setText(
                "Bonjour " + nom + ",\n\n" +
                "Merci pour votre candidature au Forum ENICarthage. " +
                "Après étude, nous ne pouvons pas y donner une suite favorable cette fois-ci.\n\n" +
                (motif != null && !motif.isBlank() ? "Commentaire du comité : " + motif + "\n\n" : "") +
                "Nous vous encourageons à candidater de nouveau lors d'une prochaine édition.\n\n" +
                "Cordialement,\nL'équipe Forum ENICarthage");
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Erreur envoi email de refus à {} : {}", email, e.getMessage());
        }
    }
}